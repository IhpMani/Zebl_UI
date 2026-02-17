import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { Claim, ClaimAdditionalData } from '../../core/services/claim.models';
import { ListApiService, ListValueDto } from '../../core/services/list-api.service';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { PhysicianListItem } from '../../core/services/physician.models';
import { AdjustmentApiService } from '../../core/services/adjustment-api.service';
import { DisbursementApiService } from '../../core/services/disbursement-api.service';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { RibbonContextService } from '../../core/services/ribbon-context.service';

@Component({
  selector: 'app-claim-details',
  templateUrl: './claim-details.component.html',
  styleUrls: ['./claim-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClaimDetailsComponent implements OnInit, OnDestroy {
  claim: Claim | null = null;
  loading: boolean = false;
  error: string | null = null;
  claId: number | null = null;
  showNotes: boolean = true;
  newNote: string = '';
  claimTemplates = [
    { id: 'standard', label: 'Standard Template' },
    { id: 'ezclaim', label: 'EZClaim Desktop' },
    { id: 'custom', label: 'Custom Template' }
  ];
  diagnosisFields: Array<{ label: string; field: keyof Claim }> = [
    { label: 'Diagnosis A1', field: 'claDiagnosis1' },
    { label: 'Diagnosis B2', field: 'claDiagnosis2' },
    { label: 'Diagnosis C3', field: 'claDiagnosis3' },
    { label: 'Diagnosis D4', field: 'claDiagnosis4' },
    { label: 'Diagnosis E5', field: 'claDiagnosis5' },
    { label: 'Diagnosis F6', field: 'claDiagnosis6' },
    { label: 'Diagnosis G7', field: 'claDiagnosis7' },
    { label: 'Diagnosis H8', field: 'claDiagnosis8' },
    { label: 'Diagnosis I9', field: 'claDiagnosis9' },
    { label: 'Diagnosis J10', field: 'claDiagnosis10' },
    { label: 'Diagnosis K11', field: 'claDiagnosis11' },
    { label: 'Diagnosis L12', field: 'claDiagnosis12' }
  ];

  /** Classification options from Libraries → List → Claim Classification */
  classificationOptions: ListValueDto[] = [];
  /** Status options from Libraries → List → Claim Status */
  statusOptions: ListValueDto[] = [];

  /** Static options for Method (ClaSubmissionMethod) */
  methodOptions = ['Electronic', 'Paper', 'Other'];

  /** Condition Related To options (ClaRelatedTo: 0=None, 1=Employment, 2=Auto Accident, 3=Other Accident) */
  conditionRelatedOptions = [
    { value: 0, label: 'None' },
    { value: 1, label: 'Employment' },
    { value: 2, label: 'Auto Accident' },
    { value: 3, label: 'Other Accident' }
  ];

  /** Claim Delay Code options (ClaDelayCode) */
  delayCodeOptions = [
    { value: '01', label: '01 – Proof of Eligibility Unknown' },
    { value: '02', label: '02 – Litigation' },
    { value: '03', label: '03 – Authorization Delayed' },
    { value: '04', label: '04 – Delay in Certifying Provider' },
    { value: '05', label: '05 – Delay in Supplying Billing Forms' }
  ];

  /** Paperwork Transmission Code options (ClaPaperWorkTransmissionCode) */
  transmissionCodeOptions = ['AA', 'BM', 'EL', 'EM', 'FX'];

  /** Paperwork Indicator options (ClaPaperWorkInd) */
  paperworkIndOptions = ['Y', 'N'];

  /** Resubmission Code options (ClaMedicaidResubmissionCode) */
  resubmissionCodeOptions = [
    { value: '1', label: '1 – Original' },
    { value: '7', label: '7 – Replacement' },
    { value: '8', label: '8 – Void' }
  ];

  /** Physicians for provider dropdowns - from existing Physician API */
  physicians: PhysicianListItem[] = [];
  /** Rendering providers only (phyType === "Person") */
  renderingProviders: PhysicianListItem[] = [];
  /** Service facilities only (phyType === "Non-Person") */
  serviceFacilities: PhysicianListItem[] = [];

  /** Form for Claim Information and Physician fields */
  claimForm = new FormGroup({
    ClaStatus: new FormControl<string | null>(''),
    ClaClassification: new FormControl<string | null>(''),
    ClaSubmissionMethod: new FormControl<string | null>(''),
    ClaRenderingPhyFID: new FormControl<number | null>(null),
    ClaFacilityPhyFID: new FormControl<number | null>(null)
  });

  sectionsState = {
    claimInfo: true,
    physician: true,
    dates: true,
    misc: true,
    resubmission: true,
    paperwork: true,
    additionalData: true
  };

  payments: any[] = [];
  adjustments: any[] = [];
  disbursements: any[] = [];
  loadingPayments: boolean = false;
  loadingAdjustments: boolean = false;
  loadingDisbursements: boolean = false;
  secondaryTab: 'payments' | 'adjustments' | 'disbursements' = 'payments';
  secondaryLoaded = {
    payments: false,
    adjustments: false,
    disbursements: false
  };

  serviceLines: any[] = [];
  serviceLoading: boolean = false;
  serviceLoaded: boolean = false;
  selectedServiceLineId: number | null = null;

  private claimRequestInFlight = false;
  private serviceRequestInFlight = false;
  private paymentRequestInFlight = false;
  private adjustmentRequestInFlight = false;
  private disbursementRequestInFlight = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private claimApiService: ClaimApiService,
    private ribbonContext: RibbonContextService,
    private listApiService: ListApiService,
    private physicianApiService: PhysicianApiService,
    private serviceApi: ServiceApiService,
    private paymentApi: PaymentApiService,
    private adjustmentApi: AdjustmentApiService,
    private disbursementApi: DisbursementApiService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadClassificationOptions();
    this.loadStatusOptions();
    this.loadPhysicians();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.claId = +idParam;
      this.loadClaim(this.claId);
      this.loadServiceLines();
    } else {
      this.error = 'Invalid claim ID';
    }
  }

  loadClassificationOptions(): void {
    this.listApiService.getListValues('Claim Classification').subscribe({
      next: (r) => {
        const items = (r.data || []).slice().sort((a, b) => (a.value || '').localeCompare(b.value || ''));
        this.classificationOptions = items;
        this.ensureCurrentClassificationInOptions();
        this.cdr.markForCheck();
      },
      error: () => { this.classificationOptions = []; this.cdr.markForCheck(); }
    });
  }

  loadStatusOptions(): void {
    this.listApiService.getListValues('Claim Status').subscribe({
      next: (r) => {
        const items = (r.data || []).slice().sort((a, b) => (a.value || '').localeCompare(b.value || ''));
        this.statusOptions = items;
        this.ensureCurrentStatusInOptions();
        this.cdr.markForCheck();
      },
      error: () => { this.statusOptions = []; this.cdr.markForCheck(); }
    });
  }

  /** Load physicians once from existing Physician API; derive filtered lists for dropdowns */
  loadPhysicians(): void {
    this.physicianApiService.getPhysicians(1, 10000).subscribe({
      next: (r) => {
        this.physicians = r.data ?? [];
        this.renderingProviders = this.physicians.filter(p => p.phyType === 'Person');
        this.serviceFacilities = this.physicians.filter(p => p.phyType === 'Non-Person');
        this.ensureCurrentPhysiciansInOptions();
        this.cdr.markForCheck();
      },
      error: () => {
        this.physicians = [];
        this.renderingProviders = [];
        this.serviceFacilities = [];
        this.cdr.markForCheck();
      }
    });
  }

  /** Ensure the claim's current ClaClassification appears in dropdown (for legacy values not in list) */
  private ensureCurrentClassificationInOptions(): void {
    if (!this.claim?.claClassification?.trim()) return;
    const current = this.claim.claClassification.trim();
    if (!this.classificationOptions.some(o => o.value === current)) {
      this.classificationOptions = [...this.classificationOptions, { value: current, usageCount: 0 }]
        .sort((a, b) => (a.value || '').localeCompare(b.value || ''));
    }
  }

  /** Ensure claim's current rendering/facility physicians appear in dropdowns (for legacy/edge cases) */
  private ensureCurrentPhysiciansInOptions(): void {
    const rid = this.claim?.renderingPhysician?.phyID;
    const fid = this.claim?.facilityPhysician?.phyID;
    if (rid && rid > 0 && !this.renderingProviders.some(p => p.phyID === rid)) {
      const p = this.physicians.find(x => x.phyID === rid);
      if (p) this.renderingProviders = [...this.renderingProviders, p];
    }
    if (fid && fid > 0 && !this.serviceFacilities.some(p => p.phyID === fid)) {
      const p = this.physicians.find(x => x.phyID === fid);
      if (p) this.serviceFacilities = [...this.serviceFacilities, p];
    }
  }

  /** Ensure the claim's current ClaStatus appears in dropdown (for legacy values not in list) */
  private ensureCurrentStatusInOptions(): void {
    if (!this.claim?.claStatus?.trim()) return;
    const current = this.claim.claStatus.trim();
    if (!this.statusOptions.some(o => o.value === current)) {
      this.statusOptions = [...this.statusOptions, { value: current, usageCount: 0 }]
        .sort((a, b) => (a.value || '').localeCompare(b.value || ''));
    }
  }

  /** Update claim nested physician refs from physicians list after save */
  private updateClaimPhysicianRefs(renderingId: number | null, facilityId: number | null): void {
    const toPhy = (id: number | null) => {
      if (id == null || id === 0) return null;
      const p = this.physicians.find(x => x.phyID === id);
      return p ? { phyID: p.phyID, phyName: p.phyFullNameCC || p.phyName || null, phyNPI: p.phyNPI || null } : null;
    };
    if (this.claim) {
      this.claim.renderingPhysician = toPhy(renderingId);
      this.claim.facilityPhysician = toPhy(facilityId);
    }
  }

  /** Patch form with claim data from API */
  private patchClaimForm(): void {
    this.claimForm.patchValue({
      ClaStatus: this.claim?.claStatus ?? null,
      ClaClassification: this.claim?.claClassification ?? null,
      ClaSubmissionMethod: this.claim?.claSubmissionMethod ?? null,
      ClaRenderingPhyFID: this.claim?.renderingPhysician?.phyID ?? 0,
      ClaFacilityPhyFID: this.claim?.facilityPhysician?.phyID ?? 0
    });
  }

  ngOnDestroy(): void {
    // Drain any subscriptions if necessary (currently none).
  }

  getEmptyAdditionalData(): ClaimAdditionalData {
    return {
      customTextValue: null,
      customCurrencyValue: null,
      customDateValue: null,
      customNumberValue: null,
      customTrueFalseValue: false,
      externalId: null,
      paymentMatchingKey: null
    };
  }

  toggleSection(section: keyof typeof this.sectionsState): void {
    this.sectionsState[section] = !this.sectionsState[section];
    this.cdr.markForCheck();
  }

  loadClaim(claId: number): void {
    if (this.claimRequestInFlight) return;
    this.loading = true;
    this.error = null;
    this.claimRequestInFlight = true;

    this.claimApiService.getClaimById(claId).pipe(
      finalize(() => {
        this.loading = false;
        this.claimRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (claim: Claim) => {
        this.claim = claim;
        if (!this.claim.additionalData) {
          this.claim.additionalData = this.getEmptyAdditionalData();
        }
        const patId = claim.patient?.patID;
        this.ribbonContext.setContext({ claimId: claId, patientId: patId ?? null });
        this.ensureCurrentStatusInOptions();
        this.ensureCurrentClassificationInOptions();
        this.ensureCurrentPhysiciansInOptions();
        this.patchClaimForm();
      },
      error: (err) => {
        if (err.status === 404) {
          this.error = `Claim ${claId} not found.`;
        } else if (err.status === 503) {
          this.error = 'The server is taking too long to respond. Please try again.';
        } else if (err.status === 500) {
          this.error = 'An error occurred while loading the claim. Please try again.';
        } else {
          this.error = 'Failed to load claim details.';
        }
        console.error('Error loading claim:', err);
      }
    });
  }

  loadServiceLines(): void {
    if (!this.claId || this.serviceRequestInFlight || this.serviceLoaded) return;
    this.serviceLoading = true;
    this.serviceRequestInFlight = true;

    this.serviceApi.getServicesByClaim(this.claId).pipe(
      finalize(() => {
        this.serviceLoading = false;
        this.serviceRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res: any) => {
        this.serviceLines = Array.isArray(res) ? res : (res?.data ?? []) || [];
        this.serviceLoaded = true;
        this.selectedServiceLineId = this.serviceLines[0]?.srvID ?? null;
      },
      error: (err) => {
        console.error('Error loading service lines:', err);
        this.serviceLines = [];
      }
    });
  }

  selectServiceLine(line: any): void {
    this.selectedServiceLineId = line.srvID;
    this.cdr.markForCheck();
  }

  trackByServiceLine(index: number, item: any): number {
    return item.srvID;
  }

  /** Safe array for *ngFor - API may return wrapped { data: [] } */
  get serviceLinesArray(): any[] {
    return Array.isArray(this.serviceLines) ? this.serviceLines : [];
  }

  trackByPayment(index: number, item: any): number {
    return item.pmtID || index;
  }

  trackByAdjustment(index: number, item: any): number {
    return item.AdjID || index;
  }

  trackByDisbursement(index: number, item: any): number {
    return item.DisbID || index;
  }

  onSecondaryTabChange(tab: 'payments' | 'adjustments' | 'disbursements'): void {
    if (this.secondaryTab === tab) return;
    this.secondaryTab = tab;
    if (!this.claId) return;

    if (tab === 'payments' && !this.secondaryLoaded.payments && !this.loadingPayments && !this.paymentRequestInFlight) {
      this.loadPayments();
    } else if (tab === 'adjustments' && !this.secondaryLoaded.adjustments && !this.loadingAdjustments && !this.adjustmentRequestInFlight) {
      this.loadAdjustments();
    } else if (tab === 'disbursements' && !this.secondaryLoaded.disbursements && !this.loadingDisbursements && !this.disbursementRequestInFlight) {
      this.loadDisbursements();
    }
    this.cdr.markForCheck();
  }

  loadPayments(): void {
    if (!this.claId || this.paymentRequestInFlight) return;
    this.loadingPayments = true;
    this.paymentRequestInFlight = true;

    this.paymentApi.getPaymentsByClaim(this.claId).pipe(
      finalize(() => {
        this.loadingPayments = false;
        this.paymentRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (payments: any[]) => {
        this.payments = payments || [];
        this.secondaryLoaded.payments = true;
      },
      error: (err) => {
        console.error('Error loading payments:', err);
        this.payments = [];
      }
    });
  }

  loadAdjustments(): void {
    if (!this.claId || this.adjustmentRequestInFlight) return;
    this.loadingAdjustments = true;
    this.adjustmentRequestInFlight = true;

    this.adjustmentApi.getAdjustmentsByClaim(this.claId).pipe(
      finalize(() => {
        this.loadingAdjustments = false;
        this.adjustmentRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (adjustments: any[]) => {
        this.adjustments = adjustments || [];
        this.secondaryLoaded.adjustments = true;
      },
      error: (err) => {
        console.error('Error loading adjustments:', err);
        this.adjustments = [];
      }
    });
  }

  loadDisbursements(): void {
    if (!this.claId || this.disbursementRequestInFlight) return;
    this.loadingDisbursements = true;
    this.disbursementRequestInFlight = true;

    this.disbursementApi.getDisbursementsByClaim(this.claId).pipe(
      finalize(() => {
        this.loadingDisbursements = false;
        this.disbursementRequestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (disbursements: any[]) => {
        this.disbursements = disbursements || [];
        this.secondaryLoaded.disbursements = true;
      },
      error: (err) => {
        console.error('Error loading disbursements:', err);
        this.disbursements = [];
      }
    });
  }

  goBackToList(): void {
    this.router.navigate(['/claims/find-claim']);
  }

  addServiceLine(): void {
    console.log('Add service line clicked');
  }

  saveAndClose(): void {
    if (!this.claim || !this.claId) {
      this.goBackToList();
      return;
    }
    const claStatus = this.claimForm.get('ClaStatus')?.value ?? null;
    const claClassification = this.claimForm.get('ClaClassification')?.value ?? null;
    const claSubmissionMethod = this.claimForm.get('ClaSubmissionMethod')?.value ?? null;
    const claRenderingPhyFID = this.claimForm.get('ClaRenderingPhyFID')?.value ?? null;
    const claFacilityPhyFID = this.claimForm.get('ClaFacilityPhyFID')?.value ?? null;
    const noteText = this.newNote?.trim() || null;
    this.claimApiService.updateClaim(this.claId, {
      claStatus: claStatus || null,
      claClassification: claClassification || null,
      claSubmissionMethod: claSubmissionMethod ?? null,
      claRenderingPhyFID,
      claFacilityPhyFID,
      claInvoiceNumber: this.claim.claInvoiceNumber ?? null,
      claAdmittedDate: this.claim.claAdmittedDate ?? null,
      claDischargedDate: this.claim.claDischargedDate ?? null,
      claDateLastSeen: this.claim.claDateLastSeen ?? null,
      claEDINotes: this.claim.claEDINotes ?? null,
      claRemarks: this.claim.claRemarks ?? null,
      claRelatedTo: this.claim.claRelatedTo ?? null,
      claRelatedToState: this.claim.claRelatedToState ?? null,
      claLocked: this.claim.claLocked,
      claDelayCode: this.claim.claDelayCode ?? null,
      claMedicaidResubmissionCode: this.claim.claMedicaidResubmissionCode ?? null,
      claOriginalRefNo: this.claim.claOriginalRefNo ?? null,
      claPaperWorkTransmissionCode: this.claim.claPaperWorkTransmissionCode ?? null,
      claPaperWorkControlNumber: this.claim.claPaperWorkControlNumber ?? null,
      claPaperWorkInd: this.claim.claPaperWorkInd ?? null,
      noteText,
      additionalData: this.claim.additionalData ?? undefined
    }).subscribe({
      next: () => {
        if (this.claim) {
          this.claim.claStatus = claStatus;
          this.claim.claClassification = claClassification;
          this.claim.claSubmissionMethod = claSubmissionMethod;
          this.updateClaimPhysicianRefs(claRenderingPhyFID, claFacilityPhyFID);
        }
        this.newNote = '';
        this.goBackToList();
      },
      error: (err) => {
        console.error('Failed to save claim', err);
        alert('Failed to save claim');
      }
    });
  }

  save(): void {
    if (!this.claim || !this.claId) return;
    const claStatus = this.claimForm.get('ClaStatus')?.value ?? null;
    const claClassification = this.claimForm.get('ClaClassification')?.value ?? null;
    const claSubmissionMethod = this.claimForm.get('ClaSubmissionMethod')?.value ?? null;
    const claRenderingPhyFID = this.claimForm.get('ClaRenderingPhyFID')?.value ?? null;
    const claFacilityPhyFID = this.claimForm.get('ClaFacilityPhyFID')?.value ?? null;
    const noteText = this.newNote?.trim() || null;
    this.claimApiService.updateClaim(this.claId, {
      claStatus: claStatus || null,
      claClassification: claClassification || null,
      claSubmissionMethod: claSubmissionMethod ?? null,
      claRenderingPhyFID,
      claFacilityPhyFID,
      claInvoiceNumber: this.claim.claInvoiceNumber ?? null,
      claAdmittedDate: this.claim.claAdmittedDate ?? null,
      claDischargedDate: this.claim.claDischargedDate ?? null,
      claDateLastSeen: this.claim.claDateLastSeen ?? null,
      claEDINotes: this.claim.claEDINotes ?? null,
      claRemarks: this.claim.claRemarks ?? null,
      claRelatedTo: this.claim.claRelatedTo ?? null,
      claRelatedToState: this.claim.claRelatedToState ?? null,
      claLocked: this.claim.claLocked,
      claDelayCode: this.claim.claDelayCode ?? null,
      claMedicaidResubmissionCode: this.claim.claMedicaidResubmissionCode ?? null,
      claOriginalRefNo: this.claim.claOriginalRefNo ?? null,
      claPaperWorkTransmissionCode: this.claim.claPaperWorkTransmissionCode ?? null,
      claPaperWorkControlNumber: this.claim.claPaperWorkControlNumber ?? null,
      claPaperWorkInd: this.claim.claPaperWorkInd ?? null,
      noteText,
      additionalData: this.claim.additionalData ?? undefined
    }).subscribe({
      next: () => {
        if (this.claim) {
          this.claim.claStatus = claStatus;
          this.claim.claClassification = claClassification;
          this.claim.claSubmissionMethod = claSubmissionMethod;
          this.updateClaimPhysicianRefs(claRenderingPhyFID, claFacilityPhyFID);
        }
        this.newNote = '';
        if (this.claId) this.loadClaim(this.claId);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to save claim', err);
        alert('Failed to save claim');
      }
    });
  }

  close(): void {
    this.goBackToList();
  }

  deleteClaim(): void {
    if (confirm('Are you sure you want to delete this claim?')) {
      console.log('Delete clicked');
    }
  }

  scrub(): void {
    console.log('Scrub clicked');
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return value;
    }
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return value;
    }
  }

  getPatientName(): string {
    if (!this.claim?.patient) return 'Unknown Patient';
    const firstName = this.claim.patient.patFirstName || '';
    const lastName = this.claim.patient.patLastName || '';
    if (firstName || lastName) {
      return `${lastName.toUpperCase()}, ${firstName}`.trim();
    }
    return this.claim.patient.patFullNameCC || 'Unknown Patient';
  }

  getBillToText(): string {
    if (!this.claim) return '';
    const billTo = this.claim.claBillTo;
    if (billTo === 0) return 'Patient';
    if (billTo === 1) return 'Primary';
    if (billTo === 2) return 'Final (F/2)';
    return `Bill To ${billTo}`;
  }

  getServiceTotalCharges(): number {
    const lines = Array.isArray(this.serviceLines) ? this.serviceLines : [];
    return lines.reduce((sum, line) => sum + (line.srvCharges || 0), 0);
  }

  getServiceTotalPaid(): number {
    const lines = Array.isArray(this.serviceLines) ? this.serviceLines : [];
    return lines.reduce((sum, line) => sum + (line.srvTotalAmtPaidCC || 0), 0);
  }

  getServiceTotalBalance(): number {
    const lines = Array.isArray(this.serviceLines) ? this.serviceLines : [];
    return lines.reduce((sum, line) => sum + (line.srvTotalBalanceCC || 0), 0);
  }

  /** Notes/activity from Claim_Audit (claim-specific: Claim Created, Claim Edited, Payment Applied, Manual Notes) */
  getNotesHistory(): Array<{ date: string; user: string; content: string; totalCharge?: number | null; insuranceBalance?: number | null; patientBalance?: number | null }> {
    const activity = this.claim?.claimActivity ?? [];
    return activity.map(a => ({
      date: a.date,
      user: a.user,
      content: a.notes || a.activityType,
      totalCharge: a.totalCharge ?? null,
      insuranceBalance: a.insuranceBalance ?? null,
      patientBalance: a.patientBalance ?? null
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  toggleNotes(): void {
    this.showNotes = !this.showNotes;
    this.cdr.markForCheck();
  }

  addNote(event: Event): void {
    event.preventDefault();
    if (this.newNote.trim()) {
      console.log('Adding note:', this.newNote);
      this.newNote = '';
      this.cdr.markForCheck();
    }
  }
}
