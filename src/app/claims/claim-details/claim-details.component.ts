import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, filter, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ClaimApiService, ScrubResult } from '../../core/services/claim-api.service';
import { Claim, ClaimAdditionalData } from '../../core/services/claim.models';
import { ListApiService, ListValueDto } from '../../core/services/list-api.service';
import { CLAIM_STATUS_OPTIONS, ClaimStatusOption } from '../../shared/constants/claim-status';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { PhysicianListItem } from '../../core/services/physician.models';
import { AdjustmentApiService } from '../../core/services/adjustment-api.service';
import { DisbursementApiService } from '../../core/services/disbursement-api.service';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { ServiceApiService } from '../../core/services/service-api.service';
import { RibbonContextService } from '../../core/services/ribbon-context.service';
import { CustomFieldsApiService, CustomFieldDefinitionDto } from '../../core/services/custom-fields-api.service';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { ProcedureCode, ProcedureCodesApiService } from '../../core/services/procedure-codes-api.service';
import { PatientApiService } from '../../core/services/patient-api.service';
import { PatientDetail } from '../../core/services/patient.models';

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
  /** Canonical claim statuses (shared with Program Setup). Legacy DB values appended in ensureCurrentStatusInOptions. */
  claimStatuses: ClaimStatusOption[] = [...CLAIM_STATUS_OPTIONS];

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
    additionalData: true,
    customFields: true
  };

  /** Claim-level custom field definitions and values. */
  claimCustomFieldDefinitions: CustomFieldDefinitionDto[] = [];
  claimCustomFieldValues: Record<string, string> = {};
  /** Service line custom field definitions; values keyed by srvID. */
  serviceLineCustomFieldDefinitions: CustomFieldDefinitionDto[] = [];
  serviceLineCustomValuesBySrvId: Record<number, Record<string, string>> = {};

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
  editingServiceLineIds = new Set<number>();
  serviceLineDrafts: Record<number, any> = {};
  nextTempServiceLineId = -1;
  showProcedureLookupDialog = false;
  procedureLookupServiceLineId: number | null = null;
  procedureLookupKeyword = '';
  procedureLookupLoading = false;
  procedureLookupResults: Array<{ code: string; description: string }> = [];

  scrubResults: ScrubResult[] = [];
  scrubError: string | null = null;

  /** Responsible party payer options (from claim insureds). */
  primaryPayerId: number | null = null;
  primaryPayerName: string | null = null;
  secondaryPayerId: number | null = null;
  secondaryPayerName: string | null = null;

  private claimRequestInFlight = false;
  private serviceRequestInFlight = false;
  private readonly destroy$ = new Subject<void>();
  private paymentRequestInFlight = false;
  private adjustmentRequestInFlight = false;
  private disbursementRequestInFlight = false;
  private responsibleRequestInFlight = false;

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
    private procedureCodesApi: ProcedureCodesApiService,
    private customFieldsApi: CustomFieldsApiService,
    private workspace: WorkspaceService,
    private cdr: ChangeDetectorRef,
    private patientApi: PatientApiService
  ) { }

  ngOnInit(): void {
    this.loadClassificationOptions();
    this.loadPhysicians();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.claId = +idParam;
      this.loadClaim(this.claId);
    } else {
      this.error = 'Invalid claim ID';
    }

    // Route reuse (workspace tabs): returning from Payment Entry does not re-run ngOnInit — refresh lines from DB.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        if (!this.claId || this.claId <= 0) return;
        if (this.loading || this.claimRequestInFlight) return;
        const url = e.urlAfterRedirects || '';
        if (!this.isUrlForThisClaim(url)) return;
        this.refreshServiceLinesFromApi();
        this.refreshResponsiblePayerOptionsFromPatient();
      });
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

  /** Ensure the claim's current ClaStatus appears in dropdown (legacy DB values until corrected). */
  private ensureCurrentStatusInOptions(): void {
    if (!this.claim?.claStatus?.trim()) return;
    const current = this.claim.claStatus.trim();
    if (current === 'Imported') return;
    if (!this.claimStatuses.some(o => o.value === current)) {
      this.claimStatuses = [...this.claimStatuses, { value: current, label: current }].sort((a, b) =>
        (a.value || '').localeCompare(b.value || '')
      );
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isUrlForThisClaim(url: string): boolean {
    if (!this.claId) return false;
    return new RegExp(`/claims/${this.claId}(?:[/?#]|$)`).test(url);
  }

  /**
   * Merge GET /api/services/claims/{id} rows over embedded claim lines so totals stay current
   * while preserving fields not returned by the services endpoint (e.g. responsiblePartyName, place).
   */
  private applyFreshServiceLines(fresh: any[], embedded: any[]): void {
    const embeddedById = new Map<number, any>();
    for (const row of embedded ?? []) {
      const id = row?.srvID ?? row?.srvId;
      if (id != null && id > 0) embeddedById.set(Number(id), row);
    }

    this.serviceLines = (fresh ?? []).map((line) => {
      const id = Number(line?.srvID ?? line?.srvId ?? 0);
      const base = id > 0 ? embeddedById.get(id) : undefined;
      return this.normalizeServiceLine({ ...(base ?? {}), ...line });
    });

    if (this.claim) {
      this.claim.serviceLines = this.serviceLines as Claim['serviceLines'];
    }

    this.serviceLoaded = true;
    const sel = this.selectedServiceLineId;
    if (sel != null && !this.serviceLines.some((l) => l.srvID === sel)) {
      this.selectedServiceLineId = this.serviceLines[0]?.srvID ?? null;
    } else if (sel == null && this.serviceLines.length > 0) {
      this.selectedServiceLineId = this.serviceLines[0]?.srvID ?? null;
    }

    if (this.selectedServiceLineId != null) {
      this.loadServiceLineCustomValuesFor(this.selectedServiceLineId);
    }
    this.cdr.markForCheck();
  }

  private refreshServiceLinesFromApi(): void {
    if (!this.claId || this.serviceRequestInFlight) return;
    this.serviceRequestInFlight = true;
    this.serviceLoading = true;
    this.serviceApi
      .getServicesByClaim(this.claId)
      .pipe(
        finalize(() => {
          this.serviceRequestInFlight = false;
          this.serviceLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (rows) => this.applyFreshServiceLines(rows ?? [], this.serviceLines),
        error: (err) => {
          console.error('Failed to refresh service lines', err);
        }
      });
  }

  private refreshResponsiblePayerOptionsFromPatient(): void {
    if (this.responsibleRequestInFlight) return;
    const patId = this.claim?.patient?.patID;
    if (!patId || patId <= 0) return;
    this.responsibleRequestInFlight = true;

    this.patientApi.getPatientById(patId).subscribe({
      next: (patient) => {
        this.loadResponsiblePayerOptionsFromPatient(patient);
        this.responsibleRequestInFlight = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.responsibleRequestInFlight = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadResponsiblePayerOptionsFromClaim(claim: Claim): void {
    // ClaimsController returns ClaimInsured; it's not strongly typed in our Claim model,
    // so we access it as `any`.
    const anyClaim = claim as any;
    const insureds = anyClaim?.claimInsured ?? anyClaim?.ClaimInsured ?? [];
    if (!Array.isArray(insureds)) {
      this.primaryPayerId = null;
      this.primaryPayerName = null;
      this.secondaryPayerId = null;
      this.secondaryPayerName = null;
      return;
    }

    const parsed = insureds
      .map((i: any) => {
        const seq = Number(i?.claInsSequence ?? i?.claInsSeq ?? 0);
        const payId = Number(i?.claInsPayFID ?? i?.claInsPayFid ?? i?.claInsPayId ?? 0);
        const name = i?.payerName ?? i?.PayerName ?? null;
        return { seq, payId, name };
      })
      .filter(x => x.payId > 0);

    parsed.sort((a, b) => a.seq - b.seq);

    const primary =
      parsed.find(x => x.seq === 1) ??
      parsed[0] ??
      null;

    const secondary =
      parsed.find(x => x.seq === 2) ??
      parsed.find(x => primary && x.payId !== primary.payId) ??
      parsed[1] ??
      null;

    this.primaryPayerId = primary?.payId ?? null;
    this.primaryPayerName = primary?.name ?? null;
    this.secondaryPayerId = secondary?.payId ?? null;
    this.secondaryPayerName = secondary?.name ?? null;
  }

  private loadResponsiblePayerOptionsFromPatient(patient: PatientDetail): void {
    const primary =
      patient.primaryInsurance ??
      patient.insuranceList?.find((i) => i.patInsSequence === 1) ??
      null;

    const secondary =
      patient.secondaryInsurance ??
      patient.insuranceList?.find((i) => i.patInsSequence === 2) ??
      null;

    this.primaryPayerId = primary?.payID ?? null;
    this.primaryPayerName = primary?.payerName ?? null;

    this.secondaryPayerId = secondary?.payID ?? null;
    this.secondaryPayerName = secondary?.payerName ?? null;
  }

  getResponsiblePartyLabel(payerId: number | null | undefined): string {
    const id = payerId != null ? Number(payerId) : 0;
    if (!id) return 'Patient';
    if (this.primaryPayerId && id === this.primaryPayerId) return `Primary payer - ${this.primaryPayerName ?? ''}`.trim();
    if (this.secondaryPayerId && id === this.secondaryPayerId) return `Secondary payer - ${this.secondaryPayerName ?? ''}`.trim();
    // Unknown payer ID: show Patient to avoid displaying raw IDs in UI.
    return 'Patient';
  }

  onResponsiblePartyChanged(line: any): void {
    const id = Number(line?.srvResponsibleParty ?? 0);
    if (!id) {
      line.responsiblePartyName = null;
      return;
    }
    if (this.primaryPayerId && id === this.primaryPayerId) {
      line.responsiblePartyName = this.primaryPayerName;
      return;
    }
    if (this.secondaryPayerId && id === this.secondaryPayerId) {
      line.responsiblePartyName = this.secondaryPayerName;
      return;
    }
    line.responsiblePartyName = null;
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

    forkJoin({
      claim: this.claimApiService.getClaimById(claId),
      services: this.serviceApi.getServicesByClaim(claId).pipe(
        catchError((e) => {
          console.warn('GET /api/services/claims failed; falling back to claim payload for service lines', e);
          return of(undefined);
        })
      )
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.claimRequestInFlight = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ claim, services }) => {
          this.claimStatuses = [...CLAIM_STATUS_OPTIONS];
          this.claim = claim;
          if (!this.claim.additionalData) {
            this.claim.additionalData = this.getEmptyAdditionalData();
          }
          const patId = claim.patient?.patID;
          this.ribbonContext.setContext({ claimId: claId, patientId: patId ?? null });
          const title = this.toFullName(
            claim.patient?.patFirstName,
            claim.patient?.patLastName,
            claim.patient?.patFullNameCC
          );
          if (title) this.workspace.updateActiveTabTitle(title);
          this.ensureCurrentStatusInOptions();
          this.ensureCurrentClassificationInOptions();
          this.ensureCurrentPhysiciansInOptions();
          this.loadResponsiblePayerOptionsFromClaim(claim);
          this.patchClaimForm();
          const embedded = claim.serviceLines ?? [];
          const fresh = services !== undefined ? (services ?? []) : embedded;
          this.applyFreshServiceLines(fresh, embedded);
          this.loadClaimCustomFieldsAndValues(claId);

          // Override payer names/options with current patient insurance snapshot.
          // This fixes stale "Primary payer - <old payer>" labels when patient insurance changes.
          if (patId && patId > 0) {
            this.patientApi.getPatientById(patId).subscribe({
              next: (patient) => {
                this.loadResponsiblePayerOptionsFromPatient(patient);
                this.cdr.markForCheck();
              },
              error: () => {
                // Keep claim snapshot fallback if patient insurance fails.
                this.cdr.markForCheck();
              }
            });
          }
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

  private toFullName(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
    fallback: string | null | undefined
  ): string {
    const fn = (firstName ?? '').trim();
    const ln = (lastName ?? '').trim();
    const full = [fn, ln].filter(Boolean).join(' ').trim();
    return full || (fallback ?? '').trim();
  }

  selectServiceLine(line: any): void {
    this.selectedServiceLineId = line.srvID;
    this.loadServiceLineCustomValuesFor(line.srvID);
    this.cdr.markForCheck();
  }

  private loadClaimCustomFieldsAndValues(claId: number): void {
    this.customFieldsApi.getByEntityType('Claim').subscribe({
      next: defs => {
        this.claimCustomFieldDefinitions = defs ?? [];
        this.customFieldsApi.getValues('Claim', claId).subscribe({
          next: values => { this.claimCustomFieldValues = { ...values }; this.cdr.markForCheck(); },
          error: () => { this.claimCustomFieldValues = {}; this.cdr.markForCheck(); }
        });
        this.cdr.markForCheck();
      },
      error: () => { this.claimCustomFieldDefinitions = []; this.cdr.markForCheck(); }
    });
    this.customFieldsApi.getByEntityType('ServiceLine').subscribe({
      next: defs => {
        this.serviceLineCustomFieldDefinitions = defs ?? [];
        this.cdr.markForCheck();
      },
      error: () => { this.serviceLineCustomFieldDefinitions = []; this.cdr.markForCheck(); }
    });
  }

  private loadServiceLineCustomValuesFor(srvID: number): void {
    if (this.serviceLineCustomValuesBySrvId[srvID]) return;
    this.customFieldsApi.getValues('ServiceLine', srvID).subscribe({
      next: values => {
        this.serviceLineCustomValuesBySrvId = { ...this.serviceLineCustomValuesBySrvId, [srvID]: { ...values } };
        this.cdr.markForCheck();
      },
      error: () => {
        this.serviceLineCustomValuesBySrvId = { ...this.serviceLineCustomValuesBySrvId, [srvID]: {} };
        this.cdr.markForCheck();
      }
    });
  }

  getClaimCustomFieldValue(fieldKey: string): string {
    return this.claimCustomFieldValues[fieldKey] ?? '';
  }

  setClaimCustomFieldValue(fieldKey: string, value: string): void {
    this.claimCustomFieldValues = { ...this.claimCustomFieldValues, [fieldKey]: value };
    this.cdr.markForCheck();
  }

  getServiceLineCustomValue(srvID: number, fieldKey: string): string {
    const row = this.serviceLineCustomValuesBySrvId[srvID];
    return row?.[fieldKey] ?? '';
  }

  setServiceLineCustomValue(srvID: number, fieldKey: string, value: string): void {
    const row = { ...(this.serviceLineCustomValuesBySrvId[srvID] ?? {}), [fieldKey]: value };
    this.serviceLineCustomValuesBySrvId = { ...this.serviceLineCustomValuesBySrvId, [srvID]: row };
    this.cdr.markForCheck();
  }

  private saveClaimCustomFieldValues(): void {
    const claId = this.claId;
    if (claId == null) return;
    this.claimCustomFieldDefinitions.forEach(def => {
      const value = this.claimCustomFieldValues[def.fieldKey] ?? '';
      this.customFieldsApi.saveValue({
        entityType: 'Claim',
        entityId: claId,
        fieldKey: def.fieldKey,
        value: value || null
      }).subscribe({ error: () => {} });
    });
    Object.keys(this.serviceLineCustomValuesBySrvId).forEach(srvIdStr => {
      const srvID = +srvIdStr;
      const row = this.serviceLineCustomValuesBySrvId[srvID] ?? {};
      this.serviceLineCustomFieldDefinitions.forEach(def => {
        const value = row[def.fieldKey] ?? '';
        this.customFieldsApi.saveValue({
          entityType: 'ServiceLine',
          entityId: srvID,
          fieldKey: def.fieldKey,
          value: value || null
        }).subscribe({ error: () => {} });
      });
    });
  }

  trackByServiceLine(index: number, item: any): number {
    return item.srvID;
  }

  trackBySrvId(index: number, row: any): number {
    return row.srvID;
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
    this.workspace.closeCurrentTab();
  }

  addServiceLine(): void {
    if (!this.claId || this.serviceLoading) return;
    const selected = this.serviceLinesArray.find(l => l.srvID === this.selectedServiceLineId) ?? null;
    const previous = selected ?? this.serviceLinesArray[0] ?? null;
    const previousFrom = previous?.srvFromDate ? this.toDateInputValue(previous.srvFromDate) : '';
    const previousTo = previous?.srvToDate ? this.toDateInputValue(previous.srvToDate) : '';
    const baseDate = this.claim?.claBillDate ? this.toDateInputValue(this.claim.claBillDate) : '';
    const defaultFromDate = previousFrom || previousTo || baseDate || null;
    const defaultToDate = previousTo || previousFrom || baseDate || null;
    const previousResponsible = Number(previous?.srvResponsibleParty ?? 0);
    const defaultResponsibleParty = previousResponsible > 0
      ? previousResponsible
      : (this.primaryPayerId ?? null);
    const tempId = this.nextTempServiceLineId--;
    const row = this.normalizeServiceLine({
      srvID: tempId,
      srvClaFID: this.claId,
      srvFromDate: defaultFromDate,
      srvToDate: defaultToDate,
      srvProcedureCode: '',
      srvModifier1: '',
      srvModifier2: '',
      srvModifier3: '',
      srvModifier4: '',
      srvUnits: 1,
      srvCharges: 0,
      srvAllowedAmt: 0,
      srvTotalInsAmtPaidTRIG: 0,
      srvTotalPatAmtPaidTRIG: 0,
      srvTotalBalanceCC: 0,
      // Default Responsible should follow the previous line, otherwise primary payer.
      srvResponsibleParty: defaultResponsibleParty,
      srvDesc: '',
      srvNationalDrugCode: '',
      srvDrugUnitCount: null,
      srvDrugUnitMeasurement: '',
      srvPrescriptionNumber: '',
      isNew: true
    });
    this.serviceLines = [row, ...this.serviceLinesArray];
    this.selectedServiceLineId = tempId;
    this.startEditServiceLine(row);
    this.cdr.markForCheck();
  }

  canAddServiceLine(): boolean {
    const lines = this.serviceLinesArray;
    if (lines.length === 0) return true;
    const selected = lines.find(l => l.srvID === this.selectedServiceLineId) ?? lines[0];
    return !!selected?.srvFromDate;
  }

  startEditServiceLine(line: any): void {
    this.editingServiceLineIds.add(line.srvID);
    this.serviceLineDrafts[line.srvID] = JSON.parse(JSON.stringify(line));
    this.initServiceLineUnitBaseline(line);
  }

  cancelEditServiceLine(line: any): void {
    const draft = this.serviceLineDrafts[line.srvID];
    if (line?.isNew) {
      this.serviceLines = this.serviceLinesArray.filter(l => l.srvID !== line.srvID);
      this.editingServiceLineIds.delete(line.srvID);
      delete this.serviceLineDrafts[line.srvID];
      this.selectedServiceLineId = this.serviceLinesArray[0]?.srvID ?? null;
      this.cdr.markForCheck();
      return;
    }
    if (draft) {
      Object.assign(line, draft);
    }
    this.editingServiceLineIds.delete(line.srvID);
    delete this.serviceLineDrafts[line.srvID];
    this.cdr.markForCheck();
  }

  isEditingServiceLine(line: any): boolean {
    return this.editingServiceLineIds.has(line.srvID);
  }

  saveServiceLine(line: any): void {
    if (!this.claId) return;
    const draftPayload = this.toServiceLinePayload(line);
    if (!draftPayload.srvFromDate) {
      alert('DOS From is required.');
      return;
    }

    const code = this.normalizeProcedureCodeInput(line.srvProcedureCode);
    if (code !== line.srvProcedureCode) {
      line.srvProcedureCode = code;
    }

    const charge = Number(line?.srvCharges ?? 0);
    const needsProcedureHydrateBeforeSave = !!code && (!Number.isFinite(charge) || charge <= 0);
    const afterHydrate$ = needsProcedureHydrateBeforeSave
      ? this.fetchProcedureAndHydrateLine(line, code)
      : of(null);

    afterHydrate$
      .pipe(
        switchMap(() => {
          const payload = this.toServiceLinePayload(line);
          return line.isNew
            ? this.serviceApi.createServiceLine(this.claId!, payload)
            : this.serviceApi.updateServiceLine(this.claId!, line.srvID, payload);
        }),
        finalize(() => this.cdr.markForCheck())
      )
      .subscribe({
        next: (res: any) => {
          const updated = this.normalizeServiceLine(res?.data ?? res);
          if (line.isNew) {
            this.serviceLines = this.serviceLinesArray.map(l => l.srvID === line.srvID ? updated : l);
          } else {
            Object.assign(line, updated);
          }
          this.editingServiceLineIds.delete(updated.srvID);
          delete this.serviceLineDrafts[line.srvID];
          this.selectedServiceLineId = updated.srvID;
        },
        error: (err) => {
          console.error('Failed to save service line', err);
          alert('Failed to save service line.');
        }
      });
  }

  deleteServiceLine(line: any): void {
    if (!this.claId) return;
    if (line?.isNew) {
      this.serviceLines = this.serviceLinesArray.filter(l => l.srvID !== line.srvID);
      this.cdr.markForCheck();
      return;
    }
    if (!confirm('Delete this service line?')) return;
    this.serviceApi.deleteServiceLine(this.claId, line.srvID).subscribe({
      next: () => {
        this.serviceLines = this.serviceLinesArray.filter(l => l.srvID !== line.srvID);
        this.selectedServiceLineId = this.serviceLinesArray[0]?.srvID ?? null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to delete service line', err);
        alert('Failed to delete service line.');
      }
    });
  }

  onServiceLineUnitsChanged(line: any): void {
    const newUnits = line.srvUnits != null && Number(line.srvUnits) > 0 ? Number(line.srvUnits) : 1;
    const oldUnits = Number(line._prevServiceLineUnits);
    if (!Number.isFinite(oldUnits) || oldUnits <= 0) {
      line._prevServiceLineUnits = newUnits;
      return;
    }
    if (oldUnits === newUnits) return;
    const charge = Number(line.srvCharges ?? 0);
    const allowed = Number(line.srvAllowedAmt ?? 0);
    line.srvCharges = Number(((charge / oldUnits) * newUnits).toFixed(2));
    line.srvAllowedAmt = Number(((allowed / oldUnits) * newUnits).toFixed(2));
    line._prevServiceLineUnits = newUnits;
  }

  openProcedureLookup(line: any): void {
    if (!this.isEditingServiceLine(line)) return;
    this.procedureLookupServiceLineId = line.srvID;
    this.showProcedureLookupDialog = true;
    this.procedureLookupKeyword = line.srvProcedureCode || '';
    this.procedureLookupResults = [];
    this.searchProcedureLookup();
  }

  searchProcedureLookup(): void {
    const q = (this.procedureLookupKeyword || '').trim();
    if (!q) {
      this.procedureLookupResults = [];
      return;
    }
    this.procedureLookupLoading = true;
    this.procedureCodesApi.getPaged(1, 30, { code: q }).subscribe({
      next: (res) => {
        const items = res?.items ?? [];
        this.procedureLookupResults = items.map(i => ({ code: i.procCode, description: i.procDescription || '' }));
        this.procedureLookupLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.procedureLookupResults = [];
        this.procedureLookupLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onProcedureLookupSelect(item: { code: string; description?: string }): void {
    const targetId = this.procedureLookupServiceLineId;
    const line = this.serviceLinesArray.find(l => l.srvID === targetId);
    if (!line || !item?.code) {
      this.closeProcedureLookup();
      return;
    }
    line.srvProcedureCode = item.code;
    this.applyProcedureCodeToServiceLine(line, item.code);

    this.closeProcedureLookup();
  }

  onServiceLineProcedureCodeChanged(line: any): void {
    const raw = line?.srvProcedureCode;
    const code = this.normalizeProcedureCodeInput(typeof raw === 'string' ? raw : String(raw ?? ''));
    if (code !== line.srvProcedureCode) {
      line.srvProcedureCode = code;
    }
    if (!code) return;
    this.applyProcedureCodeToServiceLine(line, code);
  }

  /** Paste updates ngModel after the event; re-resolve charge on the next tick. */
  onServiceLineProcedureCodePaste(line: any): void {
    setTimeout(() => {
      this.onServiceLineProcedureCodeChanged(line);
      this.cdr.markForCheck();
    }, 0);
  }

  /** Some browsers fire `input` for paste before ngModel syncs — handle insertFromPaste explicitly. */
  onServiceLineProcedureCodeInput(line: any, ev: Event): void {
    const ie = ev as InputEvent;
    if (ie.inputType !== 'insertFromPaste' && ie.inputType !== 'insertReplacementText') {
      return;
    }
    const el = ie.target as HTMLInputElement | null;
    const v = this.normalizeProcedureCodeInput(el?.value ?? '');
    line.srvProcedureCode = v;
    if (v) {
      this.applyProcedureCodeToServiceLine(line, v);
    }
    this.cdr.markForCheck();
  }

  /** Last-charge sync when leaving the field (covers missed events under OnPush). */
  onServiceLineProcedureCodeBlur(line: any): void {
    this.onServiceLineProcedureCodeChanged(line);
  }

  private normalizeProcedureCodeInput(raw: string): string {
    return String(raw ?? '')
      .replace(/\r?\n/g, '')
      .trim();
  }

  private fetchProcedureAndHydrateLine(line: any, rawCode: string) {
    const code = this.normalizeProcedureCodeInput(rawCode);
    if (!code) return of(null);
    return this.procedureCodesApi.getByCode(code).pipe(
      tap((proc) => this.hydrateLineFromProcedure(line, proc)),
      catchError((err) => {
        console.error('Failed to load procedure code', err);
        return of(null);
      })
    );
  }

  private hydrateLineFromProcedure(line: any, proc: ProcedureCode | null | undefined): void {
    if (!proc) return;
    line.srvProcedureCode = proc.procCode ?? line.srvProcedureCode;
    const currentUnits = Number(line.srvUnits ?? 0);
    // Default 1 unit for new/pasted codes — not procedure-library default units (often 5).
    const unitsToUse = currentUnits > 0 ? currentUnits : 1;
    line.srvUnits = unitsToUse;

    // Procedure fee/allowed are per unit; scale by line units.
    const defaultCharge = proc.procCharge ?? 0;
    const defaultAllowed = proc.procAllowed ?? 0;
    line.srvCharges = Number((defaultCharge * unitsToUse).toFixed(2));
    line.srvAllowedAmt = Number((defaultAllowed * unitsToUse).toFixed(2));
    line.srvModifier1 = proc.procModifier1 ?? '';
    line.srvModifier2 = proc.procModifier2 ?? '';
    line.srvModifier3 = proc.procModifier3 ?? '';
    line.srvModifier4 = proc.procModifier4 ?? '';
    line.srvDesc = proc.procDescription ?? line.srvDesc ?? '';
    this.initServiceLineUnitBaseline(line);
  }

  /** Baseline for scaling charges when units change (draft is stale after procedure hydrate). */
  private initServiceLineUnitBaseline(line: any): void {
    const u = line.srvUnits != null && Number(line.srvUnits) > 0 ? Number(line.srvUnits) : 1;
    line._prevServiceLineUnits = u;
  }

  private applyProcedureCodeToServiceLine(line: any, procedureCode: string): void {
    this.fetchProcedureAndHydrateLine(line, procedureCode).subscribe({
      next: () => this.cdr.markForCheck(),
      error: () => this.cdr.markForCheck()
    });
  }

  closeProcedureLookup(): void {
    this.showProcedureLookupDialog = false;
    this.procedureLookupServiceLineId = null;
    this.procedureLookupKeyword = '';
    this.procedureLookupResults = [];
  }

  private normalizeServiceLine(line: any): any {
    const existingResponsiblePartyId = Number(line?.srvResponsibleParty ?? 0);
    let srvResponsibleParty = existingResponsiblePartyId;
    let responsiblePartyName = line?.responsiblePartyName ?? null;

    // Do NOT auto-mutate srvResponsibleParty on load.
    // The stored value (payerId or 0 for patient) should remain stable even if
    // patient insurance changes; we only use it to select the right dropdown label.

    return {
      ...line,
      srvFromDate: this.toDateInputValue(line?.srvFromDate),
      srvToDate: this.toDateInputValue(line?.srvToDate),
      srvUnits: line?.srvUnits ?? 1,
      srvCharges: line?.srvCharges ?? 0,
      srvAllowedAmt: line?.srvAllowedAmt ?? 0,
      srvTotalInsAmtPaidTRIG: line?.srvTotalInsAmtPaidTRIG ?? line?.SrvTotalInsAmtPaidTRIG ?? 0,
      srvTotalPatAmtPaidTRIG: line?.srvTotalPatAmtPaidTRIG ?? line?.SrvTotalPatAmtPaidTRIG ?? 0,
      srvTotalAmtAppliedCC: line?.srvTotalAmtAppliedCC ?? line?.SrvTotalAmtAppliedCC ?? null,
      srvTotalBalanceCC: line?.srvTotalBalanceCC ?? line?.SrvTotalBalanceCC ?? 0,
      srvResponsibleParty,
      responsiblePartyName,
      srvModifier1: line?.srvModifier1 ?? '',
      srvModifier2: line?.srvModifier2 ?? '',
      srvModifier3: line?.srvModifier3 ?? '',
      srvModifier4: line?.srvModifier4 ?? '',
      srvNationalDrugCode: line?.srvNationalDrugCode ?? '',
      srvDrugUnitCount: line?.srvDrugUnitCount ?? null,
      srvDrugUnitMeasurement: line?.srvDrugUnitMeasurement ?? '',
      srvPrescriptionNumber: line?.srvPrescriptionNumber ?? '',
      isNew: line?.isNew ?? false
    };
  }

  private toServiceLinePayload(line: any): any {
    const responsibleParty = Number(line?.srvResponsibleParty ?? 0);
    return {
      srvFromDate: line.srvFromDate || null,
      srvToDate: line.srvToDate || null,
      srvProcedureCode: line.srvProcedureCode || null,
      srvModifier1: line.srvModifier1 || null,
      srvModifier2: line.srvModifier2 || null,
      srvModifier3: line.srvModifier3 || null,
      srvModifier4: line.srvModifier4 || null,
      srvUnits: line.srvUnits != null ? Number(line.srvUnits) : null,
      srvCharges: line.srvCharges != null ? Number(line.srvCharges) : null,
      srvAllowedAmt: line.srvAllowedAmt != null ? Number(line.srvAllowedAmt) : null,
      srvDesc: line.srvDesc || null,
      srvResponsibleParty: responsibleParty > 0 ? responsibleParty : null,
      srvNationalDrugCode: line.srvNationalDrugCode || null,
      srvDrugUnitCount: line.srvDrugUnitCount != null ? Number(line.srvDrugUnitCount) : null,
      srvDrugUnitMeasurement: line.srvDrugUnitMeasurement || null,
      srvPrescriptionNumber: line.srvPrescriptionNumber || null
    };
  }

  private toDateInputValue(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
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
    const payload = this.buildClaimUpdatePayload({
      claStatus: claStatus || null,
      claClassification: claClassification || null,
      claSubmissionMethod: claSubmissionMethod ?? null,
      claRenderingPhyFID,
      claFacilityPhyFID,
      noteText
    });
    console.log('[ClaimDetails] PUT payload', payload);
    this.claimApiService.updateClaim(this.claId, payload).subscribe({
      next: () => {
        if (this.claim) {
          this.claim.claStatus = claStatus;
          this.claim.claClassification = claClassification;
          this.claim.claSubmissionMethod = claSubmissionMethod;
          this.updateClaimPhysicianRefs(claRenderingPhyFID, claFacilityPhyFID);
        }
        this.newNote = '';
        this.saveClaimCustomFieldValues();
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
    const payload = this.buildClaimUpdatePayload({
      claStatus: claStatus || null,
      claClassification: claClassification || null,
      claSubmissionMethod: claSubmissionMethod ?? null,
      claRenderingPhyFID,
      claFacilityPhyFID,
      noteText
    });
    console.log('[ClaimDetails] PUT payload', payload);
    this.claimApiService.updateClaim(this.claId, payload).subscribe({
      next: () => {
        if (this.claim) {
          this.claim.claStatus = claStatus;
          this.claim.claClassification = claClassification;
          this.claim.claSubmissionMethod = claSubmissionMethod;
          this.updateClaimPhysicianRefs(claRenderingPhyFID, claFacilityPhyFID);
        }
        this.newNote = '';
        this.saveClaimCustomFieldValues();
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
    if (!this.claId) {
      return;
    }
    this.scrubError = null;
    this.scrubResults = [];
    this.claimApiService.scrubClaim(this.claId).subscribe({
      next: (results) => {
        this.scrubResults = results || [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.scrubError = err?.error?.message || err?.error?.error || 'Failed to scrub claim.';
        this.cdr.markForCheck();
      }
    });
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

  /** Reload claim (and notes/activity) so that edits made elsewhere (e.g. Payment Entry) appear. */
  refreshClaimAndNotes(): void {
    if (this.claId) this.loadClaim(this.claId);
  }

  addNote(event: Event): void {
    event.preventDefault();
    if (this.newNote.trim()) {
      console.log('Adding note:', this.newNote);
      this.newNote = '';
      this.cdr.markForCheck();
    }
  }

  private buildClaimUpdatePayload(partial: {
    claStatus: string | null;
    claClassification: string | null;
    claSubmissionMethod: string | null;
    claRenderingPhyFID: number | null;
    claFacilityPhyFID: number | null;
    noteText: string | null;
  }): any {
    if (!this.claim) return partial;

    // Always send the full claim update DTO so backend gets consistent shape.
    return {
      claStatus: this.claim.claStatus ?? null,
      claClassification: this.claim.claClassification ?? null,
      claSubmissionMethod: partial.claSubmissionMethod ?? this.claim.claSubmissionMethod ?? null,
      claRenderingPhyFID: partial.claRenderingPhyFID ?? this.claim.renderingPhysician?.phyID ?? 0,
      claFacilityPhyFID: partial.claFacilityPhyFID ?? this.claim.facilityPhysician?.phyID ?? 0,
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
      additionalData: this.claim.additionalData ?? undefined,
      noteText: partial.noteText
    };
  }
}
