import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject, merge, finalize, throwError } from 'rxjs';
import { catchError, switchMap, tap, takeUntil } from 'rxjs/operators';
import { PatientApiService } from '../../core/services/patient-api.service';
import {
  PatientDetail,
  InsuranceInfo,
  InsuranceUpdate,
  UpdatePatientRequest,
} from '../../core/services/patient.models';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { PayerApiService } from '../../core/services/payer-api.service';
import { ListApiService, ListValueDto } from '../../core/services/list-api.service';
import { RibbonContextService } from '../../core/services/ribbon-context.service';
import { CustomFieldsApiService, CustomFieldDefinitionDto } from '../../core/services/custom-fields-api.service';
import { EligibilityApiService, EligibilityRequestResultDto, EligibilityStatusDto } from '../../core/services/eligibility-api.service';
import { EligibilityPollingService } from '../../core/services/eligibility-polling.service';
import { PatientEligibilityRefreshService } from '../../features/patients/services/patient-eligibility-refresh.service';
import { EligibilityResponsePayload } from '../eligibility-response/eligibility-response.models';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { FacilityService } from '../../core/services/facility.service';
import { FacilitiesApiService } from '../../core/services/facilities-api.service';
import { ProgramSettingsApiService } from '../../core/services/program-settings-api.service';
import { toHtmlDateInputValue } from '../../core/utils/html-date-input';
import {
  PhysicianSlotOption,
  filterPhysiciansForOperationalFacility,
  freezePhysicianSlotOptions,
  mapPhysicianApiRow
} from '../../core/utils/physician-slot-options.util';
import { ClaimTemplate, ClaimTemplateApiService } from '../../features/claim-template-library/claim-template-api.service';

type ProviderSlotRow = {
  label: string;
  controlName: string;
  emptyHintLabel: string;
};

@Component({
  selector: 'app-patient-details',
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientDetailsComponent implements OnInit, OnDestroy {
  patient: PatientDetail | null = null;
  isNewMode = false;
  patientForm!: FormGroup;
  loading = false;
  error: string | null = null;
  patId: number | null = null;
  newNote = '';
  saving = false;
  /** True when form/insurance differs from last successful load or save. */
  formDirty = false;
  private editorBaseline: string | null = null;

  claimTemplates: ClaimTemplate[] = [];
  eligibilityResponse: EligibilityResponsePayload | null = null;
  eligibilityRequest: EligibilityRequestResultDto | null = null;
  showEligibilityResponseViewer = true;
  private destroy$ = new Subject<void>();
  /** Stops eligibility modal polling when the user closes the modal. */
  private eligibilityPollStop$ = new Subject<void>();

  eligibilityActionInProgress = false;
  eligibilityPollingInProgress = false;
  /** Client polling window; backend may continue up to Awaiting271TimeoutMinutes. */
  eligibilityTimeoutMs = 30 * 60 * 1000;
  /** Poll GET /eligibility/{id} while modal is open. */
  private readonly eligibilityPollIntervalMs = 1500;
  /** Show "taking longer than expected" in modal without stopping server poll. */
  private readonly eligibilitySoftTimeoutMs = 120_000;
  private eligibilitySoftTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  eligibilityError: string | null = null;
  eligibilityTimedOut = false;

  /**
   * @deprecated Single shared list — kept only for back-compat with callers
   * that still iterate `physicians`. New code must use the slot-specific
   * arrays below (`renderingProviders`, `facilityProviders`, …) which are
   * loaded with proper backend classification filters.
   */
  physicians: readonly PhysicianSlotOption[] = [];

  /** Service Facility (PhyPrimaryCodeType=FA, Non-Person). */
  facilityProviders: readonly PhysicianSlotOption[] = [];
  /** Billing Provider (PhyPrimaryCodeType=BI, Non-Person). */
  billingProviders: readonly PhysicianSlotOption[] = [];
  /** Rendering Provider (PhyPrimaryCodeType=RE, Person). */
  renderingProviders: readonly PhysicianSlotOption[] = [];
  /** Referring Provider (PhyPrimaryCodeType=RF, Person). */
  referringProviders: readonly PhysicianSlotOption[] = [];
  /** Ordering Provider (PhyPrimaryCodeType=OP, Person). */
  orderingProviders: readonly PhysicianSlotOption[] = [];
  /** Supervising Provider (PhyPrimaryCodeType=SU, Person). */
  supervisingProviders: readonly PhysicianSlotOption[] = [];
  readonly providerSlotRows: readonly ProviderSlotRow[] = [
    { label: 'Billing Provider', controlName: 'patBillingPhyFID', emptyHintLabel: 'billing providers' },
    { label: 'Rendering Provider', controlName: 'patRenderingPhyFID', emptyHintLabel: 'rendering providers' },
    { label: 'Service Facility', controlName: 'patFacilityPhyFID', emptyHintLabel: 'service facilities' },
    { label: 'Referring Provider', controlName: 'patReferringPhyFID', emptyHintLabel: 'referring providers' },
    { label: 'Ordering Provider', controlName: 'patOrderingPhyFID', emptyHintLabel: 'ordering providers' },
    { label: 'Supervising Provider', controlName: 'patSupervisingPhyFID', emptyHintLabel: 'supervising providers' }
  ];

  /** Bumps when facility changes or physicians are reloaded — ignores stale HTTP responses. */
  private physicianLoadGeneration = 0;

  selectedFacilityId: number | null = null;
  selectedFacilityName: string | null = null;
  payers: Array<{ payID: number; payName: string }> = [];

  physicianPickerOpen = false;
  /** When opening the physician library, which patient form field to set (e.g. patFacilityPhyFID). */
  physicianPickerFor: string | null = null;

  payerLibraryOpen = false;

  classificationOptions: ListValueDto[] = [];

  readonly US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  readonly MARITAL_OPTIONS: { value: number | null; label: string }[] = [
    { value: null, label: '--' },
    { value: 0, label: 'Unknown' }, { value: 1, label: 'Single' }, { value: 2, label: 'Married' },
    { value: 3, label: 'Divorced' }, { value: 4, label: 'Widowed' }
  ];
  readonly APT_REMINDER_OPTIONS = ['No Reminders', 'Email', 'SMS', 'Phone'];
  readonly REMINDER_PROMPT_OPTIONS = ['Don\'t Prompt', 'Daily', 'Weekly'];
  readonly RELATION_TO_INSURED_OPTIONS: { value: number; label: string }[] = [
    { value: 0, label: 'Self' }, { value: 1, label: 'Spouse' }, { value: 2, label: 'Child' },
    { value: 3, label: 'Other' }
  ];
  readonly CLAIM_FILING_OPTIONS = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', 'BL', 'CH', 'CI', 'DS', 'HM', 'LI', 'LM', 'MA', 'MB', 'MC', 'OF', 'SI', 'SS', 'VA', 'WC'];

  /** Insurances 1-5 (Primary, Secondary, 3rd, 4th, 5th) */
  insuranceList: InsuranceInfo[] = [];

  /** Current tab 1-5 (sequence number) */
  insuranceTab = 1;
  insuranceLoaded = false;

  readonly MAX_INSURANCES = 5;
  readonly ngModelStandalone = { standalone: true };
  readonly INSURANCE_TAB_LABELS: Record<number, string> = {
    1: 'Primary Ins',
    2: 'Secondary Ins',
    3: '3rd Ins',
    4: '4th Ins',
    5: '5th Ins'
  };

  sectionsState = {
    patientInfo: true,
    contactInfo: true,
    physicianFacility: true,
    additionalClaim: true,
    otherPatient: true,
    additionalData: true,
    customFields: true,
    statement: true,
    reminderNote: true,
    patientNotes: true
  };

  /** Dynamic custom fields from Program Setup → Patient Custom Fields. */
  patientCustomFieldDefinitions: CustomFieldDefinitionDto[] = [];
  /** Current values keyed by fieldKey. */
  customFieldValues: Record<string, string> = {};


  private requestInFlight = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private patientApi: PatientApiService,
    private ribbonContext: RibbonContextService,
    private physicianApi: PhysicianApiService,
    private payerApi: PayerApiService,
    private listApi: ListApiService,
    private customFieldsApi: CustomFieldsApiService,
    private eligibilityApi: EligibilityApiService,
    private programSettingsApi: ProgramSettingsApiService,
    private facilityService: FacilityService,
    private facilitiesApi: FacilitiesApiService,
    private workspace: WorkspaceService,
    private cdr: ChangeDetectorRef,
    private eligibilityPolling: EligibilityPollingService,
    private eligibilityRefresh: PatientEligibilityRefreshService,
    private claimTemplateApi: ClaimTemplateApiService
  ) {}

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.formDirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  ngOnInit(): void {
    this.buildPatientForm();
    this.loadEligibilityViewerSetting();
    this.loadClaimTemplates();
    const idParam = this.route.snapshot.paramMap.get('patId');
    if (this.route.snapshot.routeConfig?.path === 'patients/new') {
      this.isNewMode = true;
      this.patId = null;
      this.patient = this.createEmptyPatient();
      this.ribbonContext.clearContext();
      this.loadClassificationOptions();
      this.loadPhysicians();
      this.loadSelectedFacilityName();
      this.loadPayers();
      this.insuranceList = [];
      this.insuranceLoaded = true;
      this.workspace.updateActiveTabTitle('New Patient');
      this.cdr.markForCheck();
    } else if (idParam && !Number.isNaN(Number(idParam))) {
      this.patId = +idParam;
      const claimIdParam = this.route.snapshot.queryParamMap.get('claimId');
      const fromClaimId = claimIdParam ? parseInt(claimIdParam, 10) : null;
      this.ribbonContext.setContext({
        patientId: this.patId,
        claimId: fromClaimId && !isNaN(fromClaimId) ? fromClaimId : null
      });
      this.loadClassificationOptions();
      this.loadPhysicians();
      this.loadSelectedFacilityName();
      this.loadPayers();
      this.loadPatient(this.patId);
    } else {
      this.error = 'Invalid patient ID';
      this.cdr.markForCheck();
    }

    let facilityWatchInitialized = false;
    this.facilityService.facilityId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((facilityId) => {
        const prev = this.selectedFacilityId;
        this.selectedFacilityId = facilityId;
        if (!facilityWatchInitialized) {
          facilityWatchInitialized = true;
          return;
        }
        if (prev === facilityId) {
          return;
        }
        this.clearPhysicianSlotState();
        this.loadSelectedFacilityName();
        this.loadPhysicians();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.clearEligibilitySoftTimeout();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createEmptyPatient(): PatientDetail {
    const nowIso = new Date().toISOString();
    return {
      patID: 0,
      patFirstName: null,
      patLastName: null,
      patMI: null,
      patFullNameCC: null,
      patAccountNo: null,
      patActive: true,
      patBirthDate: null,
      patSSN: null,
      patSex: null,
      patAddress: null,
      patAddress2: null,
      patCity: null,
      patState: null,
      patZip: null,
      patPhoneNo: null,
      patCellPhoneNo: null,
      patHomePhoneNo: null,
      patWorkPhoneNo: null,
      patFaxNo: null,
      patPriEmail: null,
      patSecEmail: null,
      patClassification: null,
      patClaLibFID: 0,
      patCoPayAmount: null,
      patDiagnosis1: null,
      patDiagnosis2: null,
      patDiagnosis3: null,
      patDiagnosis4: null,
      patEmployed: null,
      patMarried: null,
      patRenderingPhyFID: 0,
      patBillingPhyFID: 0,
      patFacilityPhyFID: 0,
      patReferringPhyFID: 0,
      patOrderingPhyFID: 0,
      patSupervisingPhyFID: 0,
      patStatementName: null,
      patStatementAddressLine1: null,
      patStatementAddressLine2: null,
      patStatementCity: null,
      patStatementState: null,
      patStatementZipCode: null,
      patStatementMessage: null,
      patReminderNote: null,
      patEmergencyContactName: null,
      patEmergencyContactPhoneNo: null,
      patEmergencyContactRelation: null,
      patWeight: null,
      patHeight: null,
      patMemberID: null,
      patSigOnFile: false,
      patInsuredSigOnFile: false,
      patPrintSigDate: false,
      patPhyPrintDate: false,
      patDontSendPromotions: false,
      patDontSendStatements: false,
      patAuthTracking: false,
      patAptReminderPref: null,
      patReminderNoteEvent: null,
      patSigSource: null,
      patCoPayPercent: null,
      patCustomField1: null,
      patCustomField2: null,
      patCustomField3: null,
      patCustomField4: null,
      patCustomField5: null,
      patExternalFID: null,
      patPaymentMatchingKey: null,
      patLastStatementDateTRIG: null,
      patTotalBalanceCC: null,
      patDateTimeCreated: nowIso,
      patDateTimeModified: nowIso,
      primaryInsurance: null,
      secondaryInsurance: null,
      insuranceList: [],
      renderingPhysician: null,
      billingPhysician: null,
      facilityPhysician: null,
      referringPhysician: null,
      orderingPhysician: null,
      supervisingPhysician: null,
      patientNotes: []
    };
  }

  private buildPatientForm(): void {
    this.patientForm = this.fb.group({
      patFirstName: [''],
      patLastName: [''],
      patMI: [''],
      patAddress: [''],
      patAddress2: [''],
      patCity: [''],
      patState: [null as string | null],
      patZip: [''],
      patBirthDate: [null as string | null],
      patSex: [null as string | null],
      patMarried: [null as number | null],
      patEmployed: [null as number | null],
      patAccountNo: [''],
      patClassification: [null as string | null],
      patClaLibFID: [0],
      patCoPayAmount: [null as number | null],
      patCoPayPercent: [null as number | null],
      patDiagnosis1: [''],
      patDiagnosis2: [''],
      patDiagnosis3: [''],
      patDiagnosis4: [''],
      patPhoneNo: [''],
      patHomePhoneNo: [''],
      patCellPhoneNo: [''],
      patWorkPhoneNo: [''],
      patFaxNo: [''],
      patPriEmail: [''],
      patSecEmail: [''],
      patAptReminderPref: [null as string | null],
      patEmergencyContactName: [''],
      patEmergencyContactPhoneNo: [''],
      patEmergencyContactRelation: [''],
      patRenderingPhyFID: [0],
      patBillingPhyFID: [0],
      patFacilityPhyFID: [0],
      patReferringPhyFID: [0],
      patOrderingPhyFID: [0],
      patSupervisingPhyFID: [0],
      patPhyPrintDate: [false],
      patSigOnFile: [false],
      patPrintSigDate: [false],
      patInsuredSigOnFile: [false],
      patSigSource: [null as string | null],
      patBox8Reserved: [''],
      patSSN: [''],
      patWeight: [''],
      patHeight: [''],
      patMemberID: [''],
      patStatementName: [''],
      patStatementAddressLine1: [''],
      patStatementAddressLine2: [''],
      patStatementCity: [''],
      patStatementState: [null as string | null],
      patStatementZipCode: [''],
      patStatementMessage: [''],
      patDontSendStatements: [false],
      patDontSendPromotions: [false],
      patReminderNote: [''],
      patReminderNoteEvent: [null as string | null],
      patCustomField1: [''],
      patCustomField2: [''],
      patCustomField3: [''],
      patCustomField4: [''],
      patCustomField5: [''],
      patExternalFID: [''],
      patPaymentMatchingKey: [''],
      patActive: [true],
      patAuthTracking: [false]
    });

    this.patientForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshDirtyFlag());
  }

  private serializeEditorState(): string {
    return JSON.stringify({
      form: this.patientForm.getRawValue(),
      insurance: this.insuranceList,
      custom: this.customFieldValues
    });
  }

  private markEditorClean(): void {
    this.editorBaseline = this.serializeEditorState();
    this.formDirty = false;
    this.cdr.markForCheck();
  }

  private refreshDirtyFlag(): void {
    if (!this.editorBaseline) {
      return;
    }
    const dirty = this.serializeEditorState() !== this.editorBaseline;
    if (dirty !== this.formDirty) {
      this.formDirty = dirty;
      this.cdr.markForCheck();
    }
  }

  onInsuranceFieldChanged(): void {
    this.refreshDirtyFlag();
  }

  private loadClaimTemplates(): void {
    this.claimTemplateApi.getAll().subscribe({
      next: (list) => {
        this.claimTemplates = list ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.claimTemplates = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadClassificationOptions(): void {
    this.listApi.getListValues('Patient Classification').subscribe({
      next: (r) => {
        this.classificationOptions = (r.data || []).slice().sort((a, b) => (a.value || '').localeCompare(b.value || ''));
        this.cdr.markForCheck();
      },
      error: () => {
        this.classificationOptions = [];
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Loads the six provider dropdown datasets from the backend, each filtered
   * by classification at the SQL layer. We make six small (typically <200
   * row) HTTP calls instead of fetching one 10k-row blob and filtering in
   * memory. Placeholders are excluded server-side by default.
   *
   * Slot mapping (mirrors backend `PhysicianTaxonomy.Classification`):
   *   * Rendering     → RE, Person
   *   * Service Fac.  → FA, Non-Person
   *   * Referring     → RF, Person
   *   * Ordering      → OP, Person
   *   * Supervising   → SU, Person
   */
  loadPhysicians(): void {
    const generation = ++this.physicianLoadGeneration;
    const facilityId = this.selectedFacilityId ?? this.facilityService.getFacilityIdOptional();
    let slotsPending = 8;

    const slotLoaded = (): void => {
      slotsPending -= 1;
      if (slotsPending <= 0) {
        this.reconcileAssignedProvidersWithFacility();
      }
    };

    const loadSlot = (
      filters: Parameters<PhysicianApiService['getPhysicians']>[2],
      assign: (rows: readonly PhysicianSlotOption[]) => void
    ) => {
      this.physicianApi.getPhysicians(1, 500, filters).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          if (generation !== this.physicianLoadGeneration) return;
          const mapped = (r.data ?? []).map(mapPhysicianApiRow);
          assign(freezePhysicianSlotOptions(filterPhysiciansForOperationalFacility(mapped, facilityId)));
          slotLoaded();
          this.cdr.markForCheck();
        },
        error: () => {
          if (generation !== this.physicianLoadGeneration) return;
          assign(freezePhysicianSlotOptions([]));
          slotLoaded();
          this.cdr.markForCheck();
        }
      });
    };

    loadSlot(
      { inactive: false, classification: 'BI', isFacility: true, excludePlaceholders: true },
      (rows) => { this.billingProviders = rows; }
    );

    loadSlot(
      { inactive: false, classification: 'FA', isFacility: true, excludePlaceholders: true },
      (rows) => { this.facilityProviders = rows; }
    );

    loadSlot(
      { inactive: false, classification: 'RE', isPerson: true, excludePlaceholders: true },
      (rows) => { this.renderingProviders = rows; }
    );

    loadSlot(
      { inactive: false, classification: 'RF', isPerson: true, excludePlaceholders: true },
      (rows) => { this.referringProviders = rows; }
    );

    loadSlot(
      { inactive: false, classification: 'OP', isPerson: true, excludePlaceholders: true },
      (rows) => { this.orderingProviders = rows; }
    );

    loadSlot(
      { inactive: false, classification: 'SU', isPerson: true, excludePlaceholders: true },
      (rows) => { this.supervisingProviders = rows; }
    );

    this.physicianApi.getPhysicians(1, 1000, { inactive: false, excludePlaceholders: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (generation !== this.physicianLoadGeneration) return;
          const mapped = (r.data ?? []).map(mapPhysicianApiRow);
          this.physicians = freezePhysicianSlotOptions(
            filterPhysiciansForOperationalFacility(mapped, facilityId)
          );
          slotLoaded();
          this.cdr.markForCheck();
        },
        error: () => {
          if (generation !== this.physicianLoadGeneration) return;
          this.physicians = freezePhysicianSlotOptions([]);
          slotLoaded();
          this.cdr.markForCheck();
        }
      });
  }

  private clearPhysicianSlotState(): void {
    this.physicians = freezePhysicianSlotOptions([]);
    this.billingProviders = freezePhysicianSlotOptions([]);
    this.facilityProviders = freezePhysicianSlotOptions([]);
    this.renderingProviders = freezePhysicianSlotOptions([]);
    this.referringProviders = freezePhysicianSlotOptions([]);
    this.orderingProviders = freezePhysicianSlotOptions([]);
    this.supervisingProviders = freezePhysicianSlotOptions([]);
  }

  /**
   * Clears provider FK fields that point outside the active facility so stale
   * cross-facility assignments (e.g. from another site) never appear as selected.
   */
  private reconcileAssignedProvidersWithFacility(): void {
    const facilityId = this.selectedFacilityId ?? this.facilityService.getFacilityIdOptional();
    if (!facilityId || facilityId <= 0 || !this.patientForm) return;

    const slots: Array<{ control: string; pool: readonly PhysicianSlotOption[] }> = [
      { control: 'patBillingPhyFID', pool: this.billingProviders },
      { control: 'patFacilityPhyFID', pool: this.facilityProviders },
      { control: 'patRenderingPhyFID', pool: this.renderingProviders },
      { control: 'patReferringPhyFID', pool: this.referringProviders },
      { control: 'patOrderingPhyFID', pool: this.orderingProviders },
      { control: 'patSupervisingPhyFID', pool: this.supervisingProviders },
    ];

    const patch: Record<string, number> = {};
    for (const { control, pool } of slots) {
      const id = Number(this.patientForm.get(control)?.value) || 0;
      if (id <= 0) continue;
      const inPool = pool.some((p) => p.phyID === id);
      if (!inPool) {
        patch[control] = 0;
      }
    }
    if (Object.keys(patch).length > 0) {
      this.patientForm.patchValue(patch);
    }

    const formBillingId = Number(this.patientForm.get('patBillingPhyFID')?.value) || 0;
    if (formBillingId <= 0) {
      const preferredBillingId =
        Number(this.patient?.resolvedBillingProviderId ?? 0)
        || (this.billingProviders.length === 1 ? this.billingProviders[0].phyID : 0);
      if (preferredBillingId > 0 && this.billingProviders.some((p) => p.phyID === preferredBillingId)) {
        this.patientForm.patchValue({ patBillingPhyFID: preferredBillingId });
      }
    }
  }

  private getSlotPool(controlName: string): readonly PhysicianSlotOption[] {
    switch (controlName) {
      case 'patBillingPhyFID': return this.billingProviders;
      case 'patRenderingPhyFID': return this.renderingProviders;
      case 'patFacilityPhyFID': return this.facilityProviders;
      case 'patReferringPhyFID': return this.referringProviders;
      case 'patOrderingPhyFID': return this.orderingProviders;
      case 'patSupervisingPhyFID': return this.supervisingProviders;
      default: return [];
    }
  }

  getSlotOptions(controlName: string): readonly PhysicianSlotOption[] {
    return this.getSlotPool(controlName);
  }

  isBillingSlot(controlName: string): boolean {
    return controlName === 'patBillingPhyFID';
  }

  isSlotPoolEmpty(controlName: string): boolean {
    return this.getSlotPool(controlName).length === 0;
  }

  /** Strict per-slot selection guard to prevent cross-slot ID leakage. */
  onProviderSlotChange(controlName: string): void {
    if (!this.patientForm.contains(controlName)) return;
    const current = Number(this.patientForm.get(controlName)?.value) || 0;
    if (current <= 0) return;
    const pool = this.getSlotPool(controlName);
    if (!pool.some((p) => p.phyID === current)) {
      this.patientForm.patchValue({ [controlName]: 0 });
      this.cdr.markForCheck();
    }
  }

  private loadSelectedFacilityName(): void {
    const selectedId = this.facilityService.getFacilityIdOptional();
    this.selectedFacilityId = selectedId;
    if (selectedId == null || selectedId <= 0) {
      this.selectedFacilityName = null;
      this.clearPhysicianSlotState();
    }
    this.facilitiesApi.getMyFacilities().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        const list = rows ?? [];
        let effectiveId = this.selectedFacilityId;
        if ((!effectiveId || effectiveId <= 0) && list.length === 1) {
          effectiveId = Number(list[0].facilityId) || null;
          this.selectedFacilityId = effectiveId;
        }
        const matched = list.find((f) => Number(f.facilityId) === Number(effectiveId));
        this.selectedFacilityName = matched?.name?.trim() || null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedFacilityName = null;
        this.selectedFacilityId = null;
        this.clearPhysicianSlotState();
      }
    });
  }

  loadPayers(): void {
    this.payerApi.getPayers(1, 1000, { inactive: false }).subscribe({
      next: (r) => {
        this.payers = (r.data || []).map((p: any) => ({ payID: p.payID, payName: p.payName || 'Unknown' }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.payers = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadPatient(patId: number): void {
    if (this.requestInFlight) return;
    this.loading = true;
    this.error = null;
    this.insuranceLoaded = false;
    this.requestInFlight = true;

    this.patientApi.getPatientById(patId).pipe(
      finalize(() => {
        this.loading = false;
        this.requestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (p: PatientDetail) => {
        this.patient = p;
        this.patientForm.patchValue(this.patientToFormValue(p));
        this.reconcileAssignedProvidersWithFacility();
        this.bindInsuranceFromApi(p);
        this.insuranceLoaded = true;
        this.loadPatientCustomFieldsAndValues(patId);
        const title = this.toFullName(p.patFirstName, p.patLastName, p.patFullNameCC);
        const claimId = this.ribbonContext.getContext().claimId;
        this.ribbonContext.setContext({
          patientId: this.patId,
          claimId,
          patientName: title || null
        });
        if (title) this.workspace.updateActiveTabTitle(title);
        this.markEditorClean();
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 404) {
          this.error = `Patient ${patId} not found.`;
        } else {
          this.error = 'Failed to load patient. Please try again.';
        }
        console.error('Error loading patient:', err);
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

  private patientToFormValue(p: PatientDetail): Record<string, unknown> {
    return {
      patFirstName: p.patFirstName ?? '',
      patLastName: p.patLastName ?? '',
      patMI: p.patMI ?? '',
      patAddress: p.patAddress ?? '',
      patAddress2: p.patAddress2 ?? '',
      patCity: p.patCity ?? '',
      patState: p.patState ?? null,
      patZip: p.patZip ?? '',
      // API returns DateTime as ISO (e.g. 1957-01-23T00:00:00); <input type="date"> needs yyyy-MM-dd
      patBirthDate: toHtmlDateInputValue(p.patBirthDate),
      patSex: p.patSex ?? null,
      patMarried: p.patMarried ?? null,
      patEmployed: p.patEmployed ?? null,
      patAccountNo: p.patAccountNo ?? '',
      patClassification: p.patClassification ?? null,
      patClaLibFID: p.patClaLibFID ?? 0,
      patCoPayAmount: p.patCoPayAmount ?? null,
      patCoPayPercent: p.patCoPayPercent ?? null,
      patDiagnosis1: p.patDiagnosis1 ?? '',
      patDiagnosis2: p.patDiagnosis2 ?? '',
      patDiagnosis3: p.patDiagnosis3 ?? '',
      patDiagnosis4: p.patDiagnosis4 ?? '',
      patPhoneNo: p.patPhoneNo ?? '',
      patHomePhoneNo: p.patHomePhoneNo ?? '',
      patCellPhoneNo: p.patCellPhoneNo ?? '',
      patWorkPhoneNo: p.patWorkPhoneNo ?? '',
      patFaxNo: p.patFaxNo ?? '',
      patPriEmail: p.patPriEmail ?? '',
      patSecEmail: p.patSecEmail ?? '',
      patAptReminderPref: p.patAptReminderPref ?? null,
      patEmergencyContactName: p.patEmergencyContactName ?? '',
      patEmergencyContactPhoneNo: p.patEmergencyContactPhoneNo ?? '',
      patEmergencyContactRelation: p.patEmergencyContactRelation ?? '',
      patRenderingPhyFID: p.patRenderingPhyFID ?? 0,
      patBillingPhyFID: p.persistedBillingProviderId ?? p.patBillingPhyFID ?? 0,
      patFacilityPhyFID: p.patFacilityPhyFID ?? 0,
      patReferringPhyFID: p.patReferringPhyFID ?? 0,
      patOrderingPhyFID: p.patOrderingPhyFID ?? 0,
      patSupervisingPhyFID: p.patSupervisingPhyFID ?? 0,
      patPhyPrintDate: p.patPhyPrintDate ?? false,
      patSigOnFile: p.patSigOnFile ?? false,
      patPrintSigDate: p.patPrintSigDate ?? false,
      patInsuredSigOnFile: p.patInsuredSigOnFile ?? false,
      patSigSource: p.patSigSource ?? null,
      patBox8Reserved: (p as any).patBox8Reserved ?? '',
      patSSN: p.patSSN ?? '',
      patWeight: p.patWeight ?? '',
      patHeight: p.patHeight ?? '',
      patMemberID: p.patMemberID ?? '',
      patStatementName: p.patStatementName ?? '',
      patStatementAddressLine1: p.patStatementAddressLine1 ?? '',
      patStatementAddressLine2: p.patStatementAddressLine2 ?? '',
      patStatementCity: p.patStatementCity ?? '',
      patStatementState: p.patStatementState ?? null,
      patStatementZipCode: p.patStatementZipCode ?? '',
      patStatementMessage: p.patStatementMessage ?? '',
      patDontSendStatements: p.patDontSendStatements ?? false,
      patDontSendPromotions: p.patDontSendPromotions ?? false,
      patReminderNote: p.patReminderNote ?? '',
      patReminderNoteEvent: p.patReminderNoteEvent ?? null,
      patCustomField1: p.patCustomField1 ?? '',
      patCustomField2: p.patCustomField2 ?? '',
      patCustomField3: p.patCustomField3 ?? '',
      patCustomField4: p.patCustomField4 ?? '',
      patCustomField5: p.patCustomField5 ?? '',
      patExternalFID: p.patExternalFID ?? '',
      patPaymentMatchingKey: p.patPaymentMatchingKey ?? '',
      patActive: p.patActive ?? true,
      patAuthTracking: p.patAuthTracking ?? false
    };
  }

  /** Bind insurance from API */
  private bindInsuranceFromApi(p: PatientDetail): void {
    const list = p.insuranceList && p.insuranceList.length > 0
      ? p.insuranceList
      : [p.primaryInsurance, p.secondaryInsurance].filter(Boolean) as InsuranceInfo[];
    this.insuranceList = list.map(ins => this.normalizeInsurance(ins)!).filter(Boolean);
    if (this.insuranceTab > this.insuranceList.length && this.insuranceList.length > 0) {
      this.insuranceTab = 1;
    }
  }

  get currentInsurance(): InsuranceInfo | null {
    const found = this.insuranceList.find(i => i.patInsSequence === this.insuranceTab);
    return found ?? this.insuranceList[this.insuranceTab - 1] ?? null;
  }

  get hasPrimaryInsurance(): boolean {
    return this.insuranceList.some(ins => ins.patInsSequence === 1);
  }

  get canUpdateClaims(): boolean {
    return !this.saving && this.hasPrimaryInsurance;
  }

  get canAddInsurance(): boolean {
    return this.insuranceList.length < this.MAX_INSURANCES;
  }

  /** Tabs for Secondary, 3rd, 4th, 5th ins (Primary always shown separately) */
  get additionalInsuranceTabs(): InsuranceInfo[] {
    return this.insuranceList.filter(i => i.patInsSequence > 1);
  }

  hasInsuranceAtSequence(seq: number): boolean {
    return this.insuranceList.some(i => i.patInsSequence === seq);
  }

  getInsuranceTabLabel(seq: number): string {
    return this.INSURANCE_TAB_LABELS[seq] ?? `Ins ${seq}`;
  }

  selectInsuranceTab(seq: number): void {
    this.insuranceTab = seq;
    this.cdr.markForCheck();
  }

  private normalizeInsurance(ins: InsuranceInfo | null | undefined): InsuranceInfo | null {
    if (!ins) return null;
    return {
      ...ins,
      patInsGUID: ins.patInsGUID ?? '',
      insAcceptAssignment: ins.insAcceptAssignment ?? 0,
      patInsActive: ins.patInsActive ?? true,
      patInsLocked: ins.patInsLocked ?? false,
      insBirthDate: toHtmlDateInputValue(ins.insBirthDate),
      patInsEligDate: toHtmlDateInputValue(ins.patInsEligDate)
    };
  }

  private loadPatientCustomFieldsAndValues(patId: number): void {
    this.customFieldsApi.getByEntityType('Patient').subscribe({
      next: defs => {
        this.patientCustomFieldDefinitions = defs ?? [];
        this.customFieldsApi.getValues('Patient', patId).subscribe({
          next: values => {
            this.customFieldValues = { ...values };
            this.cdr.markForCheck();
          },
          error: () => {
            this.customFieldValues = {};
            this.cdr.markForCheck();
          }
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.patientCustomFieldDefinitions = [];
        this.cdr.markForCheck();
      }
    });
  }

  getCustomFieldValue(fieldKey: string): string {
    return this.customFieldValues[fieldKey] ?? '';
  }

  setCustomFieldValue(fieldKey: string, value: string): void {
    this.customFieldValues = { ...this.customFieldValues, [fieldKey]: value };
    this.cdr.markForCheck();
  }

  private saveCustomFieldValues(): void {
    const patId = this.patId;
    if (patId == null || this.patientCustomFieldDefinitions.length === 0) return;
    this.patientCustomFieldDefinitions.forEach(def => {
      const value = this.customFieldValues[def.fieldKey] ?? '';
      this.customFieldsApi.saveValue({
        entityType: 'Patient',
        entityId: patId,
        fieldKey: def.fieldKey,
        value: value || null
      }).subscribe({ error: () => { /* ignore per-field errors */ } });
    });
  }

  refreshPhysicians(): void {
    this.loadPhysicians();
  }

  checkEligibility(): void {
    if (!this.patient?.patID) return;
    if (this.eligibilityActionInProgress) return;
    if (this.formDirty) {
      alert('Save patient changes before checking eligibility.');
      return;
    }
    if (!this.hasPrimaryInsurance) {
      alert('Patient has no primary insurance.');
      return;
    }

    const patientId = this.patient.patID;
    this.eligibilityError = null;
    this.eligibilityTimedOut = false;
    this.eligibilityActionInProgress = true;
    this.eligibilityPollingInProgress = true;
    this.clearEligibilitySoftTimeout();
    this.eligibilityPollStop$.next();

    this.eligibilityApi
      .preflight(patientId)
      .pipe(
        switchMap(pf => {
          if (!pf.valid) {
            return throwError(() => new Error((pf.errors ?? []).join('\n') || 'Eligibility preflight failed.'));
          }
          return this.eligibilityApi.request(patientId);
        }),
        tap(request => {
          this.eligibilityRequest = request;
          if (request?.id) {
            this.saveLastEligibilityRequestId(patientId, request.id);
          }
          this.openEligibilityModalForRequest(request);
        }),
        switchMap(request => {
          this.startEligibilitySoftTimeout();
          return this.eligibilityPolling.pollWithUpdates(
            request.id,
            { intervalMs: this.eligibilityPollIntervalMs, timeoutMs: this.eligibilityTimeoutMs },
            this.destroy$
          );
        }),
        takeUntil(merge(this.destroy$, this.eligibilityPollStop$)),
        catchError(err => {
          this.clearEligibilitySoftTimeout();
          if (err?.message === 'ELIGIBILITY_POLL_TIMEOUT') {
            this.eligibilityTimedOut = true;
            this.eligibilityError =
              'No response in this session yet. The inquiry may still be processing on the server — use VIEW later or check Program Setup.';
            this.patchEligibilityModal({ pollTimedOut: true, isLoading: false });
          } else {
            const message = err?.message ?? 'Eligibility check failed.';
            this.eligibilityError = message;
            if (this.eligibilityResponse) {
              this.patchEligibilityModal({ isLoading: false, errorMessage: message });
            }
          }
          return EMPTY;
        }),
        finalize(() => {
          this.clearEligibilitySoftTimeout();
          this.eligibilityActionInProgress = false;
          this.eligibilityPollingInProgress = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(status => {
        if (!status) return;
        this.updateEligibilityModalFromStatus(status);
        if (EligibilityPollingService.isTerminal(status)) {
          this.applyEligibilityStatusFromDto(status);
          if (this.patId) {
            this.eligibilityRefresh.notify(this.patId);
            this.loadPatient(this.patId);
          }
        }
      });
  }

  closeEligibilityModal(): void {
    this.eligibilityPollStop$.next();
    this.clearEligibilitySoftTimeout();
    this.eligibilityResponse = null;
    this.eligibilityPollingInProgress = false;
    this.cdr.markForCheck();
  }

  viewEligibility(): void {
    if (!this.patient?.patID) return;
    const patientId = this.patient.patID;

    this.eligibilityApi
      .getPatientHistory(patientId)
      .pipe(
        switchMap(history => {
          const preferredId =
            this.eligibilityRequest?.id ??
            this.getLastEligibilityRequestId(patientId) ??
            history[0]?.inquiryId ??
            null;

          if (!preferredId) {
            return throwError(() => new Error('No eligibility history found for this patient.'));
          }

          return this.eligibilityApi.getById(preferredId, true, true);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: status => this.presentEligibilityResult(status, true),
        error: err => alert(err?.message || err?.error?.error || 'Failed to load eligibility response.')
      });
  }

  private saveLastEligibilityRequestId(patientId: number, requestId: number): void {
    try {
      localStorage.setItem(this.lastEligibilityRequestKey(patientId), String(requestId));
    } catch {
      // ignore
    }
  }

  private getLastEligibilityRequestId(patientId: number): number | null {
    try {
      const raw = localStorage.getItem(this.lastEligibilityRequestKey(patientId));
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  private lastEligibilityRequestKey(patientId: number): string {
    return `zebl:eligibility:lastRequestId:pat:${patientId}`;
  }

  private loadEligibilityViewerSetting(): void {
    this.programSettingsApi.getSection('patientEligibility').subscribe({
      next: data => {
        this.showEligibilityResponseViewer = data?.showEligibilityResponseViewer !== false;
      },
      error: () => {
        this.showEligibilityResponseViewer = true;
      }
    });
  }

  private openEligibilityModalForRequest(request: EligibilityRequestResultDto): void {
    const context = this.buildEligibilityPatientContext();
    this.eligibilityResponse = {
      ...context,
      inquiryId: request.id,
      isLoading: true,
      pollTimedOut: false,
      inquiryStatus: request.status ?? 'Queued',
      status: 'Checking',
      controlNumber: request.controlNumber,
      batchFileName: request.batchFileName ?? null,
      providerNpi: request.providerNpi ?? null,
      providerMode: request.providerMode ?? null,
      usedPayerOverride: request.usedPayerOverride ?? false,
      createdAt: new Date().toISOString(),
      benefits: [],
      payerName: context.payerName ?? this.currentInsurance?.payerName ?? null
    };
    this.cdr.markForCheck();
  }

  private updateEligibilityModalFromStatus(status: EligibilityStatusDto): void {
    const terminal = EligibilityPollingService.isTerminal(status);
    this.eligibilityResponse = {
      ...this.buildEligibilityPayloadFromStatus(status),
      inquiryId: status.id,
      isLoading: !terminal,
      pollTimedOut: !terminal && (this.eligibilityResponse?.pollTimedOut ?? false)
    };
    this.cdr.markForCheck();
  }

  private patchEligibilityModal(patch: Partial<EligibilityResponsePayload>): void {
    if (!this.eligibilityResponse) return;
    this.eligibilityResponse = { ...this.eligibilityResponse, ...patch };
    this.cdr.markForCheck();
  }

  private buildEligibilityPatientContext(): Partial<EligibilityResponsePayload> {
    const ins = this.currentInsurance;
    const subscriberName = ins
      ? [ins.insLastName, ins.insFirstName].filter(Boolean).join(', ').toUpperCase() || null
      : null;
    const v = this.patientForm?.getRawValue?.() ?? {};
    const addressParts = [v.patAddress, v.patAddress2, v.patCity, v.patState, v.patZip].filter(
      (x: string) => !!x?.trim?.()
    );

    return {
      patientName: this.getPatientName(),
      patientDob: v.patBirthDate ?? this.patient?.patBirthDate ?? null,
      patientGender: this.formatPatientGender(v.patSex ?? this.patient?.patSex),
      memberId: ins?.insIDNumber ?? null,
      subscriberName: subscriberName ?? this.getPatientName(),
      patientAddress: addressParts.length ? addressParts.join(', ') : null,
      payerName: ins?.payerName ?? null
    };
  }

  private buildEligibilityPayloadFromStatus(status: EligibilityStatusDto): EligibilityResponsePayload {
    const lifecycle = (status.lifecycleStatus ?? status.status ?? '').trim();
    const inFlight = lifecycle && !EligibilityPollingService.isTerminal(status);
    return {
      ...this.buildEligibilityPatientContext(),
      payerName: status.payerName ?? this.currentInsurance?.payerName ?? null,
      status: inFlight ? 'Checking' : (status.eligibilityStatus || status.status),
      inquiryStatus: lifecycle || status.status,
      createdAt: status.createdAt,
      controlNumber: status.controlNumber,
      batchFileName: status.batchFileName ?? null,
      raw271: status.raw271 ?? null,
      raw270: status.raw270 ?? null,
      transportMetadataJson: status.transportMetadataJson ?? null,
      planName: status.planName,
      planDetails: status.planDetails,
      eligibilityStartDate: status.eligibilityStartDate,
      eligibilityEndDate: status.eligibilityEndDate,
      benefits: status.benefits ?? [],
      structured271: status.structured271 ?? null,
      presentation: status.presentation ?? null,
      errorMessage: status.errorMessage,
      payerMessage: status.payerMessage,
      rejectionCode: status.rejectionCode,
      rejectionReason: status.rejectionReason,
      providerNpi: status.providerNpi,
      providerMode: status.providerMode,
      usedPayerOverride: status.usedPayerOverride
    };
  }

  private startEligibilitySoftTimeout(): void {
    this.clearEligibilitySoftTimeout();
    this.eligibilitySoftTimeoutHandle = setTimeout(() => {
      if (this.eligibilityResponse?.isLoading) {
        this.patchEligibilityModal({ pollTimedOut: true });
      }
    }, this.eligibilitySoftTimeoutMs);
  }

  private clearEligibilitySoftTimeout(): void {
    if (this.eligibilitySoftTimeoutHandle != null) {
      clearTimeout(this.eligibilitySoftTimeoutHandle);
      this.eligibilitySoftTimeoutHandle = null;
    }
  }

  private presentEligibilityResult(status: EligibilityStatusDto, forceViewer: boolean): void {
    if (forceViewer || this.showEligibilityResponseViewer) {
      const terminal = EligibilityPollingService.isTerminal(status);
      this.eligibilityResponse = {
        ...this.buildEligibilityPayloadFromStatus(status),
        inquiryId: status.id,
        isLoading: !terminal,
        pollTimedOut: false
      };
      this.cdr.markForCheck();
      return;
    }

    const mode = status.providerMode ?? '';
    const npi = status.providerNpi ?? '';
    const providerLine =
      npi ? `\nEligibility checked using provider: ${npi}${mode ? ` (${mode})` : ''}` : '';
    const overrideWarn = status.usedPayerOverride ? '\nUsing payer-specific provider override' : '';
    alert(`Eligibility completed: ${status.eligibilityStatus || 'Unknown'}${providerLine}${overrideWarn}`);
  }

  openPhysicianPicker(controlName?: string): void {
    this.physicianPickerFor = controlName ?? null;
    this.physicianPickerOpen = true;
    this.cdr.markForCheck();
  }

  closePhysicianPicker(): void {
    this.physicianPickerOpen = false;
    this.physicianPickerFor = null;
    this.loadPhysicians();
    this.cdr.markForCheck();
  }

  getPhysicianPickerInitialId(): number {
    if (!this.physicianPickerFor) return 0;
    const v = this.patientForm.get(this.physicianPickerFor)?.value;
    return (v != null && Number(v)) ? Number(v) : 0;
  }

  onPhysicianSelected(physician: { phyID: number }): void {
    if (this.physicianPickerFor === 'patBillingPhyFID') {
      const isValidBilling = this.billingProviders.some((p) => p.phyID === physician.phyID);
      if (!isValidBilling) {
        alert('Selected provider is not a valid Billing Provider for this facility.');
        return;
      }
    }
    if (this.physicianPickerFor && this.patientForm.contains(this.physicianPickerFor)) {
      this.patientForm.patchValue({ [this.physicianPickerFor]: physician.phyID });
      this.cdr.markForCheck();
    }
    this.closePhysicianPicker();
  }

  getBox8DateValue(): string {
    return this.patientForm.get('patBox8Reserved')?.value ?? '';
  }

  setBox8DateValue(value: string): void {
    this.patientForm.patchValue({ patBox8Reserved: value || '' });
    this.cdr.markForCheck();
  }

  setSignatureSourceToInitial(): void {
    this.patientForm.patchValue({ patSigSource: 'I' });
    this.cdr.markForCheck();
  }

  clearPhysician(controlName: string): void {
    this.patientForm.patchValue({ [controlName]: 0 });
    this.cdr.markForCheck();
  }

  parseInsuredName(value: string, ins: InsuranceInfo): void {
    const parts = (value || '').split(',').map(s => s.trim());
    ins.insLastName = parts[0] || null;
    const firstMi = (parts[1] || '').split(/\s+/);
    ins.insFirstName = firstMi[0] || null;
    ins.insMI = firstMi[1] || null;
    this.cdr.markForCheck();
  }

  setAcceptAssignment(ins: InsuranceInfo, checked: boolean): void {
    ins.insAcceptAssignment = checked ? 1 : 0;
    this.cdr.markForCheck();
  }

  clearPayer(ins: InsuranceInfo): void {
    ins.payID = 0;
    this.cdr.markForCheck();
  }

  openPayerLibrary(): void {
    this.payerLibraryOpen = true;
    this.cdr.markForCheck();
  }

  closePayerLibrary(): void {
    this.payerLibraryOpen = false;
    this.loadPayers();
    this.cdr.markForCheck();
  }

  getPayerLibraryInitialId(): number {
    return Number(this.currentInsurance?.payID ?? 0) || 0;
  }

  onPayerSelected(payer: { payID: number }): void {
    if (this.currentInsurance && payer.payID) {
      this.currentInsurance.payID = payer.payID;
    }
    this.closePayerLibrary();
  }

  onPayerSavedInPopup(payer: { payID: number; payName: string | null }): void {
    if (this.currentInsurance && payer.payID) {
      this.currentInsurance.payID = payer.payID;
    }
  }

  copyFromPatient(ins: InsuranceInfo): void {
    if (!this.patient) return;
    const v = this.patientForm.value;
    ins.insLastName = v.patLastName;
    ins.insFirstName = v.patFirstName;
    ins.insMI = v.patMI;
    ins.insBirthDate = v.patBirthDate;
    ins.insAddress = v.patAddress;
    ins.insCity = v.patCity;
    ins.insState = v.patState;
    ins.insZip = v.patZip;
    ins.insPhone = v.patPhoneNo;
    this.cdr.markForCheck();
  }

  getInsuredNameDisplay(ins: InsuranceInfo): string {
    const parts = [ins.insLastName, ins.insFirstName].filter(Boolean);
    if (ins.insMI) parts[1] = (parts[1] || '') + ' ' + ins.insMI;
    return parts.join(', ') || '';
  }

  goBackToList(): void {
    this.workspace.closeCurrentTab();
  }

  toggleSection(section: keyof typeof this.sectionsState): void {
    this.sectionsState[section] = !this.sectionsState[section];
    this.cdr.markForCheck();
  }

  /** Swap current insurance with Primary (seq 1) */
  swapInsurance(): void {
    const current = this.currentInsurance;
    const primary = this.insuranceList.find(i => i.patInsSequence === 1);
    if (!current || !primary || current.patInsSequence === 1) return;
    const newList = this.insuranceList.map(i => {
      if (i.patInsSequence === 1) return { ...current, patInsSequence: 1 };
      if (i.patInsSequence === current.patInsSequence) return { ...primary, patInsSequence: current.patInsSequence };
      return i;
    }).sort((a, b) => a.patInsSequence - b.patInsSequence);
    this.insuranceList = newList;
    this.insuranceTab = 1;
    this.refreshDirtyFlag();
    this.cdr.markForCheck();
    this.persistPatient({ reload: true });
  }

  /** Promote current insurance to Primary */
  replacePrimary(): void {
    const current = this.currentInsurance;
    if (!current || current.patInsSequence === 1) return;
    const seq = current.patInsSequence;
    const newList = this.insuranceList.map(i => {
      if (i.patInsSequence === 1) return { ...i, patInsSequence: seq };
      if (i.patInsSequence === seq) return { ...i, patInsSequence: 1 };
      return i;
    }).sort((a, b) => a.patInsSequence - b.patInsSequence);
    this.insuranceList = newList;
    this.insuranceTab = 1;
    this.refreshDirtyFlag();
    this.cdr.markForCheck();
    this.persistPatient({ reload: true });
  }

  /** Single authoritative save path for patient demographics, providers, and insurance. */
  private persistPatient(options: {
    reload?: boolean;
    close?: boolean;
    updateClaims?: boolean;
    confirmInsuranceReplace?: boolean;
  } = {}): void {
    if (this.saving) return;

    if (this.isNewMode) {
      if (!this.patient || !this.assertSlotAssignmentsClientSide()) return;
    } else {
      if (!this.patient || !this.patId || !this.assertSlotAssignmentsClientSide()) return;
    }

    this.syncFormToPatient();
    this.saving = true;
    this.cdr.markForCheck();

    const body = this.buildUpdateBody();
    if (options.updateClaims) {
      body.updateClaims = true;
    }
    if (options.confirmInsuranceReplace) {
      body.confirmInsuranceReplace = true;
    }

    const finalizeSave = () => {
      this.saving = false;
      this.cdr.markForCheck();
    };

    const onSaveError = (err: unknown) => {
      console.error('Failed to save patient', err);
      alert(this.describeBackendError(err, 'Failed to save patient'));
    };

    const afterUpdateSuccess = () => {
      this.newNote = '';
      this.saveCustomFieldValues();
      if (options.reload && this.patId) {
        this.loadPatient(this.patId);
      } else {
        this.markEditorClean();
      }
      if (options.updateClaims) {
        alert('Claims updated with primary insurance.');
      }
      if (options.close) {
        this.goBackToList();
      }
    };

    if (this.isNewMode) {
      this.patientApi.createPatient(body).pipe(
        finalize(finalizeSave)
      ).subscribe({
        next: (res) => {
          const newId = Number(res?.patID);
          if (!Number.isFinite(newId) || newId <= 0) {
            alert('Patient saved, but could not open details.');
            if (options.close) {
              this.goBackToList();
            }
            return;
          }
          this.isNewMode = false;
          this.patId = newId;
          this.ribbonContext.setContext({ patientId: newId, claimId: null });
          this.workspace.updateActiveTabTitle('Loading...');
          if (options.close) {
            this.goBackToList();
            return;
          }
          this.loadPatient(newId);
        },
        error: onSaveError
      });
      return;
    }

    this.patientApi.updatePatient(this.patId!, body).pipe(
      finalize(finalizeSave)
    ).subscribe({
      next: () => afterUpdateSuccess(),
      error: onSaveError
    });
  }

  /** Add Ins: new insurance becomes Primary (seq 1), others shift down. Max 5. */
  addInsurance(): void {
    if (!this.canAddInsurance) return;
    const newIns: InsuranceInfo = {
      patInsGUID: '',
      patInsSequence: 1,
      payID: 0,
      payerName: null,
      insGroupNumber: null,
      insIDNumber: null,
      insFirstName: null,
      insLastName: null,
      insMI: null,
      insPlanName: null,
      patInsRelationToInsured: 0,
      insBirthDate: null,
      insAddress: null,
      insCity: null,
      insState: null,
      insZip: null,
      insPhone: null,
      insEmployer: null,
      insAcceptAssignment: 0,
      insClaimFilingIndicator: null,
      insSSN: null,
      patInsEligStatus: null,
      patInsEligDate: null,
      patInsActive: true
    };
    const shifted = this.insuranceList.map((i, idx) => ({ ...i, patInsSequence: idx + 2 })).filter(i => i.patInsSequence <= this.MAX_INSURANCES);
    this.insuranceList = [newIns, ...shifted];
    this.insuranceTab = 1;
    this.refreshDirtyFlag();
    this.cdr.markForCheck();
  }

  removeCurrentInsurance(): void {
    const current = this.currentInsurance;
    if (!current) return;
    if (this.insuranceList.length === 1) {
      if (!confirm('Remove the last insurance record from this patient?')) {
        return;
      }
    }
    const seq = current.patInsSequence;
    const newList = this.insuranceList
      .filter(i => i.patInsSequence !== seq)
      .map(i => i.patInsSequence > seq ? { ...i, patInsSequence: i.patInsSequence - 1 } : i)
      .sort((a, b) => a.patInsSequence - b.patInsSequence);
    this.insuranceList = newList;
    if (this.insuranceTab > newList.length) this.insuranceTab = Math.max(1, newList.length);
    this.refreshDirtyFlag();
    this.cdr.markForCheck();
    this.persistPatient({ reload: true, confirmInsuranceReplace: newList.length === 0 });
  }

  /** Update all claims' primary insurance from patient's primary (ResponsibilitySequence=1) */
  updateClaims(): void {
    if (!this.patient || !this.patId || this.saving) return;
    const primary = this.insuranceList.find(i => i.patInsSequence === 1);
    if (!primary) {
      alert('No primary insurance to copy to claims.');
      return;
    }
    if (!confirm(
      'Update Claims will copy this patient\'s primary insurance to all existing claims (primary sequence). Continue?'
    )) {
      return;
    }
    this.persistPatient({ reload: true, updateClaims: true });
  }

  buildInsuranceList(): InsuranceUpdate[] {
    const toUpdate = (ins: InsuranceInfo): InsuranceUpdate => ({
      patInsGUID: ins.patInsGUID || undefined,
      sequence: ins.patInsSequence,
      payID: ins.payID || undefined,
      groupNumber: ins.insGroupNumber,
      memberID: ins.insIDNumber,
      insFirstName: ins.insFirstName,
      insLastName: ins.insLastName,
      insMI: ins.insMI,
      planName: ins.insPlanName,
      relationToInsured: ins.patInsRelationToInsured,
      insBirthDate: toHtmlDateInputValue(ins.insBirthDate) ?? undefined,
      insAddress: ins.insAddress,
      insCity: ins.insCity,
      insState: ins.insState,
      insZip: ins.insZip,
      insPhone: ins.insPhone,
      insEmployer: ins.insEmployer,
      insAcceptAssignment: ins.insAcceptAssignment ?? 0,
      insClaimFilingIndicator: ins.insClaimFilingIndicator,
      insSSN: ins.insSSN,
      patInsEligDate: toHtmlDateInputValue(ins.patInsEligDate)
    });
    return this.insuranceList.map(toUpdate);
  }

  /**
   * Extracts a human-readable message from a HttpErrorResponse so backend
   * validation codes (e.g. PROVIDER_KIND_MISMATCH,
   * PROVIDER_PLACEHOLDER_NOT_SELECTABLE) surface to the user instead of a
   * generic "Failed to save patient" toast.
   */
  private describeBackendError(err: any, fallback: string): string {
    const body = err?.error;
    if (body && typeof body === 'object') {
      const msg = body.message ?? body.Message;
      const code = body.errorCode ?? body.ErrorCode;
      if (msg && code) return `${msg} (${code})`;
      if (msg) return msg;
      if (code) return `${fallback} (${code})`;
    }
    return fallback;
  }

  save(): void {
    this.persistPatient({ reload: true });
  }

  /**
   * Phase 9 — front-stop validation that mirrors the backend rules. We never
   * trust this alone (the API is the source of truth), but it gives the
   * user immediate feedback before a roundtrip.
   */
  private assertSlotAssignmentsClientSide(): boolean {
    const v = this.patientForm.value;
    const checks: Array<{ id: number; required: 'Person' | 'Non-Person'; slot: string; pool: readonly PhysicianSlotOption[] }> = [
      { id: Number(v.patRenderingPhyFID),   required: 'Person',     slot: 'Rendering',       pool: this.renderingProviders },
      { id: Number(v.patBillingPhyFID),     required: 'Non-Person', slot: 'Billing',         pool: this.billingProviders },
      { id: Number(v.patFacilityPhyFID),    required: 'Non-Person', slot: 'Service Facility', pool: this.facilityProviders },
      { id: Number(v.patReferringPhyFID),   required: 'Person',     slot: 'Referring',       pool: this.referringProviders },
      { id: Number(v.patOrderingPhyFID),    required: 'Person',     slot: 'Ordering',        pool: this.orderingProviders },
      { id: Number(v.patSupervisingPhyFID), required: 'Person',     slot: 'Supervising',     pool: this.supervisingProviders },
    ];

    for (const c of checks) {
      if (!Number.isFinite(c.id) || c.id <= 0) continue;
      const found = c.pool.find(p => p.phyID === c.id);
      if (!found) {
        alert(`${c.slot} provider selection is stale or invalid for this slot. Re-select and save again.`);
        return false;
      }
      if (found?.isSystemPlaceholder) {
        alert(`Cannot assign "${found.phyName}" to ${c.slot}: it is a system placeholder.`);
        return false;
      }
      if (found && found.phyType && found.phyType !== c.required) {
        alert(`Cannot assign "${found.phyName}" (${found.phyType}) to ${c.slot}: that slot requires ${c.required}.`);
        return false;
      }
    }
    const billingId = Number(v.patBillingPhyFID) || 0;
    if (billingId <= 0) {
      alert('Billing Provider is required.');
      return false;
    }
    return true;
  }

  saveAndClose(): void {
    if (!this.isNewMode && (!this.patient || !this.patId)) {
      this.goBackToList();
      return;
    }
    if (this.isNewMode && !this.patient) {
      this.goBackToList();
      return;
    }
    this.persistPatient({ close: true });
  }

  close(): void {
    if (this.formDirty && !confirm('You have unsaved changes. Close without saving?')) {
      return;
    }
    this.goBackToList();
  }

  private normalizeOptionalPhySlot(value: number | null | undefined): number | null {
    const n = Number(value ?? 0);
    return n > 0 ? n : null;
  }

  private syncFormToPatient(): void {
    if (!this.patient) return;
    const v = this.patientForm.value;
    Object.assign(this.patient, v);
  }

  private buildUpdateBody(): UpdatePatientRequest {
    this.reconcileAssignedProvidersWithFacility();
    this.syncFormToPatient();
    const p = this.patient!;
    const billingFromForm = this.normalizeOptionalPhySlot(this.patientForm.get('patBillingPhyFID')?.value);
    return {
      patFirstName: p.patFirstName,
      patLastName: p.patLastName,
      patMI: p.patMI,
      patAccountNo: p.patAccountNo,
      patActive: p.patActive,
      patBirthDate: toHtmlDateInputValue(p.patBirthDate) ?? null,
      patSSN: p.patSSN,
      patSex: p.patSex,
      patAddress: p.patAddress,
      patAddress2: p.patAddress2,
      patCity: p.patCity,
      patState: p.patState,
      patZip: p.patZip,
      patPhoneNo: p.patPhoneNo,
      patCellPhoneNo: p.patCellPhoneNo,
      patHomePhoneNo: p.patHomePhoneNo,
      patWorkPhoneNo: p.patWorkPhoneNo,
      patFaxNo: p.patFaxNo,
      patPriEmail: p.patPriEmail,
      patSecEmail: p.patSecEmail,
      patClassification: p.patClassification,
      patClaLibFID: p.patClaLibFID ?? undefined,
      patCoPayAmount: p.patCoPayAmount ?? undefined,
      patDiagnosis1: p.patDiagnosis1,
      patDiagnosis2: p.patDiagnosis2,
      patDiagnosis3: p.patDiagnosis3,
      patDiagnosis4: p.patDiagnosis4,
      patEmployed: p.patEmployed ?? undefined,
      patMarried: p.patMarried ?? undefined,
      patRenderingPhyFID: this.normalizeOptionalPhySlot(p.patRenderingPhyFID),
      patBillingPhyFID: billingFromForm,
      patFacilityPhyFID: this.normalizeOptionalPhySlot(p.patFacilityPhyFID),
      patReferringPhyFID: this.normalizeOptionalPhySlot(p.patReferringPhyFID),
      patOrderingPhyFID: this.normalizeOptionalPhySlot(p.patOrderingPhyFID),
      patSupervisingPhyFID: this.normalizeOptionalPhySlot(p.patSupervisingPhyFID),
      patStatementName: p.patStatementName,
      patStatementAddressLine1: p.patStatementAddressLine1,
      patStatementAddressLine2: p.patStatementAddressLine2,
      patStatementCity: p.patStatementCity,
      patStatementState: p.patStatementState,
      patStatementZipCode: p.patStatementZipCode,
      patStatementMessage: p.patStatementMessage,
      patReminderNote: p.patReminderNote,
      patEmergencyContactName: p.patEmergencyContactName,
      patEmergencyContactPhoneNo: p.patEmergencyContactPhoneNo,
      patEmergencyContactRelation: p.patEmergencyContactRelation,
      patWeight: p.patWeight,
      patHeight: p.patHeight,
      patMemberID: p.patMemberID,
      patSigOnFile: p.patSigOnFile,
      patInsuredSigOnFile: p.patInsuredSigOnFile,
      patPrintSigDate: p.patPrintSigDate ?? undefined,
      patPhyPrintDate: p.patPhyPrintDate ?? undefined,
      patDontSendPromotions: p.patDontSendPromotions,
      patDontSendStatements: p.patDontSendStatements,
      patAptReminderPref: p.patAptReminderPref,
      patReminderNoteEvent: p.patReminderNoteEvent,
      patSigSource: p.patSigSource,
      patCoPayPercent: p.patCoPayPercent ?? undefined,
      patCustomField1: p.patCustomField1,
      patCustomField2: p.patCustomField2,
      patCustomField3: p.patCustomField3,
      patCustomField4: p.patCustomField4,
      patCustomField5: p.patCustomField5,
      patExternalFID: p.patExternalFID,
      patPaymentMatchingKey: p.patPaymentMatchingKey,
      patLastStatementDateTRIG: p.patLastStatementDateTRIG ?? undefined,
      patAuthTracking: p.patAuthTracking ?? undefined,
      insuranceList: this.buildInsuranceList(),
      noteText: this.newNote?.trim() || null
    };
  }

  formatEligibilityStatus(code: string | null | undefined): string {
    if (!code?.trim()) return 'Unknown';
    const c = code.trim().toUpperCase();
    if (c === 'A' || c === 'ACTIVE' || c === '1') return 'Active';
    if (c === 'I' || c === 'INACTIVE' || c === '6') return 'Inactive';
    if (c === 'R' || c === 'REJECTED' || c === 'DENIED' || c === 'FAIL' || c === 'FAILED') return 'Rejected';
    if (c === 'U' || c === 'UNKNOWN') return 'Unknown';
    return code.trim();
  }

  isActiveEligibilityStatus(code: string | null | undefined): boolean {
    return this.normalizeEligibilityCode(code) === 'ACTIVE';
  }

  isInactiveEligibilityStatus(code: string | null | undefined): boolean {
    return this.normalizeEligibilityCode(code) === 'INACTIVE';
  }

  isRejectedEligibilityStatus(code: string | null | undefined): boolean {
    return this.normalizeEligibilityCode(code) === 'REJECTED';
  }

  isUnknownEligibilityStatus(code: string | null | undefined): boolean {
    const bucket = this.normalizeEligibilityCode(code);
    return bucket === 'UNKNOWN' || bucket === 'OTHER';
  }

  private normalizeEligibilityCode(code: string | null | undefined): 'ACTIVE' | 'INACTIVE' | 'REJECTED' | 'UNKNOWN' | 'OTHER' {
    if (!code?.trim()) return 'UNKNOWN';
    const c = code.trim().toUpperCase();
    if (c === 'A' || c === 'ACTIVE' || c === '1') return 'ACTIVE';
    if (c === 'I' || c === 'INACTIVE' || c === '6') return 'INACTIVE';
    if (c === 'R' || c === 'REJECTED' || c === 'DENIED' || c === 'FAIL' || c === 'FAILED') return 'REJECTED';
    if (c === 'U' || c === 'UNKNOWN') return 'UNKNOWN';
    return 'OTHER';
  }

  private applyEligibilityStatusFromDto(status: EligibilityStatusDto): void {
    const ins = this.currentInsurance;
    if (!ins) return;
    let raw = status.eligibilityStatus;
    if ((!raw || /^unknown$/i.test(raw)) && this.inquiryIndicatesActive(status)) {
      raw = 'Active';
    }
    ins.patInsEligStatus = this.toStoredEligibilityStatus(raw);
    if (EligibilityPollingService.isTerminal(status)) {
      ins.patInsEligDate = this.todayIsoDate();
      this.onInsuranceFieldChanged();
    }
    this.cdr.markForCheck();
  }

  private todayIsoDate(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private inquiryIndicatesActive(status: EligibilityStatusDto): boolean {
    return (status.benefits ?? []).some(
      b =>
        b.benefit === '1' ||
        /active\s+coverage/i.test(b.description ?? '') ||
        b.serviceType === '30'
    );
  }

  private toStoredEligibilityStatus(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;
    const s = raw.trim();
    if (/^active$/i.test(s) || s === '1') return 'A';
    if (/^inactive$/i.test(s) || s === '6') return 'I';
    if (/^rejected$/i.test(s) || /^denied$/i.test(s) || /^fail/i.test(s)) return 'R';
    if (/^unknown$/i.test(s) || s === 'U') return 'U';
    return s.length > 15 ? s.slice(0, 15) : s;
  }

  getPatientName(): string {
    if (!this.patient) return 'Unknown';
    const fn = this.patient.patFirstName || '';
    const ln = this.patient.patLastName || '';
    if (ln || fn) return `${ln.toUpperCase()}, ${fn}`.trim();
    return this.patient.patFullNameCC || 'Unknown';
  }

  private formatPatientGender(value: string | null | undefined): string | null {
    if (!value) return null;
    const v = String(value).trim().toUpperCase();
    if (v === 'M' || v === 'MALE') return 'Male';
    if (v === 'F' || v === 'FEMALE') return 'Female';
    if (v === 'U' || v === 'UNKNOWN') return 'Unknown';
    return value;
  }

  formatDateOnly(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    } catch {
      return value;
    }
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch {
      return value;
    }
  }

  getNotesHistory() {
    return this.patient?.patientNotes ?? [];
  }
}
