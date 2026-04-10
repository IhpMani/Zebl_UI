import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { PayerApiService } from '../../core/services/payer-api.service';
import { PaymentEntryRow } from '../../core/services/payment.models';
import { PayerListItem } from '../../core/services/payer.models';
import { RibbonContextService } from '../../core/services/ribbon-context.service';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-payment-entry',
  templateUrl: './payment-entry.component.html',
  styleUrls: ['./payment-entry.component.css']
})
export class PaymentEntryComponent implements OnInit {
  paymentForm: FormGroup;
  paymentSource: 'Patient' | 'Payer' = 'Payer';
  /** Display-only: sum of paid amounts in grid (no financial math; backend is source of truth). */
  appliedAmount = 0;
  remaining = 0;
  saving = false;
  error: string | null = null;
  successMessage: string | null = null;
  currentPaymentId: number | null = null;
  showAdjReasonCodes = true;
  showAdjRemarkCodes = false;
  showAdjReasonAmount = false;
  showPaymentReasonCodes = false;
  showNotes = false;
  ignoreResponsibleParty = true;
  matchByPayerId = true;
  serviceLineRows: PaymentEntryRow[] = [];
  loadingServiceLines = false;
  /** True when opened from Find Payments with an id (edit mode). */
  isEditMode = false;
  /** Payer library list for dropdown (when source is Payer). */
  payerList: PayerListItem[] = [];
  loadingPayers = false;
  /** Patient name for context header (e.g. "Payments from MOAK, KELLY A with a balance"). */
  get patientDisplayName(): string {
    return this.serviceLineRows.length > 0 && this.serviceLineRows[0].name
      ? this.serviceLineRows[0].name
      : '';
  }

  /** Claim # for context bar (form or first loaded row). */
  get displayClaimLabel(): string {
    const raw = this.paymentForm.get('claimId')?.value;
    const fromForm = raw != null && raw !== '' ? Number(raw) : NaN;
    if (!isNaN(fromForm) && fromForm > 0) {
      return String(fromForm);
    }
    const fromRow = this.serviceLineRows[0]?.claimId;
    return fromRow != null && fromRow > 0 ? String(fromRow) : '—';
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private paymentApi: PaymentApiService,
    private payerApi: PayerApiService,
    private ribbonContext: RibbonContextService,
    private workspace: WorkspaceService,
    private cdr: ChangeDetectorRef
  ) {
    this.paymentForm = this.fb.group({
      payerId: [null],
      /** Search key for the grid: lines for this claim only (patient can have many claims). */
      claimId: [null as number | null],
      /** Filled from API when lines load; required for save payload. */
      patientId: [null as number | null],
      amount: [0, [Validators.required, Validators.min(-999999.99)]],
      pmtDate: [new Date().toISOString().slice(0, 10), Validators.required],
      method: ['Check'],
      reference1: [''],
      reference2: [''],
      note: ['']
    });
  }

  ngOnInit(): void {
    this.workspace.updateActiveTabTitle('Payment Entry');
    const ctxClaim = this.resolveClaimIdFromContext();
    if (ctxClaim != null && ctxClaim > 0) {
      this.paymentForm.patchValue({ claimId: ctxClaim }, { emitEvent: false });
    }
    this.recalculatePaymentTotals();
    this.loadPayers();
    this.paymentForm.get('amount')?.valueChanges.subscribe(() => this.recalculatePaymentTotals());
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam != null && idParam !== '') {
        const id = +idParam;
        if (!isNaN(id) && id > 0) {
          this.loadPaymentForEdit(id);
          return;
        }
      }
      this.isEditMode = false;
      this.currentPaymentId = null;
    });

    const paymentIdSnap = this.route.snapshot.paramMap.get('id');
    const openingPaymentEdit =
      paymentIdSnap != null &&
      paymentIdSnap !== '' &&
      !isNaN(+paymentIdSnap) &&
      +paymentIdSnap > 0;

    if (!openingPaymentEdit && ctxClaim != null && ctxClaim > 0) {
      this.loadServiceLines();
    }
  }

  /** Load payment by id and fill form (edit mode). */
  loadPaymentForEdit(id: number): void {
    this.error = null;
    this.paymentApi.getPaymentById(id).subscribe({
      next: (p) => {
        this.isEditMode = true;
        this.currentPaymentId = p.paymentId;
        this.paymentSource = p.paymentSource === 1 ? 'Payer' : 'Patient';
        const dateStr = p.date && p.date.toString().slice(0, 10) ? p.date.toString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        this.paymentForm.patchValue({
          payerId: p.payerId,
          claimId: p.claimId != null && p.claimId > 0 ? p.claimId : null,
          patientId: p.patientId,
          amount: p.amount,
          pmtDate: dateStr,
          method: p.method ?? 'Check',
          reference1: p.reference1 ?? '',
          reference2: p.reference2 ?? '',
          note: p.note ?? ''
        });
        this.recalculatePaymentTotals();
        this.loadServiceLines();
      },
      error: (err) => {
        this.error = err.error?.message || err.message || 'Failed to load payment.';
        this.isEditMode = false;
        this.currentPaymentId = null;
      }
    });
  }

  /**
   * Load service lines for Claim ID (preferred) or Patient ID fallback (e.g. edit with no claim on payment).
   * When source is Payer, optional payer filter applies.
   */
  loadServiceLines(): void {
    const claimIdRaw = this.paymentForm.get('claimId')?.value;
    const patientIdRaw = this.paymentForm.get('patientId')?.value;
    const cid = claimIdRaw != null && claimIdRaw !== '' ? Number(claimIdRaw) : NaN;
    const pid = patientIdRaw != null && patientIdRaw !== '' ? Number(patientIdRaw) : NaN;

    if (!(cid > 0) && !(pid > 0)) {
      this.serviceLineRows = [];
      return;
    }

    const payerId = this.paymentSource === 'Payer' ? this.paymentForm.get('payerId')?.value : null;
    this.loadingServiceLines = true;
    this.error = null;
    const opts = cid > 0 ? { claimId: cid, payerId } : { patientId: pid, payerId };
    this.paymentApi.getServiceLinesForEntry(opts).subscribe({
      next: (lines) => {
        this.serviceLineRows = lines.map(line => ({
          claimId: Number(line.claimId) || 0,
          patientId: Number(line.patientId) || 0,
          serviceLineId: Number(line.serviceLineId) || 0,
          name: line.name ?? null,
          dos: line.dos ?? null,
          proc: line.proc ?? null,
          charge: Number(line.charge) || 0,
          responsible: line.responsible ?? null,
          applied: Number(line.applied) || 0,
          balance: Number(line.balance) || 0,
          payAmount: 0,
          adjustments: [{}, {}] as { groupCode?: string; reasonCode?: string; amount?: number }[]
        }));
        if (lines.length > 0) {
          const row0 = lines[0];
          if (row0.patientId > 0) {
            this.paymentForm.patchValue({ patientId: row0.patientId }, { emitEvent: false });
          }
          if (row0.claimId > 0) {
            this.paymentForm.patchValue({ claimId: row0.claimId }, { emitEvent: false });
          }
        } else if (cid > 0) {
          this.paymentForm.patchValue({ patientId: null }, { emitEvent: false });
        }
        this.loadingServiceLines = false;
        this.recalculatePaymentTotals();
      },
      error: (err) => {
        this.loadingServiceLines = false;
        this.serviceLineRows = [];
        this.error = err.error?.message || err.message || 'Failed to load service lines.';
        this.recalculatePaymentTotals();
      }
    });
  }

  /** Called when user leaves Claim ID field – refresh the grid. */
  onClaimIdBlur(): void {
    this.loadServiceLines();
  }

  /** Called when Payment Source or Payer changes – refresh the grid with correct filter. */
  onSourceOrPayerChange(): void {
    this.loadServiceLines();
  }

  /**
   * When user focuses the Pay input: if field is 0 and line has a balance, fill with full balance (UX convenience).
   * Only that row; does not override if user already entered a value. UI-only; no backend.
   */
  onPayFieldFocus(row: PaymentEntryRow): void {
    const paid = Number(row.payAmount) || 0;
    const balance = Number(row.balance) || 0;
    if (paid === 0 && balance > 0) {
      row.payAmount = balance;
      this.recalculatePaymentTotals();
    }
  }

  /** Load payer library for the Payer dropdown. */
  loadPayers(): void {
    this.loadingPayers = true;
    this.payerApi.getPayers(1, 500, { inactive: false }).subscribe({
      next: (res) => {
        this.payerList = res.data ?? [];
        this.loadingPayers = false;
      },
      error: () => {
        this.payerList = [];
        this.loadingPayers = false;
      }
    });
  }

  /** Navigate to Payer Library (manage payers). */
  openPayerLibrary(): void {
    this.router.navigate(['/payer-library']);
  }

  get pmtAmt(): number {
    return Number(this.paymentForm.get('amount')?.value ?? 0);
  }

  /**
   * Header totals in claim-balance context (EZClaim style):
   * - Base balance comes from grid Balance column (already historical-aware from backend).
   * - If user keyed per-line Pay values, use their sum as prospective apply.
   * - Otherwise, use entered payment amount as prospective apply.
   * - Remaining = total grid balance - prospective apply (floor at 0).
   */
  recalculatePaymentTotals(): void {
    const paymentAmount = Number(this.paymentForm.get('amount')?.value ?? 0) || 0;
    let totalBalance = 0;
    let sumPay = 0;
    for (const r of this.serviceLineRows) {
      totalBalance += Number(r.balance) || 0;
      sumPay += Number(r.payAmount) || 0;
    }
    const prospectiveApply = sumPay > 0 ? sumPay : paymentAmount;
    this.appliedAmount = Number(prospectiveApply.toFixed(2));
    this.remaining = Number(Math.max(0, totalBalance - prospectiveApply).toFixed(2));
    this.cdr.markForCheck();
  }

  /** Build payload from Pay column values and adjustment inputs. */
  private buildCommand(): {
    paymentSource: number;
    payerId: number | null;
    claimId: number;
    billingPhysicianId?: number | null;
    patientId: number;
    amount: number;
    date: string;
    method: string | null;
    reference1: string | null;
    reference2: string | null;
    note: string | null;
    serviceLineApplications: { serviceLineId: number; paymentAmount: number; adjustments: { groupCode: string; reasonCode: string; amount: number }[] }[];
  } {
    const formBillingPhysicianId = this.paymentForm.get('billingPhysicianId')?.value;
    const billingPhysicianId =
      formBillingPhysicianId == null || Number(formBillingPhysicianId) === 0
        ? null
        : Number(formBillingPhysicianId);

    const applications = this.serviceLineRows
      .filter(row => (Number(row.payAmount) || 0) > 0)
      .map(row => {
        const adjs = (row.adjustments || []).filter(a => a && (Number(a.amount) || 0) !== 0);
        return {
          serviceLineId: row.serviceLineId,
          paymentAmount: Number(row.payAmount) || 0,
          adjustments: adjs.map(a => ({
            groupCode: (a.groupCode ?? '').trim() || 'PR',
            reasonCode: (a.reasonCode ?? '').trim(),
            amount: Number(a.amount) || 0
          }))
        };
      });
    const claimFromForm = Number(this.paymentForm.get('claimId')?.value);
    const claimFromRows = this.serviceLineRows[0]?.claimId;
    const resolvedClaimId =
      claimFromForm > 0 ? claimFromForm : claimFromRows != null && claimFromRows > 0 ? claimFromRows : 0;

    return {
      paymentSource: this.paymentSource === 'Payer' ? 1 : 0,
      payerId: this.paymentSource === 'Payer' ? this.paymentForm.get('payerId')?.value ?? null : null,
      claimId: resolvedClaimId,
      billingPhysicianId,
      patientId: Number(this.paymentForm.get('patientId')?.value),
      amount: Number(this.paymentForm.get('amount')?.value ?? 0),
      date: this.paymentForm.get('pmtDate')?.value ?? '',
      method: this.paymentForm.get('method')?.value || null,
      reference1: this.paymentForm.get('reference1')?.value || null,
      reference2: this.paymentForm.get('reference2')?.value || null,
      note: this.paymentForm.get('note')?.value || null,
      serviceLineApplications: applications
    };
  }

  private resolveClaimIdFromContext(): number | null {
    const claimIdFromQuery = this.route.snapshot.queryParamMap.get('claimId');
    const fromQuery = claimIdFromQuery != null ? Number(claimIdFromQuery) : NaN;
    if (!isNaN(fromQuery) && fromQuery > 0) return fromQuery;

    // Do not use route `id` — on /payments/entry/:id that is the payment id (edit), not claim id.

    const ctxClaimId = this.ribbonContext.getContext().claimId;
    return ctxClaimId != null && ctxClaimId > 0 ? ctxClaimId : null;
  }

  save(): void {
    this.error = null;
    this.successMessage = null;
    if (!this.validateClaimAndPatientForSave()) {
      return;
    }
    const amount = this.paymentForm.get('amount')?.value;
    if (amount == null || amount === '') {
      this.error = 'Amount is required.';
      return;
    }
    if (this.paymentSource === 'Payer') {
      const payerId = this.paymentForm.get('payerId')?.value;
      if (payerId == null || payerId === '') {
        this.error = 'Payer is required when payment source is Payer.';
        return;
      }
    }
    this.saving = true;
    const command = this.buildCommand();
    if (this.isEditMode && this.currentPaymentId != null) {
      this.paymentApi.modifyPayment(this.currentPaymentId, command).subscribe({
        next: (res) => {
          this.saving = false;
          this.currentPaymentId = res.data;
          this.appliedAmount = 0;
          this.recalculatePaymentTotals();
          this.successMessage = `Payment updated (new ID #${res.data}).`;
        },
        error: (err) => {
          this.saving = false;
          this.error = err.error?.message || err.message || 'Failed to update payment.';
        }
      });
    } else {
      this.paymentApi.createPayment(command).subscribe({
        next: (res) => {
          this.saving = false;
          this.currentPaymentId = res.data;
          this.appliedAmount = 0;
          this.recalculatePaymentTotals();
          this.successMessage = `Payment #${res.data} saved.`;
        },
        error: (err) => {
          this.saving = false;
          this.error = err.error?.message || err.message || 'Failed to save payment.';
        }
      });
    }
  }

  saveAndClose(): void {
    this.error = null;
    this.successMessage = null;
    if (!this.validateClaimAndPatientForSave()) {
      return;
    }
    const amount = this.paymentForm.get('amount')?.value;
    if (amount == null || amount === '') {
      this.error = 'Amount is required.';
      return;
    }
    if (this.paymentSource === 'Payer') {
      const payerId = this.paymentForm.get('payerId')?.value;
      if (payerId == null || payerId === '') {
        this.error = 'Payer is required when payment source is Payer.';
        return;
      }
    }
    this.saving = true;
    const command = this.buildCommand();
    if (this.isEditMode && this.currentPaymentId != null) {
      this.paymentApi.modifyPayment(this.currentPaymentId, command).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['payments/find-payment']);
        },
        error: (err) => {
          this.saving = false;
          this.error = err.error?.message || err.message || 'Failed to update payment.';
        }
      });
    } else {
      this.paymentApi.createPayment(command).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['payments/find-payment']);
        },
        error: (err) => {
          this.saving = false;
          this.error = err.error?.message || err.message || 'Failed to save payment.';
        }
      });
    }
  }

  close(): void {
    this.router.navigate(['payments/find-payment']);
  }

  newPmt(): void {
    this.isEditMode = false;
    this.currentPaymentId = null;
    this.router.navigate(['payments/entry']).then(() => {
      this.appliedAmount = 0;
      this.paymentForm.patchValue({
        claimId: null,
        patientId: null,
        amount: 0,
        pmtDate: new Date().toISOString().slice(0, 10),
        method: 'Check',
        reference1: '',
        reference2: '',
        note: ''
      });
      this.serviceLineRows = [];
      this.recalculatePaymentTotals();
      this.error = null;
      this.successMessage = null;
    });
  }

  /** True when claim id and patient id are ready for save/auto-apply. */
  private validateClaimAndPatientForSave(): boolean {
    const claimFromForm = Number(this.paymentForm.get('claimId')?.value);
    const claimFromRows = this.serviceLineRows[0]?.claimId;
    const resolvedClaim =
      claimFromForm > 0 ? claimFromForm : claimFromRows != null && claimFromRows > 0 ? claimFromRows : 0;
    if (!resolvedClaim || resolvedClaim <= 0) {
      this.error = 'Claim ID is required. Enter a claim number and load lines, or open Payment Entry with a claim context.';
      return false;
    }

    const patientId = this.paymentForm.get('patientId')?.value;
    if (patientId == null || patientId === '' || Number(patientId) <= 0) {
      this.error = 'Patient could not be resolved. Enter a valid Claim ID and load service lines.';
      return false;
    }
    return true;
  }

  async autoApply(): Promise<void> {
    this.error = null;
    this.successMessage = null;
    try {
      // If not saved yet, auto-save first (user requested one-click behavior).
      if (this.currentPaymentId == null) {
        if (!this.validateClaimAndPatientForSave()) {
          return;
        }
        const amount = this.paymentForm.get('amount')?.value;
        if (amount == null || amount === '') {
          this.error = 'Amount is required.';
          return;
        }
        if (this.paymentSource === 'Payer') {
          const payerId = this.paymentForm.get('payerId')?.value;
          if (payerId == null || payerId === '') {
            this.error = 'Payer is required when payment source is Payer.';
            return;
          }
        }

        const command = this.buildCommand();
        const res = await firstValueFrom(this.paymentApi.createPayment(command));
        this.currentPaymentId = res.data;
        this.isEditMode = true;
      }

      await firstValueFrom(this.paymentApi.autoApply(this.currentPaymentId));
      const applied = this.applyAutoAllocationToGrid();
      this.successMessage = `Auto apply completed.${applied > 0 ? ` Applied ${applied.toFixed(2)}.` : ''}`;
      // Re-read server-calculated applied/balance values to keep links accurate.
      this.loadServiceLines();
      this.recalculatePaymentTotals();
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Auto apply failed.';
    }
  }

  /**
   * Apply payment amount across grid rows so Pay column reflects allocation.
   * Allocation rule: pay = min(remaining payment, service line balance), regardless of responsible party.
   */
  private applyAutoAllocationToGrid(): number {
    let remaining = Math.max(0, this.pmtAmt);
    let totalApplied = 0;

    for (const row of this.serviceLineRows) {
      const balance = Math.max(0, Number(row.balance) || 0);
      if (remaining <= 0 || balance <= 0) {
        row.payAmount = 0;
        continue;
      }

      const pay = Math.min(remaining, balance);
      row.payAmount = Number(pay.toFixed(2));
      totalApplied += row.payAmount;
      remaining = Number((remaining - row.payAmount).toFixed(2));
    }

    return Number(totalApplied.toFixed(2));
  }
}
