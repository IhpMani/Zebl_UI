import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { PayerApiService } from '../../core/services/payer-api.service';
import { PaymentEntryRow } from '../../core/services/payment.models';
import { PayerListItem } from '../../core/services/payer.models';
import { RibbonContextService } from '../../core/services/ribbon-context.service';
import { WorkspaceService } from '../../workspace/application/workspace.service';

@Component({
  selector: 'app-payment-entry',
  templateUrl: './payment-entry.component.html',
  styleUrls: ['./payment-entry.component.css']
})
export class PaymentEntryComponent implements OnInit {
  paymentForm: FormGroup;
  paymentSource: 'Patient' | 'Payer' = 'Payer';
  claimId: number | null = null;
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
      patientId: [null, Validators.required],
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
    this.claimId = this.resolveClaimIdFromContext();
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

  /** Load service lines for the current Patient ID (and Payer when source is Payer). Call when Patient ID is entered or Payer changes. */
  loadServiceLines(): void {
    const patientId = this.paymentForm.get('patientId')?.value;
    if (patientId == null || patientId === '' || Number(patientId) <= 0) {
      this.serviceLineRows = [];
      return;
    }
    const pid = Number(patientId);
    const payerId = this.paymentSource === 'Payer' ? this.paymentForm.get('payerId')?.value : null;
    this.loadingServiceLines = true;
    this.error = null;
    this.paymentApi.getServiceLinesForEntry(pid, payerId).subscribe({
      next: (lines) => {
        this.serviceLineRows = lines.map(line => ({
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

  /** Called when user leaves Patient ID field – refresh the grid. */
  onPatientIdBlur(): void {
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
   * Header totals from grid: Applied Amt = Σ line applied + Σ Pay; Remaining = Pmt Amt − Applied Amt (floor at 0).
   */
  recalculatePaymentTotals(): void {
    const paymentAmount = Number(this.paymentForm.get('amount')?.value ?? 0) || 0;
    let sumAppliedCol = 0;
    let sumPay = 0;
    for (const r of this.serviceLineRows) {
      sumAppliedCol += Number(r.applied) || 0;
      sumPay += Number(r.payAmount) || 0;
    }
    this.appliedAmount = sumAppliedCol + sumPay;
    this.remaining = Math.max(0, paymentAmount - this.appliedAmount);
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
    return {
      paymentSource: this.paymentSource === 'Payer' ? 1 : 0,
      payerId: this.paymentSource === 'Payer' ? this.paymentForm.get('payerId')?.value ?? null : null,
      claimId: this.claimId ?? 0,
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

    // Some flows may pass claim id as route param.
    const routeId = this.route.snapshot.paramMap.get('id');
    const fromRoute = routeId != null ? Number(routeId) : NaN;
    if (!isNaN(fromRoute) && fromRoute > 0 && !this.isEditMode) return fromRoute;

    const ctxClaimId = this.ribbonContext.getContext().claimId;
    return ctxClaimId != null && ctxClaimId > 0 ? ctxClaimId : null;
  }

  save(): void {
    this.error = null;
    this.successMessage = null;
    this.claimId = this.resolveClaimIdFromContext();
    if (!this.claimId || this.claimId <= 0) {
      this.error = 'Claim context is missing. Open Payment Entry from a claim so claimId is available.';
      return;
    }
    const patientId = this.paymentForm.get('patientId')?.value;
    if (patientId == null || patientId === '') {
      this.error = 'Patient is required.';
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
    this.claimId = this.resolveClaimIdFromContext();
    if (!this.claimId || this.claimId <= 0) {
      this.error = 'Claim context is missing. Open Payment Entry from a claim so claimId is available.';
      return;
    }
    const patientId = this.paymentForm.get('patientId')?.value;
    if (patientId == null || patientId === '') {
      this.error = 'Patient is required.';
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

  autoApply(): void {
    if (this.currentPaymentId == null) {
      this.error = 'Save the payment first, then use Auto Apply.';
      return;
    }
    this.error = null;
    this.paymentApi.autoApply(this.currentPaymentId).subscribe({
      next: () => {
        const applied = this.applyAutoAllocationToGrid();
        this.successMessage = `Auto apply completed.${applied > 0 ? ` Applied ${applied.toFixed(2)}.` : ''}`;
        this.recalculatePaymentTotals();
      },
      error: (err) => {
        this.error = err.error?.message || err.message || 'Auto apply failed.';
      }
    });
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
