import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PayerApiService } from '../../core/services/payer-api.service';
import { PayerDetailDto } from '../../core/services/payer.models';
import { ListApiService, ListValueDto } from '../../core/services/list-api.service';

@Component({
  selector: 'app-payer-library-form',
  templateUrl: './payer-library-form.component.html',
  styleUrls: ['./payer-library-form.component.scss']
})
export class PayerLibraryFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  loading = false;
  saving = false;
  error: string | null = null;
  isNew = false;
  currentId: number | null = null;
  classificationOptions: ListValueDto[] = [];
  private paramSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private payerApi: PayerApiService,
    private listApi: ListApiService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadClassificationOptions();

    this.paramSub = this.route.paramMap.subscribe(paramMap => {
      const idParam = paramMap.get('id');
      this.error = null;
      if (idParam === 'new') {
        this.isNew = true;
        this.currentId = null;
        this.form.reset({
          paySubmissionMethod: 'Paper',
          payClaimType: 'Professional',
          payInactive: false,
          payIgnoreRenderingProvider: false,
          payForwardsClaims: false,
          payExportAuthIn2400: false,
          payExportSSN: false,
          payExportOriginalRefIn2330B: false,
          payExportPaymentDateIn2330B: false,
          payExportPatientAmtDueIn2430: false,
          payUseTotalAppliedInBox29: false,
          payPrintBox30: false,
          paySuppressWhenPrinting: false,
          payEligibilityPhyID: 0,
          payFollowUpDays: 0
        });
        this.setPayerIdValidator();
      } else if (idParam) {
        this.isNew = false;
        this.currentId = +idParam;
        this.loadPayer(this.currentId);
      } else {
        this.isNew = true;
        this.currentId = null;
        this.setPayerIdValidator();
      }
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
  }

  private loadClassificationOptions(): void {
    this.listApi.getListValues('Payer Classification').subscribe({
      next: (r) => {
        this.classificationOptions = (r.data || []).slice().sort((a, b) => (a.value || '').localeCompare(b.value || ''));
      },
      error: () => {
        this.classificationOptions = [];
      }
    });
  }

  private buildForm(): void {
    this.form = this.fb.group({
      payName: ['', Validators.required],
      payExternalID: [''],
      paySubmissionMethod: ['Paper'],
      payClaimFilingIndicator: [''],
      payClaimType: ['Professional'],
      payInsTypeCode: [''],
      payClassification: [''],
      payPaymentMatchingKey: [''],
      payEligibilityPayerID: [''],
      payEligibilityPhyID: [0],
      payFollowUpDays: [0],
      payICDIndicator: [''],
      payInactive: [false],
      payIgnoreRenderingProvider: [false],
      payForwardsClaims: [false],
      payExportAuthIn2400: [false],
      payExportSSN: [false],
      payExportOriginalRefIn2330B: [false],
      payExportPaymentDateIn2330B: [false],
      payExportPatientAmtDueIn2430: [false],
      payUseTotalAppliedInBox29: [false],
      payPrintBox30: [false],
      paySuppressWhenPrinting: [false],
      payAddr1: [''],
      payAddr2: [''],
      payCity: [''],
      payState: [''],
      payZip: [''],
      payPhoneNo: [''],
      payEmail: [''],
      payNotes: ['']
    });

    this.form.get('paySubmissionMethod')?.valueChanges.subscribe(() => {
      this.form.get('payExternalID')?.updateValueAndValidity();
    });
  }

  private setPayerIdValidator(): void {
    const method = this.form.get('paySubmissionMethod')?.value;
    const ctrl = this.form.get('payExternalID');
    if (method === 'Electronic') {
      ctrl?.setValidators([Validators.required]);
    } else {
      ctrl?.clearValidators();
    }
    ctrl?.updateValueAndValidity();
  }

  loadPayer(id: number): void {
    this.loading = true;
    this.error = null;
    this.payerApi.getById(id).subscribe({
      next: (p) => {
        if (!p) {
          this.error = 'Payer not found.';
          this.loading = false;
          return;
        }
        this.form.patchValue({
          payName: p.payName ?? '',
          payExternalID: p.payExternalID ?? '',
          paySubmissionMethod: p.paySubmissionMethod ?? 'Paper',
          payClaimFilingIndicator: p.payClaimFilingIndicator ?? '',
          payClaimType: p.payClaimType ?? 'Professional',
          payInsTypeCode: p.payInsTypeCode ?? '',
          payClassification: p.payClassification ?? '',
          payPaymentMatchingKey: p.payPaymentMatchingKey ?? '',
          payEligibilityPayerID: p.payEligibilityPayerID ?? '',
          payEligibilityPhyID: p.payEligibilityPhyID ?? 0,
          payFollowUpDays: p.payFollowUpDays ?? 0,
          payICDIndicator: p.payICDIndicator ?? '',
          payInactive: p.payInactive ?? false,
          payIgnoreRenderingProvider: p.payIgnoreRenderingProvider ?? false,
          payForwardsClaims: p.payForwardsClaims ?? false,
          payExportAuthIn2400: p.payExportAuthIn2400 ?? false,
          payExportSSN: p.payExportSSN ?? false,
          payExportOriginalRefIn2330B: p.payExportOriginalRefIn2330B ?? false,
          payExportPaymentDateIn2330B: p.payExportPaymentDateIn2330B ?? false,
          payExportPatientAmtDueIn2430: p.payExportPatientAmtDueIn2430 ?? false,
          payUseTotalAppliedInBox29: p.payUseTotalAppliedInBox29 ?? false,
          payPrintBox30: p.payPrintBox30 ?? false,
          paySuppressWhenPrinting: p.paySuppressWhenPrinting ?? false,
          payAddr1: p.payAddr1 ?? '',
          payAddr2: p.payAddr2 ?? '',
          payCity: p.payCity ?? '',
          payState: p.payState ?? '',
          payZip: p.payZip ?? '',
          payPhoneNo: p.payPhoneNo ?? '',
          payEmail: p.payEmail ?? '',
          payNotes: p.payNotes ?? ''
        });
        this.setPayerIdValidator();
        this.loading = false;
      },
      error: (err) => {
        const status = err?.status;
        if (status === 0) {
          this.error = 'Cannot reach the API. Start the Zebl API (e.g. on http://localhost:5226).';
        } else if (status === 504) {
          this.error = 'The API took too long to respond. Ensure the Zebl API is running and try again.';
        } else if (status === 404) {
          this.error = 'Payer not found. It may have been deleted.';
        } else {
          this.error = err?.error?.message || err?.message || 'Failed to load payer';
        }
        this.loading = false;
      }
    });
  }

  getPayload(): Partial<PayerDetailDto> {
    const v = this.form.value;
    return {
      payName: v.payName?.trim() || null,
      payExternalID: v.payExternalID?.trim() || null,
      paySubmissionMethod: v.paySubmissionMethod || 'Paper',
      payClaimFilingIndicator: v.payClaimFilingIndicator?.trim() || null,
      payClaimType: v.payClaimType || 'Professional',
      payInsTypeCode: v.payInsTypeCode?.trim() || null,
      payClassification: v.payClassification?.trim() || null,
      payPaymentMatchingKey: v.payPaymentMatchingKey?.trim() || null,
      payEligibilityPayerID: v.payEligibilityPayerID?.trim() || null,
      payEligibilityPhyID: v.payEligibilityPhyID ?? 0,
      payFollowUpDays: v.payFollowUpDays ?? 0,
      payICDIndicator: v.payICDIndicator?.trim() || null,
      payInactive: !!v.payInactive,
      payIgnoreRenderingProvider: !!v.payIgnoreRenderingProvider,
      payForwardsClaims: !!v.payForwardsClaims,
      payExportAuthIn2400: !!v.payExportAuthIn2400,
      payExportSSN: !!v.payExportSSN,
      payExportOriginalRefIn2330B: !!v.payExportOriginalRefIn2330B,
      payExportPaymentDateIn2330B: !!v.payExportPaymentDateIn2330B,
      payExportPatientAmtDueIn2430: !!v.payExportPatientAmtDueIn2430,
      payUseTotalAppliedInBox29: !!v.payUseTotalAppliedInBox29,
      payPrintBox30: !!v.payPrintBox30,
      paySuppressWhenPrinting: !!v.paySuppressWhenPrinting,
      payAddr1: v.payAddr1?.trim() || null,
      payAddr2: v.payAddr2?.trim() || null,
      payCity: v.payCity?.trim() || null,
      payState: v.payState?.trim() || null,
      payZip: v.payZip?.trim() || null,
      payPhoneNo: v.payPhoneNo?.trim() || null,
      payEmail: v.payEmail?.trim() || null,
      payNotes: v.payNotes?.trim() || null
    };
  }

  onSaveAndNew(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.get('paySubmissionMethod')?.value === 'Electronic') {
        this.setPayerIdValidator();
      }
      return;
    }
    this.saving = true;
    this.error = null;
    const payload = this.getPayload();
    if (this.isNew) {
      this.payerApi.create(payload).subscribe({
        next: () => {
          this.saving = false;
          this.form.reset({ paySubmissionMethod: 'Paper', payClaimType: 'Professional', payInactive: false });
          this.form.patchValue({ paySubmissionMethod: 'Paper', payClaimType: 'Professional' });
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to create payer';
          this.saving = false;
        }
      });
    } else {
      this.payerApi.update(this.currentId!, { ...payload, payID: this.currentId! }).subscribe({
        next: () => {
          this.saving = false;
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to update payer';
          this.saving = false;
        }
      });
    }
  }

  onSaveAndClose(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.get('paySubmissionMethod')?.value === 'Electronic') {
        this.setPayerIdValidator();
      }
      return;
    }
    this.saving = true;
    this.error = null;
    const payload = this.getPayload();
    if (this.isNew) {
      this.payerApi.create(payload).subscribe({
        next: (created) => {
          this.saving = false;
          this.router.navigate(['../', created.payID], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to create payer';
          this.saving = false;
        }
      });
    } else {
      this.payerApi.update(this.currentId!, { ...payload, payID: this.currentId! }).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to update payer';
          this.saving = false;
        }
      });
    }
  }

  onClose(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  onDelete(): void {
    if (this.isNew || !this.currentId) return;
    if (!confirm('Delete this payer?')) return;
    this.saving = true;
    this.error = null;
    this.payerApi.delete(this.currentId).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['../'], { relativeTo: this.route });
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message ?? err?.message;
        this.error = msg && msg.includes('in use')
          ? 'Payer cannot be deleted because it is in use. Use Inactive instead.'
          : (msg || 'Failed to delete payer');
      }
    });
  }
}
