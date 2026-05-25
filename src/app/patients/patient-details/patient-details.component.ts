import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PatientApiService } from '../../core/services/patient-api.service';
import {
  PatientDetail,
  InsuranceInfo,
  InsuranceUpdate,
} from '../../core/services/patient.models';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { PayerApiService } from '../../core/services/payer-api.service';
import { ListApiService, ListValueDto } from '../../core/services/list-api.service';
import { RibbonContextService } from '../../core/services/ribbon-context.service';
import { CustomFieldsApiService, CustomFieldDefinitionDto } from '../../core/services/custom-fields-api.service';
import { EligibilityApiService, EligibilityRequestResultDto, EligibilityStatusDto } from '../../core/services/eligibility-api.service';
import { WorkspaceService } from '../../workspace/application/workspace.service';
import { FacilityService } from '../../core/services/facility.service';
import { FacilitiesApiService } from '../../core/services/facilities-api.service';
import { ProgramSettingsApiService } from '../../core/services/program-settings-api.service';
import { toHtmlDateInputValue } from '../../core/utils/html-date-input';

interface PhysicianOption {
  phyID: number;
  facilityId: number;
  phyName: string;
  phyEntityType: string | null;
  phyType: string | null;
  phyPrimaryCodeType?: string | null;
  isFacility?: boolean;
  isPerson?: boolean;
  isSystemPlaceholder?: boolean;
}

@Component({
  selector: 'app-patient-details',
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientDetailsComponent implements OnInit {
  patient: PatientDetail | null = null;
  isNewMode = false;
  patientForm!: FormGroup;
  loading = false;
  error: string | null = null;
  patId: number | null = null;
  newNote = '';
  saving = false;
  eligibilityResponse: any = null;
  eligibilityRequest: EligibilityRequestResultDto | null = null;
  showEligibilityResponseViewer = true;
  private eligibilityPollTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * @deprecated Single shared list — kept only for back-compat with callers
   * that still iterate `physicians`. New code must use the slot-specific
   * arrays below (`renderingProviders`, `facilityProviders`, …) which are
   * loaded with proper backend classification filters.
   */
  physicians: PhysicianOption[] = [];

  /** Service Facility (PhyPrimaryCodeType=FA, Non-Person). */
  facilityProviders: PhysicianOption[] = [];
  /** Billing Provider (PhyPrimaryCodeType=BI, Non-Person preferred). */
  billingProviders: PhysicianOption[] = [];
  /** Raw backend response for billing providers, before topbar facility scoping. */
  private billingProvidersRaw: PhysicianOption[] = [];
  /** Rendering Provider (PhyPrimaryCodeType=RE, Person). */
  renderingProviders: PhysicianOption[] = [];
  /** Referring Provider (PhyPrimaryCodeType=RF, Person). */
  referringProviders: PhysicianOption[] = [];
  /** Ordering Provider (PhyPrimaryCodeType=OP, Person). */
  orderingProviders: PhysicianOption[] = [];
  /** Supervising Provider (PhyPrimaryCodeType=SU, Person). */
  supervisingProviders: PhysicianOption[] = [];

  selectedFacilityId: number | null = null;
  selectedFacilityName: string | null = null;
  payers: Array<{ payID: number; payName: string }> = [];

  physicianPickerOpen = false;
  /** When opening the physician library, which patient form field to set (e.g. patFacilityPhyFID). */
  physicianPickerFor: string | null = null;

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.buildPatientForm();
    this.loadEligibilityViewerSetting();
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
      patBillingPhyFID: [0],
      patRenderingPhyFID: [0],
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
   *   * Billing       → BI, Non-Person preferred
   *   * Rendering     → RE, Person
   *   * Service Fac.  → FA, Non-Person
   *   * Referring     → RF, Person
   *   * Ordering      → OP, Person
   *   * Supervising   → SU, Person
   */
  loadPhysicians(): void {
    const toOption = (p: any): PhysicianOption => ({
      phyID: p.phyID,
      facilityId: p.facilityId,
      phyName: p.phyFullNameCC || p.phyName || 'Unknown',
      phyEntityType: p.phyEntityType ?? p.phyType ?? null,
      phyType: p.phyType ?? null,
      phyPrimaryCodeType: p.phyPrimaryCodeType ?? null,
      isFacility: !!p.isFacility,
      isPerson: !!p.isPerson,
      isSystemPlaceholder: !!p.isSystemPlaceholder
    });

    const loadSlot = (
      filters: Parameters<PhysicianApiService['getPhysicians']>[2],
      assign: (rows: PhysicianOption[]) => void
    ) => {
      this.physicianApi.getPhysicians(1, 500, filters).subscribe({
        next: (r) => {
          assign((r.data ?? []).map(toOption));
          this.cdr.markForCheck();
        },
        error: () => {
          assign([]);
          this.cdr.markForCheck();
        }
      });
    };

    // Service Facility — only organisations classified as FA.
    loadSlot(
      { inactive: false, classification: 'FA', isFacility: true, excludePlaceholders: true },
      (rows) => { this.facilityProviders = rows; this.refreshBillingProviders(); }
    );

    // Billing Provider — BI classification, Non-Person preferred.
    loadSlot(
      { inactive: false, classification: 'BI', isFacility: true, excludePlaceholders: true },
      (rows) => { this.billingProvidersRaw = rows; this.refreshBillingProviders(); }
    );

    // Rendering Provider — RE classification, Person only.
    loadSlot(
      { inactive: false, classification: 'RE', isPerson: true, excludePlaceholders: true },
      (rows) => { this.renderingProviders = rows; }
    );

    // Referring Provider — RF classification, Person only.
    loadSlot(
      { inactive: false, classification: 'RF', isPerson: true, excludePlaceholders: true },
      (rows) => { this.referringProviders = rows; }
    );

    // Ordering Provider — OP classification, Person only.
    loadSlot(
      { inactive: false, classification: 'OP', isPerson: true, excludePlaceholders: true },
      (rows) => { this.orderingProviders = rows; }
    );

    // Supervising Provider — SU classification, Person only.
    loadSlot(
      { inactive: false, classification: 'SU', isPerson: true, excludePlaceholders: true },
      (rows) => { this.supervisingProviders = rows; }
    );

    // Legacy `physicians` array — keep populated for back-compat with any
    // remaining call sites (search, picker dialog). Always exclude
    // placeholders here too.
    this.physicianApi.getPhysicians(1, 1000, { inactive: false, excludePlaceholders: true }).subscribe({
      next: (r) => {
        this.physicians = (r.data ?? []).map(toOption);
        this.cdr.markForCheck();
      },
      error: () => {
        this.physicians = [];
        this.cdr.markForCheck();
      }
    });
  }

  private loadSelectedFacilityName(): void {
    const selectedId = this.facilityService.getFacilityIdOptional();
    this.selectedFacilityId = selectedId;
    if (selectedId == null || selectedId <= 0) {
      this.selectedFacilityName = null;
      this.billingProviders = [];
    }
    this.facilitiesApi.getMyFacilities().subscribe({
      next: (rows) => {
        const list = rows ?? [];
        let effectiveId = this.selectedFacilityId;
        if ((!effectiveId || effectiveId <= 0) && list.length === 1) {
          effectiveId = Number(list[0].facilityId) || null;
          this.selectedFacilityId = effectiveId;
        }
        const matched = list.find((f) => Number(f.facilityId) === Number(effectiveId));
        this.selectedFacilityName = matched?.name?.trim() || null;
        this.refreshBillingProviders();
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedFacilityName = null;
        this.selectedFacilityId = null;
        this.billingProvidersRaw = [];
        this.billingProviders = [];
      }
    });
  }

  /**
   * Restricts the Billing Provider dropdown to the active facility context.
   * The backend already filters by classification=BI / isFacility=true, so
   * here we only need to apply the topbar facility scoping (facilityId match
   * + optional name hint, e.g. "NJ") on top of the BI dataset.
   */
  /**
   * Restricts the Billing Provider dropdown to the active facility context.
   * The backend already filters by classification=BI / isFacility=true and
   * caches the unfiltered result in `billingProvidersRaw`. Here we apply
   * the topbar facility scoping (facilityId match + optional name hint,
   * e.g. "NJ") on top of that base set.
   */
  private refreshBillingProviders(): void {
    const selectedFacilityId = this.selectedFacilityId ?? this.facilityService.getFacilityIdOptional();
    const selectedFacilityName = (this.selectedFacilityName ?? '').trim().toLowerCase();

    let filtered = this.billingProvidersRaw;
    if (selectedFacilityId && selectedFacilityId > 0) {
      filtered = filtered.filter(p => p.facilityId === selectedFacilityId);
    }

    // Enforce topbar facility context by name (e.g., NJ) with no broad fallback.
    if (selectedFacilityName) {
      filtered = filtered.filter(p => (p.phyName || '').toLowerCase().includes(selectedFacilityName));
    }

    this.billingProviders = filtered;
  }

  get billingProviderFacilityHint(): string | null {
    if (this.billingProviders.length > 0) return null;
    const name = this.selectedFacilityName?.trim();
    return name && name.length > 0 ? name : null;
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
      patBillingPhyFID: p.patBillingPhyFID ?? 0,
      patRenderingPhyFID: p.patRenderingPhyFID ?? 0,
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
      insBirthDate: toHtmlDateInputValue(ins.insBirthDate)
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
    if (!this.hasPrimaryInsurance) {
      alert('Patient has no primary insurance.');
      return;
    }

    this.eligibilityApi.preflight(this.patient.patID).subscribe({
      next: (pf) => {
        if (!pf.valid) {
          alert((pf.errors ?? []).join('\n') || 'Eligibility preflight failed.');
          return;
        }
        this.eligibilityApi.request(this.patient!.patID).subscribe({
          next: (request) => {
            this.eligibilityRequest = request;
            this.eligibilityResponse = null;
            this.pollEligibilityStatus();
          },
          error: (err) => {
            alert(err?.error?.error || err?.error?.message || 'Failed to request eligibility.');
          }
        });
      },
      error: () => {
        alert('Eligibility preflight could not be completed.');
      }
    });
  }

  viewEligibility(): void {
    if (!this.eligibilityRequest?.id) return;

    this.eligibilityApi.getById(this.eligibilityRequest.id, false).subscribe({
      next: status => {
        this.presentEligibilityResult(status, true);
      },
      error: (err) => {
        alert(err?.error?.error || 'Failed to load eligibility response.');
      }
    });
  }

  private pollEligibilityStatus(): void {
    if (!this.eligibilityRequest?.id) return;
    if (this.eligibilityPollTimer) clearInterval(this.eligibilityPollTimer);

    const requestId = this.eligibilityRequest.id;
    const poll = () => {
      this.eligibilityApi.getById(requestId).subscribe({
        next: status => {
          if (this.currentInsurance) {
            this.currentInsurance.patInsEligStatus = status.eligibilityStatus || this.currentInsurance.patInsEligStatus;
          }

          if (status.status === 'Completed') {
            this.presentEligibilityResult(status, false);
            if (this.eligibilityPollTimer) clearInterval(this.eligibilityPollTimer);
          } else if (status.status === 'Failed') {
            alert(`Eligibility failed: ${status.errorMessage || 'Unknown error'}`);
            if (this.eligibilityPollTimer) clearInterval(this.eligibilityPollTimer);
          }
        },
        error: () => {
          if (this.eligibilityPollTimer) clearInterval(this.eligibilityPollTimer);
        }
      });
    };

    poll();
    this.eligibilityPollTimer = setInterval(poll, 5000);
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

  private presentEligibilityResult(status: EligibilityStatusDto, forceViewer: boolean): void {
    if (forceViewer || this.showEligibilityResponseViewer) {
      this.eligibilityResponse = {
        payerName: status.payerName,
        status: status.eligibilityStatus || status.status,
        planName: status.planName,
        planDetails: status.planDetails,
        eligibilityStartDate: status.eligibilityStartDate,
        eligibilityEndDate: status.eligibilityEndDate,
        benefits: status.benefits ?? [],
        errorMessage: status.errorMessage,
        providerNpi: status.providerNpi,
        providerMode: status.providerMode,
        usedPayerOverride: status.usedPayerOverride
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
    this.cdr.markForCheck();
    this.saveAndReload();
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
    this.cdr.markForCheck();
    this.saveAndReload();
  }

  private saveAndReload(): void {
    if (!this.patId) return;
    const body = this.buildUpdateBody();
    body.insuranceList = this.buildInsuranceList();
    this.patientApi.updatePatient(this.patId, body).subscribe({
      next: () => this.loadPatient(this.patId!),
      error: (err) => {
        console.error('Failed to save insurance swap', err);
        alert('Failed to save. Please try again.');
      }
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
      patInsActive: true
    };
    const shifted = this.insuranceList.map((i, idx) => ({ ...i, patInsSequence: idx + 2 })).filter(i => i.patInsSequence <= this.MAX_INSURANCES);
    this.insuranceList = [newIns, ...shifted];
    this.insuranceTab = 1;
    this.cdr.markForCheck();
  }

  removeCurrentInsurance(): void {
    const current = this.currentInsurance;
    if (!current) return;
    const seq = current.patInsSequence;
    const newList = this.insuranceList
      .filter(i => i.patInsSequence !== seq)
      .map(i => i.patInsSequence > seq ? { ...i, patInsSequence: i.patInsSequence - 1 } : i)
      .sort((a, b) => a.patInsSequence - b.patInsSequence);
    this.insuranceList = newList;
    if (this.insuranceTab > newList.length) this.insuranceTab = Math.max(1, newList.length);
    this.cdr.markForCheck();
    this.saveAndReload();
  }

  /** Update all claims' primary insurance from patient's primary (ResponsibilitySequence=1) */
  updateClaims(): void {
    if (!this.patient || !this.patId || this.saving) return;
    const primary = this.insuranceList.find(i => i.patInsSequence === 1);
    if (!primary) {
      alert('No primary insurance to copy to claims.');
      return;
    }
    const selectedPayerId = Number(primary.payID ?? 0) || null;
    console.log('Update Claims clicked', {
      patientId: this.patId,
      selectedPayerId
    });
    this.saving = true;
    this.cdr.markForCheck();

    const body = { ...this.buildUpdateBody(), updateClaims: true };
    console.log('Calling API with:', body);

    this.patientApi.updatePatient(this.patId, body).pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.loadPatient(this.patId!);
        alert('Claims updated with primary insurance.');
      },
      error: (err) => {
        console.error('Failed to update claims', err);
        alert('Failed to update claims.');
      }
    });
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
      insSSN: ins.insSSN
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
    if (this.isNewMode) {
      if (this.saving || !this.patient) return;
      if (!this.assertSlotAssignmentsClientSide()) return;
      this.syncFormToPatient();
      this.saving = true;
      this.cdr.markForCheck();
      const body = this.buildUpdateBody();
      this.patientApi.createPatient(body).pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      ).subscribe({
        next: (res) => {
          const newId = Number(res?.patID);
          if (!Number.isFinite(newId) || newId <= 0) {
            alert('Patient saved, but could not open details.');
            this.goBackToList();
            return;
          }
          this.isNewMode = false;
          this.patId = newId;
          this.ribbonContext.setContext({ patientId: newId, claimId: null });
          this.workspace.updateActiveTabTitle('Loading...');
          this.loadPatient(newId);
        },
        error: (err) => {
          console.error('Failed to create patient', err);
          alert(this.describeBackendError(err, 'Failed to create patient'));
        }
      });
      return;
    }
    if (!this.patient || !this.patId || this.saving) return;
    if (!this.assertSlotAssignmentsClientSide()) return;
    this.syncFormToPatient();
    this.saving = true;
    this.cdr.markForCheck();

    const body = this.buildUpdateBody();
    this.patientApi.updatePatient(this.patId, body).pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.newNote = '';
        this.saveCustomFieldValues();
        this.loadPatient(this.patId!);
      },
      error: (err) => {
        console.error('Failed to save patient', err);
        alert(this.describeBackendError(err, 'Failed to save patient'));
      }
    });
  }

  /**
   * Phase 9 — front-stop validation that mirrors the backend rules. We never
   * trust this alone (the API is the source of truth), but it gives the
   * user immediate feedback before a roundtrip.
   */
  private assertSlotAssignmentsClientSide(): boolean {
    const v = this.patientForm.value;
    const checks: Array<{ id: number; required: 'Person' | 'Non-Person'; slot: string; pool: PhysicianOption[] }> = [
      { id: Number(v.patRenderingPhyFID),   required: 'Person',     slot: 'Rendering',       pool: this.renderingProviders },
      { id: Number(v.patBillingPhyFID),     required: 'Non-Person', slot: 'Billing',         pool: this.billingProvidersRaw },
      { id: Number(v.patFacilityPhyFID),    required: 'Non-Person', slot: 'Service Facility', pool: this.facilityProviders },
      { id: Number(v.patReferringPhyFID),   required: 'Person',     slot: 'Referring',       pool: this.referringProviders },
      { id: Number(v.patOrderingPhyFID),    required: 'Person',     slot: 'Ordering',        pool: this.orderingProviders },
      { id: Number(v.patSupervisingPhyFID), required: 'Person',     slot: 'Supervising',     pool: this.supervisingProviders },
    ];

    for (const c of checks) {
      if (!Number.isFinite(c.id) || c.id <= 0) continue;
      const found = c.pool.find(p => p.phyID === c.id)
        ?? this.physicians.find(p => p.phyID === c.id);
      if (found?.isSystemPlaceholder) {
        alert(`Cannot assign "${found.phyName}" to ${c.slot}: it is a system placeholder.`);
        return false;
      }
      if (found && found.phyType && found.phyType !== c.required) {
        alert(`Cannot assign "${found.phyName}" (${found.phyType}) to ${c.slot}: that slot requires ${c.required}.`);
        return false;
      }
    }
    return true;
  }

  saveAndClose(): void {
    if (this.isNewMode) {
      if (this.saving || !this.patient) {
        this.goBackToList();
        return;
      }
      this.syncFormToPatient();
      this.saving = true;
      this.cdr.markForCheck();
      const body = this.buildUpdateBody();
      this.patientApi.createPatient(body).pipe(
        finalize(() => { this.saving = false; this.cdr.markForCheck(); })
      ).subscribe({
        next: () => {
          this.goBackToList();
        },
        error: (err) => {
          console.error('Failed to create patient', err);
          alert('Failed to create patient');
        }
      });
      return;
    }
    if (!this.patient || !this.patId || this.saving) {
      this.goBackToList();
      return;
    }
    this.syncFormToPatient();
    this.saving = true;
    this.cdr.markForCheck();

    const body = this.buildUpdateBody();
    this.patientApi.updatePatient(this.patId, body).pipe(
      finalize(() => { this.saving = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: () => {
        this.newNote = '';
        this.saveCustomFieldValues();
        this.goBackToList();
      },
      error: (err) => {
        console.error('Failed to save patient', err);
        alert('Failed to save patient');
      }
    });
  }

  close(): void {
    this.goBackToList();
  }

  private syncFormToPatient(): void {
    if (!this.patient) return;
    const v = this.patientForm.value;
    Object.assign(this.patient, v);
  }

  private buildUpdateBody() {
    this.syncFormToPatient();
    const p = this.patient!;
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
      patRenderingPhyFID: p.patRenderingPhyFID,
      patBillingPhyFID: p.patBillingPhyFID,
      patFacilityPhyFID: p.patFacilityPhyFID,
      patReferringPhyFID: p.patReferringPhyFID,
      patOrderingPhyFID: p.patOrderingPhyFID,
      patSupervisingPhyFID: p.patSupervisingPhyFID,
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

  getPatientName(): string {
    if (!this.patient) return 'Unknown';
    const fn = this.patient.patFirstName || '';
    const ln = this.patient.patLastName || '';
    if (ln || fn) return `${ln.toUpperCase()}, ${fn}`.trim();
    return this.patient.patFullNameCC || 'Unknown';
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
