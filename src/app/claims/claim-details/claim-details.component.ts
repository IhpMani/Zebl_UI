import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { environment } from 'src/environments/environment';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, filter, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ClaimApiService } from '../../core/services/claim-api.service';
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
import { resolveSubmitClaimId } from '../shared/claim-submit-id.util';
import { ConnectionLibraryApiService } from '../../core/services/connection-library-api.service';
import { ReceiverLibraryApiService } from '../../core/services/receiver-library-api.service';
import { ProcedureCode, ProcedureCodesApiService } from '../../core/services/procedure-codes-api.service';
import { ProgramSettingsApiService } from '../../core/services/program-settings-api.service';
import { resolveClaimPatientId, resolveClaimPatientName } from '../../core/utils/claim-patient-id.util';
import { isBillingClassificationCode } from '../../core/utils/physician-classification.util';
import {
  formatServiceLineDiagnosisPointerDisplay,
  formatServiceLineEmgDisplay,
  formatServiceLineModifierDisplay,
  isServiceLineEmgActive
} from '../shared/service-line-display.util';
import {
  buildClaimDiagnosisFormFields,
  claimDiagnosisFieldKeys,
  emptyClaimDiagnosisValues,
  readClaimDiagnosisValues
} from '../shared/claim-diagnosis.util';

@Component({
  selector: 'app-claim-details',
  templateUrl: './claim-details.component.html',
  styleUrls: ['./claim-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClaimDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  claim: Claim | null = null;
  isNewMode = false;
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
  diagnosisFields = buildClaimDiagnosisFormFields();
  /** Bound diagnosis inputs — dynamic ngModel on claim[field] does not persist reliably under OnPush. */
  claimDiagnosisValues: Record<string, string> = Object.fromEntries(
    claimDiagnosisFieldKeys().map((key) => [key, ''])
  );

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
  /** Billing organizations (Non-Person / BI) */
  billingProviders: PhysicianListItem[] = [];

  /** Form for Claim Information and Physician fields */
  claimForm = new FormGroup({
    ClaStatus: new FormControl<string | null>(''),
    ClaClassification: new FormControl<string | null>(''),
    ClaSubmissionMethod: new FormControl<string | null>(''),
    ClaBillingPhyFID: new FormControl<number | null>(null),
    ClaRenderingPhyFID: new FormControl<number | null>(null),
    ClaFacilityPhyFID: new FormControl<number | null>(null)
  });

  get form(): FormGroup {
    return this.claimForm;
  }

  sectionsState = {
    claimInfo: true,
    physician: true,
    dates: true,
    diagnosisExpanded: false,
    misc: false,
    resubmission: false,
    paperwork: false,
    additionalData: false,
    customFields: false
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
  /** Cached sorted rows for service-line grid (avoids re-sorting on every CD cycle). */
  displayServiceLines: any[] = [];
  /** Client-side sort for service lines grid (display only). */
  serviceLineSortKey: string | null = null;
  serviceLineSortDir: 'asc' | 'desc' = 'asc';
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

  savingClaim = false;
  scrubbingClaim = false;
  submittingClaim = false;
  submitError: string | null = null;
  submitSuccess: string | null = null;

  /** Responsible party payer options (from claim insureds). */
  primaryPayerId: number | null = null;
  primaryPayerName: string | null = null;
  secondaryPayerId: number | null = null;
  secondaryPayerName: string | null = null;

  private claimRequestInFlight = false;
  private loadClaimGeneration = 0;
  private serviceRequestInFlight = false;
  private readonly destroy$ = new Subject<void>();
  private paymentRequestInFlight = false;
  private adjustmentRequestInFlight = false;
  private disbursementRequestInFlight = false;
  private physicianCatalogLoadInFlight = false;
  private claimActivityLoaded = false;
  private claimActivityRequestInFlight = false;
  private customFieldsDefinitionsLoaded = false;

  /** Temporary perf investigation (dev only). Remove after bottleneck fix. */
  private readonly perfLog = !environment.production;
  private perfOrigin = 0;
  private perfRenderPending = false;

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
    private connectionLibraryApi: ConnectionLibraryApiService,
    private receiverLibraryApi: ReceiverLibraryApiService,
    private cdr: ChangeDetectorRef,
    private programSettingsApi: ProgramSettingsApiService
  ) { }

  ngOnInit(): void {
    this.perfReset('ngOnInit');
    this.perfMark('ngOnInit start');
    this.loadClassificationOptions();
    if (this.route.snapshot.routeConfig?.path === 'claims/new') {
      this.initNewClaim();
      return;
    }

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idParam = params.get('id');
      if (!idParam) {
        this.error = 'Invalid claim ID';
        return;
      }
      const nextId = +idParam;
      if (!Number.isFinite(nextId) || nextId <= 0) {
        this.error = 'Invalid claim ID';
        return;
      }
      if (this.claId === nextId && this.claim && !this.claimRequestInFlight) {
        this.syncRibbonContextFromClaim();
        this.syncTabTitleFromClaim();
        return;
      }
      this.claId = nextId;
      this.applyInitialTabTitleFromContext();
      this.perfMark('route paramMap → loadClaim', { claId: nextId });
      this.loadClaim(this.claId);
    });

    // Route reuse (workspace tabs): returning does not re-run param subscription — refresh on activate.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        if (!this.claId || this.claId <= 0) return;
        const url = e.urlAfterRedirects || '';
        if (!this.isUrlForThisClaim(url)) return;
        this.syncRibbonContextFromClaim();
        this.syncTabTitleFromClaim();
        if (this.loading || this.claimRequestInFlight) {
          if (!this.claim || this.claim.claID !== this.claId) {
            this.loadClaim(this.claId);
          }
          return;
        }
        if (!this.claim) {
          this.loadClaim(this.claId);
        } else {
          this.refreshServiceLinesFromApi();
        }
      });
  }

  private initNewClaim(): void {
    this.isNewMode = true;
    this.claim = this.createEmptyClaim();
    this.syncClaimDiagnosisFormFromClaim(this.claim);
    this.claId = null;
    this.error = null;
    this.loading = false;
    this.ribbonContext.clearContext();
    this.patchClaimForm();
    this.workspace.updateActiveTabTitle('New Claim');
    this.loadClaimInitialSettings();
    this.schedulePhysicianDropdownCatalog();
    this.cdr.markForCheck();
  }

  private loadClaimInitialSettings(): void {
    this.programSettingsApi.getSection('claim').subscribe({
      next: (settings) => {
        if (!this.claim) return;
        const initialStatus = (settings?.initialClaimStatus ?? 'OnHold') as string;
        this.claim.claStatus = initialStatus || 'OnHold';
        this.claimForm.patchValue({
          ClaStatus: this.claim.claStatus
        });
        this.ensureCurrentStatusInOptions();
        this.cdr.markForCheck();
      },
      error: () => {
        if (!this.claim) return;
        this.claim.claStatus = this.claim.claStatus || 'OnHold';
        this.claimForm.patchValue({
          ClaStatus: this.claim.claStatus
        });
        this.ensureCurrentStatusInOptions();
        this.cdr.markForCheck();
      }
    });
  }

  private createEmptyClaim(): Claim {
    const nowIso = new Date().toISOString();
    return {
      claID: 0,
      claStatus: 'OnHold',
      claDateTimeCreated: nowIso,
      claDateTimeModified: nowIso,
      claTotalChargeTRIG: 0,
      claTotalAmtPaidCC: 0,
      claTotalBalanceCC: 0,
      claTotalAmtAppliedCC: 0,
      claBillDate: null,
      claBillTo: 0,
      claSubmissionMethod: null,
      claInvoiceNumber: null,
      claLocked: false,
      claOriginalRefNo: null,
      claDelayCode: null,
      claMedicaidResubmissionCode: null,
      claPaperWorkTransmissionCode: null,
      claPaperWorkControlNumber: null,
      claPaperWorkInd: null,
      claEDINotes: null,
      claRemarks: null,
      claAdmittedDate: null,
      claDischargedDate: null,
      claDateLastSeen: null,
      claRelatedTo: 0,
      claRelatedToState: null,
      claFirstDateTRIG: null,
      claLastDateTRIG: null,
      claClassification: null,
      ...emptyClaimDiagnosisValues(),
      patient: null,
      renderingPhysician: null,
      referringPhysician: null,
      billingPhysician: null,
      facilityPhysician: null,
      additionalData: this.getEmptyAdditionalData(),
      claimActivity: [],
      serviceLines: []
    };
  }

  loadClassificationOptions(): void {
    this.perfTime('loadClassificationOptions (API)');
    this.listApiService.getListValues('Claim Classification').subscribe({
      next: (r) => {
        this.perfTimeEnd('loadClassificationOptions (API)');
        const items = (r.data || []).slice().sort((a, b) => (a.value || '').localeCompare(b.value || ''));
        this.classificationOptions = items;
        this.ensureCurrentClassificationInOptions();
        this.perfMark('loadClassificationOptions applied', { count: items.length });
        this.cdr.markForCheck();
      },
      error: () => {
        this.perfTimeEnd('loadClassificationOptions (API)');
        this.classificationOptions = [];
        this.cdr.markForCheck();
      }
    });
  }

  /** Hydrate claim FK physicians, then load filtered dropdown catalogs after paint. */
  private loadClaimProvidersAfterClaim(claim: Claim): void {
    const ids = this.getClaimPhysicianIds(claim);
    if (ids.length > 0) {
      this.perfTime('loadClaimProviders phyIds');
      this.physicianApiService
        .getPhysicians(1, Math.max(ids.length + 5, 25), { phyIds: ids.join(',') })
        .subscribe({
          next: (r) => {
            this.perfTimeEnd('loadClaimProviders phyIds');
            this.mergePhysicianRows(r.data ?? []);
            this.filterPhysicianDropdownLists();
            this.syncPhysicianFormFromClaim();
            this.ensureCurrentPhysiciansInOptions();
            this.perfMark('loadClaimProviders phyIds done', { count: r.data?.length ?? 0 });
            this.cdr.markForCheck();
          },
          error: () => {
            this.perfTimeEnd('loadClaimProviders phyIds');
            this.cdr.markForCheck();
          }
        });
    } else {
      this.syncPhysicianFormFromClaim();
    }
    this.schedulePhysicianDropdownCatalog();
  }

  private getClaimPhysicianIds(claim?: Claim | null): number[] {
    const c = claim ?? this.claim;
    if (!c) return [];
    const ids = [
      this.coercePhyFid(c.claBillingPhyFID ?? c.billingPhysician?.phyID),
      this.coercePhyFid(c.claRenderingPhyFID ?? c.renderingPhysician?.phyID),
      this.coercePhyFid(c.claFacilityPhyFID ?? c.facilityPhysician?.phyID)
    ].filter((id) => id > 0);
    return [...new Set(ids)];
  }

  private mergePhysicianRows(rows: PhysicianListItem[]): void {
    const byId = new Map(this.physicians.map((p) => [p.phyID, p]));
    for (const p of rows) {
      byId.set(p.phyID, p);
    }
    this.physicians = [...byId.values()];
    this.filterPhysicianDropdownLists();
  }

  private filterPhysicianDropdownLists(): void {
    this.renderingProviders = this.physicians.filter((p) => p.phyType === 'Person');
    this.serviceFacilities = this.physicians.filter((p) => p.phyType === 'Non-Person');
    this.billingProviders = this.physicians.filter(
      (p) =>
        p.phyType === 'Non-Person'
        && isBillingClassificationCode(p.phyPrimaryCodeType)
        && !p.isSystemPlaceholder
    );
  }

  private schedulePhysicianDropdownCatalog(): void {
    setTimeout(() => this.loadPhysicianDropdownCatalog(), 0);
  }

  /** Filtered physician subsets for dropdowns (deferred; not full 10k library). */
  private loadPhysicianDropdownCatalog(): void {
    if (this.physicianCatalogLoadInFlight) return;
    this.physicianCatalogLoadInFlight = true;
    this.perfTime('loadPhysicianDropdownCatalog (3 filtered API calls)');
    forkJoin({
      rendering: this.physicianApiService.getPhysicians(1, 500, { isPerson: true, inactive: false }),
      facility: this.physicianApiService.getPhysicians(1, 500, { isFacility: true, inactive: false }),
      billing: this.physicianApiService.getPhysicians(1, 500, {
        classification: 'BI',
        isFacility: true,
        inactive: false
      })
    })
      .pipe(
        finalize(() => {
          this.physicianCatalogLoadInFlight = false;
          this.perfTimeEnd('loadPhysicianDropdownCatalog (3 filtered API calls)');
        })
      )
      .subscribe({
        next: ({ rendering, facility, billing }) => {
          const rows = [
            ...(rendering.data ?? []),
            ...(facility.data ?? []),
            ...(billing.data ?? [])
          ];
          this.mergePhysicianRows(rows);
          this.ensureCurrentPhysiciansInOptions();
          this.perfMark('loadPhysicianDropdownCatalog done', {
            total: this.physicians.length,
            rendering: this.renderingProviders.length,
            facilities: this.serviceFacilities.length,
            billing: this.billingProviders.length
          });
          this.cdr.markForCheck();
        },
        error: () => {
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

  /** Authoritative billing FK: Claim.ClaBillingPhyFID, then nested billingPhysician. */
  private getClaimBillingPhyFid(): number {
    return this.coercePhyFid(
      this.claim?.claBillingPhyFID ?? this.claim?.billingPhysician?.phyID
    );
  }

  private getClaimRenderingPhyFid(): number {
    return this.coercePhyFid(
      this.claim?.claRenderingPhyFID ?? this.claim?.renderingPhysician?.phyID
    );
  }

  private getClaimFacilityPhyFid(): number {
    return this.coercePhyFid(
      this.claim?.claFacilityPhyFID ?? this.claim?.facilityPhysician?.phyID
    );
  }

  private coercePhyFid(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  getFormPhyFid(controlName: string): number {
    return this.coercePhyFid(this.claimForm.get(controlName)?.value);
  }

  comparePhyFid(a: unknown, b: unknown): boolean {
    return this.coercePhyFid(a) === this.coercePhyFid(b);
  }

  getSelectedBillingProviderLabel(): string {
    const id = this.getFormPhyFid('ClaBillingPhyFID');
    if (id <= 0) return '(none)';
    const p =
      this.physicians.find((x) => x.phyID === id)
      ?? this.billingProviders.find((x) => x.phyID === id);
    return (p?.phyFullNameCC || p?.phyName || `PhyID ${id}`).trim();
  }

  /** Ensure claim's current rendering/facility physicians appear in dropdowns (for legacy/edge cases) */
  private ensureCurrentPhysiciansInOptions(): void {
    const bid = this.getClaimBillingPhyFid();
    const rid = this.getClaimRenderingPhyFid();
    const fid = this.getClaimFacilityPhyFid();
    if (bid && bid > 0 && !this.billingProviders.some(p => p.phyID === bid)) {
      const p = this.physicians.find(x => x.phyID === bid);
      if (p) this.billingProviders = [...this.billingProviders, p];
    }
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
  private updateClaimPhysicianRefs(
    billingId: number | null,
    renderingId: number | null,
    facilityId: number | null
  ): void {
    const toPhy = (id: number | null) => {
      if (id == null || id === 0) return null;
      const p = this.physicians.find(x => x.phyID === id);
      return p ? { phyID: p.phyID, phyName: p.phyFullNameCC || p.phyName || null, phyNPI: p.phyNPI || null } : null;
    };
    if (this.claim) {
      this.claim.billingPhysician = toPhy(billingId);
      this.claim.renderingPhysician = toPhy(renderingId);
      this.claim.facilityPhysician = toPhy(facilityId);
    }
  }

  /** Patch form with claim data from API (FK fields on Claim row, not only nested physician DTOs). */
  private patchClaimForm(): void {
    this.perfTime('patchClaimForm');
    this.claimForm.patchValue({
      ClaStatus: this.claim?.claStatus ?? null,
      ClaClassification: this.claim?.claClassification ?? null,
      ClaSubmissionMethod: this.claim?.claSubmissionMethod ?? null,
      ClaBillingPhyFID: this.getClaimBillingPhyFid() || null,
      ClaRenderingPhyFID: this.getClaimRenderingPhyFid() || null,
      ClaFacilityPhyFID: this.getClaimFacilityPhyFid() || null
    });
    this.resetPhysicianFkEditState();
    this.perfTimeEnd('patchClaimForm');
  }

  /**
   * After physician lists load, fill empty physician FKs from the claim.
   * Does not overwrite user edits (dirty/touched) or values already set by patchClaimForm.
   */
  private syncPhysicianFormFromClaim(): void {
    if (!this.claim) return;
    this.perfTime('syncPhysicianFormFromClaim');
    const patch = this.buildPhysicianFkPatchForClaimSync();
    if (Object.keys(patch).length === 0) {
      const formBilling = this.getFormPhyFid('ClaBillingPhyFID');
      const claimBilling = this.getClaimBillingPhyFid();
      if (formBilling > 0 && claimBilling > 0 && formBilling !== claimBilling) {
        const billingCtrl = this.claimForm.get('ClaBillingPhyFID');
        console.debug('[ClaimDetails] physician FK sync preserved user billing selection', {
          formBillingPhyFID: formBilling,
          claimBillingPhyFID: claimBilling,
          formBillingDirty: billingCtrl?.dirty ?? false,
          formBillingTouched: billingCtrl?.touched ?? false
        });
      }
      this.perfTimeEnd('syncPhysicianFormFromClaim');
      return;
    }
    this.claimForm.patchValue(patch);
    this.perfTimeEnd('syncPhysicianFormFromClaim');
    this.perfMark('syncPhysicianFormFromClaim patched', patch);
  }

  /** Authoritative claim hydration — clears prior user-edit guards on physician FK controls. */
  private resetPhysicianFkEditState(): void {
    for (const name of ['ClaBillingPhyFID', 'ClaRenderingPhyFID', 'ClaFacilityPhyFID'] as const) {
      const ctrl = this.claimForm.get(name);
      ctrl?.markAsPristine();
      ctrl?.markAsUntouched();
    }
  }

  private buildPhysicianFkPatchForClaimSync(): Partial<{
    ClaBillingPhyFID: number | null;
    ClaRenderingPhyFID: number | null;
    ClaFacilityPhyFID: number | null;
  }> {
    const patch: Partial<{
      ClaBillingPhyFID: number | null;
      ClaRenderingPhyFID: number | null;
      ClaFacilityPhyFID: number | null;
    }> = {};
    if (this.shouldSyncPhysicianFkFromClaim('ClaBillingPhyFID')) {
      const id = this.getClaimBillingPhyFid();
      patch.ClaBillingPhyFID = id > 0 ? id : null;
    }
    if (this.shouldSyncPhysicianFkFromClaim('ClaRenderingPhyFID')) {
      const id = this.getClaimRenderingPhyFid();
      patch.ClaRenderingPhyFID = id > 0 ? id : null;
    }
    if (this.shouldSyncPhysicianFkFromClaim('ClaFacilityPhyFID')) {
      const id = this.getClaimFacilityPhyFid();
      patch.ClaFacilityPhyFID = id > 0 ? id : null;
    }
    return patch;
  }

  /**
   * True only for initial/async fill: control not user-edited and still empty.
   * Prevents loadPhysicians() from resetting Billing Provider after the user picks IHP.
   */
  private shouldSyncPhysicianFkFromClaim(
    controlName: 'ClaBillingPhyFID' | 'ClaRenderingPhyFID' | 'ClaFacilityPhyFID'
  ): boolean {
    const ctrl = this.claimForm.get(controlName);
    if (!ctrl) return false;
    if (ctrl.dirty || ctrl.touched) return false;
    return this.coercePhyFid(ctrl.value) <= 0;
  }

  ngAfterViewInit(): void {
    this.schedulePerfRenderComplete('ngAfterViewInit');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private perfReset(origin: string): void {
    if (!this.perfLog) return;
    this.perfOrigin = performance.now();
    console.log(`[ClaimDetailsPerf] ── session: ${origin} ──`);
  }

  private perfMark(label: string, detail?: Record<string, unknown>): void {
    if (!this.perfLog) return;
    const ms = Math.round(performance.now() - this.perfOrigin);
    if (detail && Object.keys(detail).length > 0) {
      console.log(`[ClaimDetailsPerf] +${ms}ms ${label}`, detail);
    } else {
      console.log(`[ClaimDetailsPerf] +${ms}ms ${label}`);
    }
  }

  private perfTime(label: string): void {
    if (!this.perfLog) return;
    console.time(`[ClaimDetailsPerf] ${label}`);
  }

  private perfTimeEnd(label: string): void {
    if (!this.perfLog) return;
    console.timeEnd(`[ClaimDetailsPerf] ${label}`);
  }

  /** Log first paint after claim data binds (rAF × 2). */
  private schedulePerfRenderComplete(trigger: string): void {
    if (!this.perfLog || !this.claim) return;
    this.perfRenderPending = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.perfRenderPending) return;
        this.perfRenderPending = false;
        this.perfMark(`render complete (${trigger})`, {
          serviceLineCount: this.serviceLinesArray.length,
          physicianCount: this.physicians.length,
          billingProviderOptions: this.billingProviders.length
        });
      });
    });
  }

  private isUrlForThisClaim(url: string): boolean {
    if (!this.claId) return false;
    return new RegExp(`/claims/${this.claId}(?:[/?#]|$)`).test(url);
  }

  /** Ribbon uses a single global context; keep it in sync with whichever claim route is active. */
  private syncRibbonContextFromClaim(): void {
    if (!this.claId || !this.claim) return;
    const patId = resolveClaimPatientId(this.claim);
    const patientName = this.resolvePatientDisplayName();
    this.ribbonContext.setContext({
      claimId: this.claId,
      patientId: patId,
      patientName
    });
  }

  /** Workspace tab title — avoid stale "Loading..." after route reuse or async claim fetch. */
  private syncTabTitleFromClaim(): void {
    if (!this.claId) return;
    this.workspace.updateActiveTabTitle(this.resolvePatientDisplayName() ?? `Claim ${this.claId}`);
  }

  private applyInitialTabTitleFromContext(): void {
    if (!this.claId) return;
    const ctx = this.ribbonContext.getContext();
    if (ctx.patientName?.trim()) {
      this.workspace.updateActiveTabTitle(ctx.patientName.trim());
      return;
    }
    this.workspace.updateActiveTabTitle(`Claim ${this.claId}`);
  }

  private resolvePatientDisplayName(): string | null {
    if (this.claim) {
      const fromClaim = resolveClaimPatientName(this.claim);
      if (fromClaim?.trim()) return fromClaim.trim();
      const composed = this.getPatientName();
      if (composed && composed !== 'Unknown Patient') return composed;
    }
    const ctxName = this.ribbonContext.getContext().patientName;
    if (ctxName?.trim()) return ctxName.trim();
    return null;
  }

  /**
   * Merge GET /api/services/claims/{id} rows over embedded claim lines so totals stay current
   * while preserving fields not returned by the services endpoint (e.g. responsiblePartyName, place).
   */
  private applyFreshServiceLines(fresh: any[], embedded: any[]): void {
    this.perfTime('applyFreshServiceLines');
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
    this.perfTimeEnd('applyFreshServiceLines');
    this.rebuildDisplayServiceLines();
    this.perfMark('applyFreshServiceLines done', {
      lineCount: this.serviceLines.length,
      freshCount: fresh?.length ?? 0,
      embeddedCount: embedded?.length ?? 0
    });
    this.cdr.markForCheck();
    this.schedulePerfRenderComplete('after service lines');
  }

  private scheduleDeferredServiceLineTotalsRefresh(): void {
    if (!this.claId) return;
    setTimeout(() => {
      if (!this.claId) return;
      this.perfMark('deferred refreshServiceLinesFromApi');
      this.refreshServiceLinesFromApi();
    }, 0);
  }

  private scheduleDeferredClaimActivity(): void {
    const claId = this.claId;
    if (!claId) return;
    setTimeout(() => this.loadClaimActivity(claId), 0);
  }

  private loadClaimActivity(claId: number, force = false): void {
    if (this.claimActivityRequestInFlight || (this.claimActivityLoaded && !force)) return;
    this.claimActivityRequestInFlight = true;
    this.perfTime('loadClaimActivity');
    this.claimApiService
      .getClaimActivity(claId)
      .pipe(
        finalize(() => {
          this.claimActivityRequestInFlight = false;
          this.perfTimeEnd('loadClaimActivity');
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (activity) => {
          if (this.claim) {
            this.claim.claimActivity = activity ?? [];
          }
          this.claimActivityLoaded = true;
          this.perfMark('loadClaimActivity applied', { count: activity?.length ?? 0 });
        },
        error: () => {
          if (this.claim && !this.claim.claimActivity) {
            this.claim.claimActivity = [];
          }
        }
      });
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

  /**
   * Backend should persist ClaBillTo as 0/1/2, but some flows may send payer IDs.
   * Normalize to UI enum so the Bill To dropdown renders correctly.
   */
  private normalizeBillToForUi(raw: number | null | undefined): number {
    const v = Number(raw ?? 0);
    if (v === 0 || v === 1 || v === 2) return v;
    if (this.primaryPayerId && v === this.primaryPayerId) return 1;
    if (this.secondaryPayerId && v === this.secondaryPayerId) return 2;
    return 0;
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
    if (
      section === 'customFields'
      && this.sectionsState.customFields
      && this.claId
      && !this.customFieldsDefinitionsLoaded
    ) {
      this.customFieldsDefinitionsLoaded = true;
      this.loadClaimCustomFieldsAndValues(this.claId);
    }
    this.cdr.markForCheck();
  }

  loadClaim(claId: number): void {
    const generation = ++this.loadClaimGeneration;
    this.perfReset(`loadClaim claId=${claId}`);
    this.loading = true;
    this.error = null;
    this.claim = null;
    this.claimActivityLoaded = false;
    this.customFieldsDefinitionsLoaded = false;
    this.claimRequestInFlight = true;
    this.applyInitialTabTitleFromContext();
    this.perfMark('loadClaim start (getClaimById?detail=summary)');

    this.perfTime('loadClaim getClaimById (summary)');
    this.claimApiService
      .getClaimById(claId, { detail: 'summary' })
      .pipe(
        tap((c) => {
          this.perfMark('getClaimById summary response', {
            embeddedServiceLines: (c as Claim)?.serviceLines?.length ?? 0
          });
        }),
        finalize(() => {
          if (generation === this.loadClaimGeneration) {
            this.perfTimeEnd('loadClaim getClaimById (summary)');
            this.claimRequestInFlight = false;
            this.cdr.markForCheck();
          }
        })
      )
      .subscribe({
        next: (claim) => {
          if (generation !== this.loadClaimGeneration || this.claId !== claId) {
            return;
          }
          this.perfTime('loadClaim post-processing');
          this.claimStatuses = [...CLAIM_STATUS_OPTIONS];
          this.claim = claim;
          this.syncClaimDiagnosisFormFromClaim(claim);
          console.debug('[ClaimDetails] diagnosis load', {
            fromApi: readClaimDiagnosisValues(claim).claDiagnosis1,
            form: this.claimDiagnosisValues['claDiagnosis1']
          });
          this.loading = false;
          this.perfMark('loadClaim shell ready (overlay dismissed)');
          if (!this.claim.additionalData) {
            this.claim.additionalData = this.getEmptyAdditionalData();
          }
          if (this.isUrlForThisClaim(this.router.url)) {
            this.syncRibbonContextFromClaim();
            this.syncTabTitleFromClaim();
          }
          this.ensureCurrentStatusInOptions();
          this.ensureCurrentClassificationInOptions();
          this.loadResponsiblePayerOptionsFromClaim(claim);
          this.claim.claBillTo = this.normalizeBillToForUi(this.claim.claBillTo);
          this.normalizeClaimHeaderDatesForDateInputs(this.claim);
          this.patchClaimForm();
          const embedded = claim.serviceLines ?? [];
          this.applyFreshServiceLines(embedded, embedded);
          this.loadClaimProvidersAfterClaim(claim);
          this.scheduleDeferredServiceLineTotalsRefresh();
          this.scheduleDeferredClaimActivity();
          this.perfTimeEnd('loadClaim post-processing');
          this.perfMark('loadClaim subscribe complete');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
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
          this.cdr.markForCheck();
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
    this.perfMark('loadClaimCustomFields start (3 API calls, non-blocking)');
    this.perfTime('customFields Claim definitions');
    this.customFieldsApi.getByEntityType('Claim').subscribe({
      next: defs => {
        this.perfTimeEnd('customFields Claim definitions');
        this.claimCustomFieldDefinitions = defs ?? [];
        this.perfTime('customFields Claim values');
        this.customFieldsApi.getValues('Claim', claId).subscribe({
          next: values => {
            this.perfTimeEnd('customFields Claim values');
            this.claimCustomFieldValues = { ...values };
            this.cdr.markForCheck();
          },
          error: () => {
            this.perfTimeEnd('customFields Claim values');
            this.claimCustomFieldValues = {};
            this.cdr.markForCheck();
          }
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.perfTimeEnd('customFields Claim definitions');
        this.claimCustomFieldDefinitions = [];
        this.cdr.markForCheck();
      }
    });
    this.perfTime('customFields ServiceLine definitions');
    this.customFieldsApi.getByEntityType('ServiceLine').subscribe({
      next: defs => {
        this.perfTimeEnd('customFields ServiceLine definitions');
        this.serviceLineCustomFieldDefinitions = defs ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.perfTimeEnd('customFields ServiceLine definitions');
        this.serviceLineCustomFieldDefinitions = [];
        this.cdr.markForCheck();
      }
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

  private setServiceLines(lines: any[]): void {
    this.serviceLines = lines;
    this.rebuildDisplayServiceLines();
  }

  private rebuildDisplayServiceLines(): void {
    const lines = [...this.serviceLinesArray];
    const key = this.serviceLineSortKey;
    if (key) {
      const dir = this.serviceLineSortDir === 'asc' ? 1 : -1;
      lines.sort((a, b) => {
        const av = this.serviceLineSortValue(a, key);
        const bv = this.serviceLineSortValue(b, key);
        if (typeof av === 'number' && typeof bv === 'number') {
          return (av - bv) * dir;
        }
        return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
      });
    }
    this.displayServiceLines = lines;
  }

  toggleServiceLineSort(key: string): void {
    if (this.serviceLineSortKey === key) {
      this.serviceLineSortDir = this.serviceLineSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.serviceLineSortKey = key;
      this.serviceLineSortDir = 'asc';
    }
    this.rebuildDisplayServiceLines();
    this.cdr.markForCheck();
  }

  serviceLineSortIndicator(key: string): string {
    if (this.serviceLineSortKey !== key) {
      return '';
    }
    return this.serviceLineSortDir === 'asc' ? ' ▲' : ' ▼';
  }

  formatLineDiagnosisPointer(line: any): string {
    return formatServiceLineDiagnosisPointerDisplay(
      line?.srvDiagnosisPointer ?? line?.SrvDiagnosisPointer
    );
  }

  formatLineEmg(line: any): string {
    return formatServiceLineEmgDisplay(line?.srvEMG ?? line?.SrvEMG);
  }

  isServiceLineEmg(line: any): boolean {
    return isServiceLineEmgActive(line?.srvEMG ?? line?.SrvEMG);
  }

  formatLineModifier(line: any, index: 1 | 2 | 3 | 4): string {
    const key = `srvModifier${index}` as const;
    const pascal = `SrvModifier${index}` as const;
    return formatServiceLineModifierDisplay(line?.[key] ?? line?.[pascal]);
  }

  private serviceLineSortValue(line: any, key: string): string | number {
    switch (key) {
      case 'diagnosis':
        return this.formatLineDiagnosisPointer(line);
      case 'm1':
        return this.formatLineModifier(line, 1);
      case 'm2':
        return this.formatLineModifier(line, 2);
      case 'm3':
        return this.formatLineModifier(line, 3);
      case 'm4':
        return this.formatLineModifier(line, 4);
      case 'emg':
        return this.formatLineEmg(line);
      case 'procedure':
        return (line?.srvProcedureCode ?? '').trim();
      case 'place':
        return (line?.srvPlace ?? line?.SrvPlace ?? '').trim();
      case 'from':
        return line?.srvFromDate ?? '';
      case 'to':
        return line?.srvToDate ?? '';
      case 'units':
        return Number(line?.srvUnits ?? 0);
      case 'charge':
        return Number(line?.srvCharges ?? 0);
      case 'balance':
        return Number(line?.srvTotalBalanceCC ?? 0);
      default:
        return '';
    }
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
    const defaultPlace = (previous?.srvPlace ?? previous?.SrvPlace ?? '').trim();
    const tempId = this.nextTempServiceLineId--;
    const row = this.normalizeServiceLine({
      srvID: tempId,
      srvClaFID: this.claId,
      srvFromDate: defaultFromDate,
      srvToDate: defaultToDate,
      srvProcedureCode: '',
      srvPlace: defaultPlace,
      srvModifier1: '',
      srvModifier2: '',
      srvModifier3: '',
      srvModifier4: '',
      srvDiagnosisPointer: '1',
      srvEMG: '',
      srvUnits: 1,
      srvCharges: 0,
      srvAllowedAmt: 0,
      srvTotalInsAmtPaidTRIG: 0,
      srvTotalPatAmtPaidTRIG: 0,
      srvTotalAmtPaidCC: 0,
      srvTotalAdjCC: 0,
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
    this.setServiceLines([row, ...this.serviceLinesArray]);
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
      this.setServiceLines(this.serviceLinesArray.filter(l => l.srvID !== line.srvID));
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
            this.setServiceLines(this.serviceLinesArray.map(l => l.srvID === line.srvID ? updated : l));
          } else {
            Object.assign(line, updated);
            this.rebuildDisplayServiceLines();
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
      this.setServiceLines(this.serviceLinesArray.filter(l => l.srvID !== line.srvID));
      this.cdr.markForCheck();
      return;
    }
    if (!confirm('Delete this service line?')) return;
    this.serviceApi.deleteServiceLine(this.claId, line.srvID).subscribe({
      next: () => {
        this.setServiceLines(this.serviceLinesArray.filter(l => l.srvID !== line.srvID));
        this.selectedServiceLineId = this.serviceLinesArray[0]?.srvID ?? null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to delete service line', err);
        alert('Failed to delete service line.');
      }
    });
  }

  onServiceLineUnitsChanged(line: any, newUnitsRaw?: number | string | null): void {
    const newUnits = newUnitsRaw != null && Number(newUnitsRaw) > 0
      ? Number(newUnitsRaw)
      : (line.srvUnits != null && Number(line.srvUnits) > 0 ? Number(line.srvUnits) : 1);
    if (line.srvUnits !== newUnits) {
      line.srvUnits = newUnits;
    }
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
      srvTotalAmtPaidCC: line?.srvTotalAmtPaidCC ?? line?.SrvTotalAmtPaidCC
        ?? ((line?.srvTotalInsAmtPaidTRIG ?? line?.SrvTotalInsAmtPaidTRIG ?? 0)
          + (line?.srvTotalPatAmtPaidTRIG ?? line?.SrvTotalPatAmtPaidTRIG ?? 0)),
      srvTotalAdjCC: line?.srvTotalAdjCC ?? line?.SrvTotalAdjCC ?? 0,
      srvTotalBalanceCC: line?.srvTotalBalanceCC ?? line?.SrvTotalBalanceCC ?? 0,
      srvResponsibleParty,
      responsiblePartyName,
      srvModifier1: line?.srvModifier1 ?? '',
      srvModifier2: line?.srvModifier2 ?? '',
      srvModifier3: line?.srvModifier3 ?? '',
      srvModifier4: line?.srvModifier4 ?? '',
      srvDiagnosisPointer:
        line?.srvDiagnosisPointer ?? line?.SrvDiagnosisPointer ?? '',
      srvPlace: line?.srvPlace ?? line?.SrvPlace ?? '',
      srvEMG: line?.srvEMG ?? line?.SrvEMG ?? '',
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
      srvPlace: line.srvPlace?.trim() || null,
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
    if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1900) return '';
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  /**
   * API often returns DateOnly as "yyyy-MM-ddTHH:mm:ss". <input type="date"> requires "yyyy-MM-dd"
   * or the value may not display. Prefer the calendar prefix when present to avoid TZ shifts.
   */
  private coerceApiDateToYyyyMmDd(value: string | Date): string {
    if (value instanceof Date) {
      return this.toDateInputValue(value);
    }
    const s = value.trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) {
      return m[1];
    }
    return this.toDateInputValue(s);
  }

  private normalizeClaimHeaderDatesForDateInputs(claim: Claim): void {
    const keys = ['claBillDate', 'claAdmittedDate', 'claDischargedDate', 'claDateLastSeen'] as const;
    type ClaimDateField = (typeof keys)[number];
    for (const key of keys) {
      const raw = claim[key];
      if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
        claim[key] = null;
        continue;
      }
      const normalized = this.coerceApiDateToYyyyMmDd(
        typeof raw === 'string' ? raw : String(raw)
      );
      claim[key] = (normalized || null) as Claim[ClaimDateField];
    }
  }

  saveAndClose(): void {
    if (this.isNewMode) {
      alert('This claim is new and not saved yet. Select a patient and save when creation is enabled.');
      return;
    }
    if (!this.claim || !this.claId || this.savingClaim) {
      this.goBackToList();
      return;
    }
    if (!this.validateBillToSelection()) return;
    const claStatus = this.claimForm.get('ClaStatus')?.value ?? null;
    const claClassification = this.claimForm.get('ClaClassification')?.value ?? null;
    const claSubmissionMethod = this.claimForm.get('ClaSubmissionMethod')?.value ?? null;
    const claBillingPhyFID = this.getFormPhyFid('ClaBillingPhyFID');
    const claRenderingPhyFID = this.getFormPhyFid('ClaRenderingPhyFID');
    const claFacilityPhyFID = this.getFormPhyFid('ClaFacilityPhyFID');
    const noteText = this.newNote?.trim() || null;
    const payload = this.buildClaimUpdatePayload({
      claStatus: claStatus || null,
      claClassification: claClassification || null,
      claSubmissionMethod: claSubmissionMethod ?? null,
      claBillingPhyFID,
      claRenderingPhyFID,
      claFacilityPhyFID,
      noteText
    });
    this.logClaimSaveProviderTrace('saveAndClose', payload);
    console.debug('[ClaimDetails] diagnosis save payload', this.buildDiagnosisPayloadFields());
    this.savingClaim = true;
    this.claimApiService.updateClaim(this.claId, payload).pipe(
      finalize(() => {
        this.savingClaim = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        if (this.claim) {
          this.claim.claStatus = claStatus;
          this.claim.claClassification = claClassification;
          this.claim.claSubmissionMethod = claSubmissionMethod;
          this.claim.claBillingPhyFID = claBillingPhyFID;
          this.claim.claRenderingPhyFID = claRenderingPhyFID;
          this.claim.claFacilityPhyFID = claFacilityPhyFID;
          this.updateClaimPhysicianRefs(claBillingPhyFID, claRenderingPhyFID, claFacilityPhyFID);
        }
        this.newNote = '';
        this.saveClaimCustomFieldValues();
        this.goBackToList();
      },
      error: (err) => this.handleClaimSaveError(err)
    });
  }

  save(): void {
    if (this.isNewMode) {
      alert('This claim is new and not saved yet. Select a patient and save when creation is enabled.');
      return;
    }
    if (!this.claim || !this.claId || this.savingClaim) return;
    if (!this.validateBillToSelection()) return;
    const claStatus = this.claimForm.get('ClaStatus')?.value ?? null;
    const claClassification = this.claimForm.get('ClaClassification')?.value ?? null;
    const claSubmissionMethod = this.claimForm.get('ClaSubmissionMethod')?.value ?? null;
    const claBillingPhyFID = this.getFormPhyFid('ClaBillingPhyFID');
    const claRenderingPhyFID = this.getFormPhyFid('ClaRenderingPhyFID');
    const claFacilityPhyFID = this.getFormPhyFid('ClaFacilityPhyFID');
    const noteText = this.newNote?.trim() || null;
    const payload = this.buildClaimUpdatePayload({
      claStatus: claStatus || null,
      claClassification: claClassification || null,
      claSubmissionMethod: claSubmissionMethod ?? null,
      claBillingPhyFID,
      claRenderingPhyFID,
      claFacilityPhyFID,
      noteText
    });
    this.logClaimSaveProviderTrace('save', payload);
    console.debug('[ClaimDetails] diagnosis save payload', this.buildDiagnosisPayloadFields());
    this.savingClaim = true;
    this.claimApiService.updateClaim(this.claId, payload).pipe(
      finalize(() => {
        this.savingClaim = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        if (this.claim) {
          this.claim.claStatus = claStatus;
          this.claim.claClassification = claClassification;
          this.claim.claSubmissionMethod = claSubmissionMethod;
          this.claim.claBillingPhyFID = claBillingPhyFID;
          this.claim.claRenderingPhyFID = claRenderingPhyFID;
          this.claim.claFacilityPhyFID = claFacilityPhyFID;
          this.updateClaimPhysicianRefs(claBillingPhyFID, claRenderingPhyFID, claFacilityPhyFID);
        }
        this.newNote = '';
        this.saveClaimCustomFieldValues();
        this.cdr.markForCheck();
      },
      error: (err) => this.handleClaimSaveError(err)
    });
  }

  private logClaimSaveProviderTrace(action: string, payload: Record<string, unknown>): void {
    const billingCtrl = this.claimForm.get('ClaBillingPhyFID');
    console.debug('[ClaimDetails] provider save trace', {
      action,
      formBillingPhyFID: this.getFormPhyFid('ClaBillingPhyFID'),
      formBillingLabel: this.getSelectedBillingProviderLabel(),
      formBillingDirty: billingCtrl?.dirty ?? false,
      formBillingTouched: billingCtrl?.touched ?? false,
      claimStoredBillingPhyFID: this.getClaimBillingPhyFid(),
      claimStoredBillingName: this.claim?.billingPhysician?.phyName ?? null,
      payloadClaBillingPhyFID: payload['claBillingPhyFID'],
      payloadClaFacilityPhyFID: payload['claFacilityPhyFID'],
      payloadClaRenderingPhyFID: payload['claRenderingPhyFID']
    });
  }

  private handleClaimSaveError(err: unknown): void {
    console.error('Failed to save claim', err);
    const body = (err as { error?: { message?: string; details?: string; Message?: string; Details?: string } })
      ?.error;
    const message = body?.message ?? body?.Message ?? 'Failed to save claim.';
    const details = body?.details ?? body?.Details;
    const text = details ? `${message}\n\n${details}` : message;
    alert(text);
    this.cdr.markForCheck();
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
    if (!this.claId || this.scrubbingClaim) {
      return;
    }
    this.scrubbingClaim = true;
    this.claimApiService.scrubClaim(this.claId).pipe(
      finalize(() => {
        this.scrubbingClaim = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Scrub failed:', err?.error?.message || err?.error?.error || err);
        this.cdr.markForCheck();
      }
    });
  }

  /** Submit the claim visible in this tab via send-batch (Clearinghouse). */
  submitClaim(): void {
    if (this.isNewMode || this.submittingClaim) {
      return;
    }

    let claimId: number;
    try {
      const activeClaimId = this.workspace.getActiveClaimId();
      console.log('Submitting claim', activeClaimId);
      const resolved = resolveSubmitClaimId({
        activeTabClaimId: activeClaimId,
        routeClaimId: this.claId,
        loadedClaimId: this.claim?.claID ?? null
      });
      if (resolved == null) {
        this.submitError = 'No claim is selected to submit.';
        this.cdr.markForCheck();
        return;
      }
      claimId = resolved;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claim id mismatch for submit.';
      console.error(message);
      this.submitError = message;
      this.cdr.markForCheck();
      return;
    }

    this.submittingClaim = true;
    this.submitError = null;
    this.submitSuccess = null;

    forkJoin({
      receivers: this.receiverLibraryApi.getAll(),
      connections: this.connectionLibraryApi.getAll()
    }).pipe(
      switchMap(({ receivers, connections }) => {
        const submitterReceiverId = receivers?.data?.[0]?.id ?? null;
        const connectionLibraryId =
          (connections ?? []).find((c) => c?.isActive)?.id ?? null;

        if (!submitterReceiverId) {
          throw new Error('No Submitter/Receiver configured. Add one in Receiver Library.');
        }
        if (!connectionLibraryId) {
          throw new Error('No active SFTP Connection configured. Add one in Connection Library.');
        }

        console.log('[SendBatch][ClaimDetails] submit current tab claim', {
          claimIds: [claimId],
          activeTabClaimId: this.workspace.getActiveClaimId(),
          routeClaimId: this.claId,
          loadedClaimId: this.claim?.claID ?? null
        });

        return this.claimApiService.sendBatch({
          claimIds: [claimId],
          submitterReceiverId,
          connectionType: 'Clearinghouse',
          connectionLibraryId
        });
      }),
      finalize(() => {
        this.submittingClaim = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res) => {
        if (res.success === false) {
          this.submitError = `Claim ${claimId} was not submitted. Check batch ${res.batchId} for details.`;
        } else {
          this.submitSuccess = `Claim ${claimId} submitted successfully (batch ${res.batchId}).`;
          this.loadClaim(claimId);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        const body = err?.error;
        this.submitError =
          body?.message ??
          body?.Message ??
          (typeof body === 'string' ? body : null) ??
          'Claim submit failed.';
        console.error('Submit failed:', err);
        this.cdr.markForCheck();
      }
    });
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value || this.isPlaceholderDate(value)) return '';
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
    if (!value || this.isPlaceholderDate(value)) return '';
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

  private isPlaceholderDate(value: string): boolean {
    const v = value.trim();
    if (!v) return true;
    if (v.startsWith('0001-01-01')) return true;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) || d.getFullYear() <= 1900;
  }

  getPatientName(): string {
    const resolved = this.resolvePatientDisplayName();
    if (resolved) return resolved;
    if (this.loading && this.claId) return `Claim ${this.claId}`;
    return 'Unknown Patient';
  }

  getCreatedUserDisplay(): string {
    if (!this.claim) return '';
    const raw = this.claim as unknown as Record<string, unknown>;
    const direct =
      this.claim.claCreatedUserName ||
      this.getRecordString(raw, 'claCreatedUserName') ||
      this.getRecordString(raw, 'ClaCreatedUserName');
    if (direct) return direct;

    const createdActivity = (this.claim.claimActivity ?? []).find(a =>
      (a.activityType || '').toLowerCase().includes('created')
    );
    return createdActivity?.user || '';
  }

  getModifiedUserDisplay(): string {
    if (!this.claim) return '';
    const raw = this.claim as unknown as Record<string, unknown>;
    const direct =
      this.claim.claLastUserName ||
      this.getRecordString(raw, 'claLastUserName') ||
      this.getRecordString(raw, 'ClaLastUserName');
    if (direct) return direct;

    const latest = [...(this.claim.claimActivity ?? [])]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return latest?.user || '';
  }

  getBillToText(): string {
    if (!this.claim) return '';
    const billTo = this.claim.claBillTo;
    if (billTo === 1) return `P - ${this.primaryPayerName ?? 'PRIMARY'}`;
    if (billTo === 2) return `S - ${this.secondaryPayerName ?? 'SECONDARY'}`;
    return 'Patient';
  }

  getBillToOptions(): Array<{ value: number; label: string; disabled?: boolean }> {
    const hasPrimary = !!(this.primaryPayerName && this.primaryPayerName.trim().length > 0);
    const hasSecondary = !!(this.secondaryPayerName && this.secondaryPayerName.trim().length > 0);
    return [
      { value: 0, label: 'Patient' },
      { value: 1, label: `P - ${this.primaryPayerName ?? 'PRIMARY'}`, disabled: !hasPrimary },
      { value: 2, label: `S - ${this.secondaryPayerName ?? 'SECONDARY'}`, disabled: !hasSecondary }
    ];
  }

  private validateBillToSelection(): boolean {
    if (!this.claim) return false;
    const selected = Number(this.claim.claBillTo ?? 0);
    if (selected === 1 && !(this.primaryPayerName && this.primaryPayerName.trim().length > 0)) {
      alert('Primary payer is required before selecting Bill To = Primary.');
      this.claim.claBillTo = 0;
      this.cdr.markForCheck();
      return false;
    }
    if (selected === 2 && !(this.secondaryPayerName && this.secondaryPayerName.trim().length > 0)) {
      alert('Secondary payer is required before selecting Bill To = Secondary.');
      this.claim.claBillTo = 0;
      this.cdr.markForCheck();
      return false;
    }
    return true;
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

  /**
   * Combined balance shown next to each note row: insurance balance + patient balance
   * captured on the audit row at the time the note was written. Returns null when both
   * sides are unknown so the UI can render a dash instead of "$0.00".
   */
  getNoteBalance(n: { insuranceBalance?: number | null; patientBalance?: number | null }): number | null {
    const ins = n?.insuranceBalance;
    const pat = n?.patientBalance;
    if (ins == null && pat == null) return null;
    return (Number(ins) || 0) + (Number(pat) || 0);
  }

  toggleNotes(): void {
    this.showNotes = !this.showNotes;
    this.cdr.markForCheck();
  }

  /** Reload service-line totals and audit notes without a full claim reload. */
  refreshClaimAndNotes(): void {
    if (!this.claId) return;
    this.refreshServiceLinesFromApi();
    this.loadClaimActivity(this.claId, true);
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
    claBillingPhyFID: number;
    claRenderingPhyFID: number;
    claFacilityPhyFID: number;
    noteText: string | null;
  }): any {
    if (!this.claim) return partial;
    const primaryPayerId = this.getSelectedPrimaryPayerId();

    // Always send the full claim update DTO so backend gets consistent shape.
    // Form-driven fields must come from partial (save handlers), not stale this.claim.
    return {
      claStatus: partial.claStatus,
      claClassification: partial.claClassification,
      claSubmissionMethod: partial.claSubmissionMethod ?? this.claim.claSubmissionMethod ?? null,
      claBillTo: this.claim.claBillTo ?? null,
      primaryPayerId,
      // Physician FKs: form selection only — never fall back to stale claim.billingPhysician (HL7 placeholder).
      claBillingPhyFID: partial.claBillingPhyFID,
      claRenderingPhyFID: partial.claRenderingPhyFID,
      claFacilityPhyFID: partial.claFacilityPhyFID,
      claInvoiceNumber: this.claim.claInvoiceNumber ?? null,
      claAdmittedDate: this.claim.claAdmittedDate ?? null,
      claDischargedDate: this.claim.claDischargedDate ?? null,
      claDateLastSeen: this.claim.claDateLastSeen ?? null,
      claBillDate: this.claim.claBillDate && String(this.claim.claBillDate).trim() !== '' ? this.claim.claBillDate : null,
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
      ...this.buildDiagnosisPayloadFields(),
      additionalData: this.claim.additionalData ?? undefined,
      noteText: partial.noteText
    };
  }

  private buildDiagnosisPayloadFields(): Record<string, string | null> {
    this.syncClaimDiagnosisClaimFromForm();
    const fields: Record<string, string | null> = {};
    for (const key of claimDiagnosisFieldKeys()) {
      const trimmed = (this.claimDiagnosisValues[key] ?? '').trim();
      fields[key] = trimmed || null;
    }
    return fields;
  }

  private syncClaimDiagnosisFormFromClaim(source?: Claim | Record<string, unknown> | null): void {
    const values = readClaimDiagnosisValues(source ?? this.claim);
    for (const key of claimDiagnosisFieldKeys()) {
      this.claimDiagnosisValues[key] = values[key] ?? '';
    }
  }

  private syncClaimDiagnosisClaimFromForm(): void {
    if (!this.claim) return;
    const claimRecord = this.claim as unknown as Record<string, unknown>;
    for (const key of claimDiagnosisFieldKeys()) {
      const trimmed = (this.claimDiagnosisValues[key] ?? '').trim();
      claimRecord[key] = trimmed || null;
    }
  }

  private getSelectedPrimaryPayerId(): number | null {
    const selected = Number(this.primaryPayerId ?? 0);
    return selected > 0 ? selected : null;
  }

  private getRecordString(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value : '';
  }

  get primaryDiagnosisFields(): Array<{ label: string; field: keyof Claim }> {
    return this.diagnosisFields.slice(0, 4);
  }

  get additionalDiagnosisFields(): Array<{ label: string; field: keyof Claim }> {
    return this.diagnosisFields.slice(4);
  }

  getStatusClass(status: string | null | undefined): string {
    const normalized = (status ?? '').toLowerCase();
    if (normalized.includes('denied') || normalized.includes('rejected')) return 'status-error';
    if (normalized.includes('pending') || normalized.includes('hold')) return 'status-warning';
    if (normalized.includes('paid') || normalized.includes('processed') || normalized.includes('complete')) return 'status-success';
    return 'status-neutral';
  }

  getClaimTotalCharge(): number {
    const claimAny = this.claim as any;
    const direct = Number(claimAny?.claTotalChargeTRIG ?? claimAny?.ClaTotalChargeTRIG);
    if (Number.isFinite(direct)) return direct;
    return this.getServiceTotalCharges();
  }

  getClaimTotalInsurancePaid(): number {
    const claimAny = this.claim as any;
    const direct = Number(claimAny?.claTotalInsAmtPaidTRIG ?? claimAny?.ClaTotalInsAmtPaidTRIG);
    if (Number.isFinite(direct)) return direct;
    return this.serviceLinesArray.reduce((sum, line) => sum + Number(line?.srvTotalInsAmtPaidTRIG ?? 0), 0);
  }

  getClaimTotalPatientBalance(): number {
    const claimAny = this.claim as any;
    const direct = Number(claimAny?.claTotalPatBalanceTRIG ?? claimAny?.ClaTotalPatBalanceTRIG);
    if (Number.isFinite(direct)) return direct;
    return this.serviceLinesArray.reduce((sum, line) => sum + Number(line?.srvTotalBalanceCC ?? 0), 0);
  }

}
