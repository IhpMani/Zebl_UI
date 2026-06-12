import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FacilityService } from '../../core/services/facility.service';
import { forkJoin, of, Subscription } from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ProgramSettingsApiService } from '../../core/services/program-settings-api.service';
import { PatientTemplatesApiService, PatientTemplateDto } from '../../core/services/patient-templates-api.service';
import { CLAIM_STATUS_OPTIONS, ClaimStatusOption } from '../../shared/constants/claim-status';
import { CodeLibraryApiService, CodeLibraryRow } from '../../core/services/code-library-api.service';
import { ReceiverLibraryApiService, ReceiverLibraryDto } from '../../core/services/receiver-library-api.service';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { PhysicianListItem } from '../../core/services/physician.models';
import { CityStateZipApiService } from '../../core/services/city-state-zip-api.service';
import {
  CustomFieldsApiService,
  CustomFieldDefinitionDto,
  CUSTOM_FIELD_TYPES
} from '../../core/services/custom-fields-api.service';
import {
  EligibilityApiService,
  EligibilityConfigurationStatusDto,
  EligibilityConnectionTestRequestDto,
  EligibilityConnectionTestResultDto
} from '../../core/services/eligibility-api.service';
import { eligibilityUsesRestGateway, eligibilityUsesSftpDirectories } from './eligibility-vendor.util';
import {
  cloneSettings,
  hydrateClaimSettings,
  hydrateCompanySettings,
  hydrateInterfaceSettings,
  hydratePatientEligibilitySettings,
  hydratePatientSettings,
  hydrateSendingClaimsSettings,
  toClaimSavePayload,
  toPatientEligibilitySavePayload,
  toSendingClaimsCorePayload,
  toSendingClaimsExtendedPayload
} from './program-setup-hydration';
import {
  ClaimProgramSettings,
  CompanyProgramSettings,
  InterfaceProgramSettings,
  PatientEligibilityProgramSettings,
  PatientProgramSettings,
  SendingClaimsProgramSettings
} from './program-setup.models';

interface ProgramSetupSection {
  id: string;
  label: string;
}

@Component({
  selector: 'app-program-setup-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './program-setup-page.component.html',
  styleUrls: ['./program-setup-page.component.scss']
})
export class ProgramSetupPageComponent implements OnInit, OnDestroy {
  sections: ProgramSetupSection[] = [
    { id: 'general', label: 'General' },
    { id: 'patient', label: 'Patient' },
    { id: 'patient-custom-fields', label: 'Patient Custom Fields' },
    { id: 'claim', label: 'Claim' },
    { id: 'claim-custom-fields', label: 'Claim Custom Fields' },
    { id: 'sending-claims', label: 'Sending Claims' },
    { id: 'payment', label: 'Payment' },
    { id: 'company', label: 'Company' },
    { id: 'patient-eligibility', label: 'Patient Eligibility' },
    { id: 'interface', label: 'Interface' }
  ];

  selectedSection: string = 'patient';
  /** Off by default: saves apply company-wide. When on, saves apply to the current facility only. */
  facilityCustomizeMode = false;
  /** Section-specific shape; hydrated via program-setup-hydration.ts before bind. */
  settingsData: any = null;
  isLoading = false;
  loadError: string | null = null;
  isSaving = false;
  saveError: string | null = null;
  saveSuccessMessage: string | null = null;

  eligibilityConfigStatus: EligibilityConfigurationStatusDto | null = null;
  eligibilityTestResult: EligibilityConnectionTestResultDto | null = null;
  isTestingEligibility = false;
  /** When off, file-path settings are omitted from save (existing values preserved server-side). */
  eligibilityAdvancedMode = false;
  readonly eligibilitySourceOptions: { value: string; label: string }[] = [
    { value: 'GenericSftp', label: 'Generic SFTP' },
    { value: 'Waystar', label: 'Waystar (REST API)' },
    { value: 'OfficeAlly', label: 'Office Ally' },
    { value: 'TriZetto', label: 'TriZetto' },
    { value: 'ChangeHealthcare', label: 'Change Healthcare' },
    { value: 'ZirMed', label: 'ZirMed' },
    { value: 'Navicure', label: 'Navicure' }
  ];

  patientTemplates: PatientTemplateDto[] = [];
  showMissingAccountsModal = false;
  missingAccountPatients: { patId: number; name?: string | null; accountNumber?: string | null }[] = [];

  readonly claimStatusOptions: readonly ClaimStatusOption[] = CLAIM_STATUS_OPTIONS;
  posOptions: CodeLibraryRow[] = [];

  /** Receivers filtered for Format = "Eligibility Inquiry 270" (from receiver library). */
  eligibilityReceivers: ReceiverLibraryDto[] = [];
  /** Provider mode options. */
  providerModeOptions: { value: string; label: string }[] = [
    { value: 'Billing', label: 'Billing Provider' },
    { value: 'Rendering', label: 'Rendering Provider' },
    { value: 'Specific', label: 'Specific Provider' }
  ];
  physiciansList: PhysicianListItem[] = [];

  /** Company section: validation errors (set before save when invalid). */
  companyValidationErrors: { companyName?: string; taxId?: string; npi?: string } = {};

  /** Sending Claims: submitter/receiver options from Receiver Library (display: Name – Format). */
  sendingClaimsReceivers: ReceiverLibraryDto[] = [];
  /** Sending Claims: export format dropdown options. */
  exportFormatOptions: { value: string; label: string }[] = [
    { value: 'ANSI837', label: 'ANSI837' },
    { value: 'PrintOnly', label: 'PrintOnly' },
    { value: 'ElectronicOnly', label: 'ElectronicOnly' }
  ];

  /** Patient Custom Fields section: list from API (max 5). */
  patientCustomFields: CustomFieldDefinitionDto[] = [];
  /** Claim Custom Fields section: claim-level fields (max 5). */
  claimCustomFields: CustomFieldDefinitionDto[] = [];
  /** Claim Custom Fields section: service line fields (max 5). */
  serviceLineCustomFields: CustomFieldDefinitionDto[] = [];
  customFieldsLoadError: string | null = null;
  /** Set true after add/edit/delete to show restart notice. */
  customFieldDefinitionsModified = false;
  /** Modal for Add/Edit custom field. */
  showCustomFieldModal = false;
  customFieldModalEntityType: 'Patient' | 'Claim' | 'ServiceLine' = 'Patient';
  customFieldModalLabel = '';
  customFieldModalFieldType = 'TEXT';
  customFieldModalId: number | null = null;
  customFieldModalSaving = false;
  customFieldModalError: string | null = null;
  readonly customFieldTypeOptions = CUSTOM_FIELD_TYPES;
  readonly maxCustomFieldsPerEntity = 5;

  private facilityChangeSub: Subscription | null = null;

  constructor(
    private programSettingsApi: ProgramSettingsApiService,
    private patientTemplatesApi: PatientTemplatesApiService,
    private codeLibraryApi: CodeLibraryApiService,
    private receiverLibraryApi: ReceiverLibraryApiService,
    private physicianApi: PhysicianApiService,
    private cityStateZipApi: CityStateZipApiService,
    private customFieldsApi: CustomFieldsApiService,
    private eligibilityApi: EligibilityApiService,
    private router: Router,
    private auth: AuthService,
    private facility: FacilityService
  ) { }

  /** True when the current section has form settings that Save can persist. */
  get canSaveCurrentSection(): boolean {
    if (this.isLoading || this.isSaving) {
      return false;
    }
    if (this.loadError || this.customFieldsLoadError) {
      return false;
    }
    const id = this.selectedSection;
    if (id === 'general' || id === 'payment') {
      return false;
    }
    if (id === 'patient-custom-fields' || id === 'claim-custom-fields') {
      return false;
    }
    return this.settingsData != null;
  }

  /** Shown when Save is disabled so the user knows why. */
  get saveDisabledReason(): string | null {
    if (this.isLoading || this.isSaving || this.canSaveCurrentSection) {
      return null;
    }
    const id = this.selectedSection;
    if (id === 'general' || id === 'payment') {
      return 'This section has no settings to save yet.';
    }
    if (id === 'patient-custom-fields' || id === 'claim-custom-fields') {
      return 'Custom fields save when you add or edit each field (Add Field / Edit). Use Close to leave this page.';
    }
    if (this.loadError || this.customFieldsLoadError) {
      return null;
    }
    return 'Settings are not loaded. Try selecting this section again.';
  }

  ngOnInit(): void {
    this.loadSection(this.selectedSection);
    this.facilityChangeSub = this.facility.facilityId$.pipe(distinctUntilChanged()).subscribe(() => {
      if (this.selectedSection === 'patient-eligibility') {
        this.loadSection('patient-eligibility');
      }
    });
  }

  ngOnDestroy(): void {
    this.facilityChangeSub?.unsubscribe();
  }

  get canCustomizeForFacility(): boolean {
    return (
      this.auth.canManageTenantProgramSettings() &&
      this.sectionUsesProgramTier(this.selectedSection) &&
      this.selectedSection !== 'patient-eligibility'
    );
  }

  startFacilityCustomize(): void {
    this.facilityCustomizeMode = true;
    this.loadSection(this.selectedSection);
  }

  revertToSharedSettings(): void {
    const apiSection = this.toApiSectionName(this.selectedSection);
    if (this.selectedSection === 'sending-claims') {
      this.facilityCustomizeMode = false;
      this.loadSection(this.selectedSection);
      return;
    }
    this.isSaving = true;
    this.saveError = null;
    this.programSettingsApi.clearFacilityOverride(apiSection).subscribe({
      next: () => {
        this.facilityCustomizeMode = false;
        this.isSaving = false;
        this.loadSection(this.selectedSection);
      },
      error: err => {
        this.isSaving = false;
        this.handleSaveError(err, apiSection, true);
      }
    });
  }

  private sectionUsesProgramTier(sectionId: string): boolean {
    return sectionId !== 'patient'
      && sectionId !== 'patient-custom-fields'
      && sectionId !== 'claim-custom-fields';
  }

  onSelectSection(sectionId: string): void {
    if (this.selectedSection === sectionId) {
      return;
    }

    this.selectedSection = sectionId;
    this.saveError = null;
    this.saveSuccessMessage = null;
    if (!this.sectionUsesProgramTier(sectionId) || sectionId === 'patient-eligibility') {
      this.facilityCustomizeMode = false;
    }
    this.loadSection(sectionId);
  }

  get selectedSectionLabel(): string {
    const match = this.sections.find(s => s.id === this.selectedSection);
    if (!match) {
      return '';
    }

    if (this.selectedSection === 'patient-eligibility') {
      return 'Patient Eligibility';
    }

    if (this.selectedSection === 'company') {
      return 'Company';
    }

    if (this.selectedSection === 'sending-claims') {
      return 'Sending Claims';
    }

    if (this.selectedSection === 'interface') {
      return 'Interface Settings';
    }

    if (this.selectedSection === 'patient-custom-fields') {
      return 'Patient Custom Fields';
    }

    if (this.selectedSection === 'claim-custom-fields') {
      return 'Claim Custom Fields';
    }

    if (match.label.endsWith('Settings')) {
      return match.label;
    }

    return `${match.label} Settings`;
  }

  private loadSection(sectionId: string): void {
    this.isLoading = true;
    this.loadError = null;
    this.customFieldsLoadError = null;
    this.saveError = null;
    this.saveSuccessMessage = null;
    this.settingsData = null;

    if (sectionId === 'patient-custom-fields') {
      this.customFieldsApi.getByEntityType('Patient').subscribe({
        next: list => {
          this.patientCustomFields = list ?? [];
          this.isLoading = false;
        },
        error: err => {
          this.customFieldsLoadError = 'Failed to load custom field definitions.';
          this.isLoading = false;
          // eslint-disable-next-line no-console
          console.error('Error loading patient custom fields', err);
        }
      });
      return;
    }

    if (sectionId === 'patient-eligibility') {
      this.eligibilityAdvancedMode = false;
      this.programSettingsApi.getSection('patientEligibility').subscribe({
        next: data => {
          this.settingsData = hydratePatientEligibilitySettings(data);
          this.syncEligibilityAdvancedModeFromSettings(this.settingsData);
          this.loadEligibilityLookups();
          this.refreshEligibilityConfigStatus();
          this.isLoading = false;
        },
        error: err => {
          this.loadError = 'Failed to load settings.';
          this.isLoading = false;
          // eslint-disable-next-line no-console
          console.error('Error loading patient eligibility settings', err);
        }
      });
      return;
    }

    if (sectionId === 'claim-custom-fields') {
      this.customFieldsApi.getByEntityType('Claim').subscribe({
        next: claimList => {
          this.claimCustomFields = claimList ?? [];
          this.customFieldsApi.getByEntityType('ServiceLine').subscribe({
            next: slList => {
              this.serviceLineCustomFields = slList ?? [];
              this.isLoading = false;
            },
            error: err => {
              this.customFieldsLoadError = 'Failed to load service line custom fields.';
              this.isLoading = false;
              // eslint-disable-next-line no-console
              console.error('Error loading service line custom fields', err);
            }
          });
        },
        error: err => {
          this.customFieldsLoadError = 'Failed to load claim custom fields.';
          this.isLoading = false;
          // eslint-disable-next-line no-console
          console.error('Error loading claim custom fields', err);
        }
      });
      return;
    }

    if (sectionId === 'sending-claims') {
      forkJoin({
        core: this.programSettingsApi.getSendingClaimsSettings(),
        extended: this.programSettingsApi.getSection('sendingClaims')
      }).subscribe({
        next: ({ core, extended }) => {
          this.settingsData = hydrateSendingClaimsSettings(core, extended);
          this.loadSendingClaimsLookups();
          this.isLoading = false;
        },
        error: err => {
          this.loadError = 'Failed to load settings.';
          this.isLoading = false;
          // eslint-disable-next-line no-console
          console.error('Error loading sending claims settings', err);
        }
      });
      return;
    }

    const apiSection = this.toApiSectionName(sectionId);
    this.programSettingsApi.getSection(apiSection, this.apiScopeForSection(sectionId)).subscribe({
      next: data => {
        if (sectionId === 'patient') {
          this.settingsData = hydratePatientSettings(data);
          this.loadPatientTemplates();
        } else if (sectionId === 'claim') {
          this.settingsData = hydrateClaimSettings(data);
          this.loadClaimLookups();
        } else if (sectionId === 'company') {
          this.settingsData = hydrateCompanySettings(data);
        } else if (sectionId === 'interface') {
          this.settingsData = cloneSettings(hydrateInterfaceSettings(data));
        } else {
          this.settingsData = data ?? {};
        }
        this.isLoading = false;
      },
      error: err => {
        this.loadError = 'Failed to load settings.';
        this.isLoading = false;
        // eslint-disable-next-line no-console
        console.error('Error loading program settings', apiSection, err);
      }
    });
  }

  /** Maps UI section id to backend program-settings section key. */
  private toApiSectionName(sectionId: string): string {
    if (sectionId === 'patient-eligibility') {
      return 'patientEligibility';
    }
    return sectionId;
  }

  /** Tenant scope when editing shared defaults; facility-effective when customizing for one facility. */
  private apiScopeForSection(sectionId: string): 'tenant' | undefined {
    if (!this.sectionUsesProgramTier(sectionId)) {
      return undefined;
    }
    return this.facilityCustomizeMode ? undefined : 'tenant';
  }

  /** Save to company settings by default; facility when advanced override is on. */
  private saveScopeForSection(sectionId: string): 'tenant' | undefined {
    if (!this.sectionUsesProgramTier(sectionId)) {
      return undefined;
    }
    return this.facilityCustomizeMode ? undefined : 'tenant';
  }

  onSave(): void {
    this.save(false);
  }

  onSaveAndClose(): void {
    if (!this.canSaveCurrentSection) {
      this.onClose();
      return;
    }
    this.save(true);
  }

  onClose(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    void this.router.navigate(['/']);
  }

  private loadPatientTemplates(): void {
    if (this.patientTemplates.length > 0) {
      return;
    }

    this.patientTemplatesApi.getAll().subscribe({
      next: templates => {
        this.patientTemplates = templates ?? [];
      },
      error: err => {
        // eslint-disable-next-line no-console
        console.error('Error loading patient templates', err);
      }
    });
  }

  private save(closeAfter: boolean): void {
    if (!this.canSaveCurrentSection) {
      this.saveError = this.saveDisabledReason ?? 'Nothing to save for this section.';
      return;
    }

    if (this.selectedSection === 'patient' && this.facility.getFacilityIdOptional() == null) {
      this.saveError = 'Select a facility in the top bar before saving patient settings.';
      return;
    }

    this.isSaving = true;
    this.saveError = null;
    this.saveSuccessMessage = null;
    this.showMissingAccountsModal = false;
    this.missingAccountPatients = [];

    if (this.selectedSection === 'patient') {
      const payload = cloneSettings(this.settingsData as PatientProgramSettings);
      this.programSettingsApi.saveSection('patient', payload).pipe(
        switchMap(() => this.programSettingsApi.getSection('patient'))
      ).subscribe({
        next: data => {
          this.settingsData = hydratePatientSettings(data);
          this.finishSave(closeAfter, 'Patient settings saved.');
        },
        error: err => this.handlePatientSaveError(err)
      });
    } else if (this.selectedSection === 'claim') {
      const claimPayload = toClaimSavePayload(this.settingsData as ClaimProgramSettings);
      this.programSettingsApi.saveSection('claim', claimPayload, this.saveScopeForSection('claim')).pipe(
        switchMap(() => this.programSettingsApi.getSection('claim', this.apiScopeForSection('claim')))
      ).subscribe({
        next: data => {
          this.settingsData = hydrateClaimSettings(data);
          this.finishSave(closeAfter, 'Claim settings saved.');
        },
        error: err => this.handleSaveError(err, 'claim')
      });
    } else if (this.selectedSection === 'patient-eligibility') {
      if (this.facility.getFacilityIdOptional() == null) {
        this.saveError = 'Select a facility in the top bar before saving eligibility settings.';
        this.isSaving = false;
        return;
      }

      const eligibility = this.settingsData as PatientEligibilityProgramSettings;
      const validationError = this.validatePatientEligibility(eligibility);
      if (validationError) {
        this.saveError = validationError;
        this.isSaving = false;
        return;
      }

      const payload = toPatientEligibilitySavePayload(eligibility, {
        includeDirectoryFields:
          this.eligibilityAdvancedMode && eligibilityUsesSftpDirectories(eligibility.vendor)
      });
      this.programSettingsApi.saveSection('patientEligibility', payload).pipe(
        switchMap(() => this.programSettingsApi.getSection('patientEligibility'))
      ).subscribe({
        next: data => {
          this.settingsData = hydratePatientEligibilitySettings(data);
          this.syncEligibilityAdvancedModeFromSettings(this.settingsData);
          this.refreshEligibilityConfigStatus();
          this.finishSave(closeAfter, '');
        },
        error: err => this.handleEligibilitySaveError(err)
      });
    } else if (this.selectedSection === 'company') {
      this.companyValidationErrors = {};
      const errs = this.validateCompanySettings();
      if (errs.companyName || errs.npi || errs.taxId) {
        this.companyValidationErrors = errs;
        this.saveError = 'Please fix the validation errors below.';
        this.isSaving = false;
        return;
      }
      const payload = cloneSettings(this.settingsData as CompanyProgramSettings);
      this.programSettingsApi.saveSection('company', payload, this.saveScopeForSection('company')).pipe(
        switchMap(() => this.programSettingsApi.getSection('company', this.apiScopeForSection('company')))
      ).subscribe({
        next: data => {
          this.settingsData = hydrateCompanySettings(data);
          this.finishSave(closeAfter, 'Company settings saved.');
        },
        error: err => this.handleSaveError(err, 'company')
      });
    } else if (this.selectedSection === 'sending-claims') {
      const state = this.settingsData as SendingClaimsProgramSettings;
      const nextNum = Number(state.nextSubmissionNumber);
      if (!Number.isFinite(nextNum) || nextNum < 1) {
        this.saveError = 'Next Submission Number must be 1 or greater.';
        this.isSaving = false;
        return;
      }

      const corePayload = toSendingClaimsCorePayload(state);
      const extendedPayload = toSendingClaimsExtendedPayload(state);
      forkJoin([
        this.programSettingsApi.saveSendingClaimsSettings(corePayload),
        this.programSettingsApi.saveSection('sendingClaims', extendedPayload, this.saveScopeForSection('sending-claims'))
      ]).pipe(
        switchMap(() => forkJoin({
          core: this.programSettingsApi.getSendingClaimsSettings(),
          extended: this.programSettingsApi.getSection('sendingClaims')
        }))
      ).subscribe({
        next: ({ core, extended }) => {
          this.settingsData = hydrateSendingClaimsSettings(core, extended);
          this.finishSave(closeAfter, 'Sending Claims settings saved.');
        },
        error: err => this.handleSaveError(err, 'sending claims')
      });
    } else if (this.selectedSection === 'interface') {
      const payload = cloneSettings(this.settingsData as InterfaceProgramSettings);
      this.programSettingsApi.saveSection('interface', payload, this.saveScopeForSection('interface')).pipe(
        switchMap(() => this.programSettingsApi.getSection('interface', this.apiScopeForSection('interface')))
      ).subscribe({
        next: data => {
          this.settingsData = cloneSettings(hydrateInterfaceSettings(data));
          this.finishSave(closeAfter, 'Interface settings saved.');
        },
        error: err => this.handleSaveError(err, 'interface')
      });
    } else if (this.selectedSection === 'general' || this.selectedSection === 'payment') {
      this.saveError = 'This section has no editable settings yet.';
      this.isSaving = false;
    } else {
      this.isSaving = false;
      this.saveError = 'Nothing to save for this section.';
    }
  }

  private finishSave(closeAfter: boolean, successMessage: string): void {
    this.isSaving = false;
    this.saveSuccessMessage = successMessage?.trim() ? successMessage : null;
    if (closeAfter) {
      this.onClose();
    }
  }

  private extractApiErrorMessage(err: unknown, fallback = 'Failed to save settings.'): string {
    const httpErr = err as HttpErrorResponse;
    const body = httpErr?.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    const obj = (body ?? {}) as { error?: string; message?: string; details?: string };
    return obj.error ?? obj.message ?? obj.details ?? fallback;
  }

  private handleSaveError(err: unknown, sectionLabel: string, useApiMessage = true): void {
    this.isSaving = false;
    this.saveError = useApiMessage
      ? this.extractApiErrorMessage(err)
      : 'Failed to save settings.';
    // eslint-disable-next-line no-console
    console.error(`Error saving ${sectionLabel} program settings`, err);
  }

  private handleEligibilitySaveError(err: unknown): void {
    this.isSaving = false;
    const httpErr = err as HttpErrorResponse;
    const body = (httpErr?.error ?? {}) as { error?: string; message?: string; details?: string; errorCode?: string };
    const apiMessage = body?.error ?? body?.message ?? body?.details ?? '';

    if (httpErr?.status === 409) {
      this.saveError = 'Eligibility settings were changed elsewhere. Your screen was refreshed — review and save again.';
      this.programSettingsApi.getSection('patientEligibility').subscribe({
        next: data => {
          this.settingsData = hydratePatientEligibilitySettings(data);
          this.syncEligibilityAdvancedModeFromSettings(this.settingsData);
          this.refreshEligibilityConfigStatus();
        },
        error: () => {
          // Keep conflict message; no-op if reload fails.
        }
      });
      return;
    }

    this.saveError = this.toEligibilityUserMessage(apiMessage);
    // eslint-disable-next-line no-console
    console.error('Error saving patient eligibility program settings', err);
  }

  private toEligibilityUserMessage(raw: string): string {
    const message = (raw ?? '').trim();
    if (!message) {
      return 'Unable to save eligibility settings.';
    }
    const technical =
      /persistence verification|uploaddirectory|incomingdirectory|processeddirectory|quarantinedirectory|repository|round-trip|request uploaddirectory|settings uploaddirectory|diagnostics/i;
    if (technical.test(message)) {
      return 'Unable to save eligibility settings.';
    }
    if (/connection settings/i.test(message)) {
      return 'Please complete all required eligibility connection settings.';
    }
    if (/password/i.test(message) && /required/i.test(message)) {
      return 'Password is required.';
    }
    if (/receiver/i.test(message) && /required/i.test(message)) {
      return 'Select a receiver.';
    }
    if (/username/i.test(message) && /required/i.test(message)) {
      return 'Username is required.';
    }
    if (/server/i.test(message) && /required/i.test(message)) {
      return 'Server is required.';
    }
    if (/succeeded|looks valid|test failed/i.test(message)) {
      return message;
    }
    if (/could not be saved|unable to save|please verify|select a /i.test(message)) {
      return message;
    }
    if (/required/i.test(message) && !/directory/i.test(message)) {
      return message;
    }
    return 'Eligibility settings could not be saved.';
  }

  onEligibilitySourceChange(): void {
    if (!this.settingsData) {
      return;
    }
    const state = this.settingsData as PatientEligibilityProgramSettings;
    if (eligibilityUsesRestGateway(state.vendor)) {
      state.uploadDirectory = '';
      state.incomingDirectory = '';
      state.processedDirectory = '';
      this.eligibilityAdvancedMode = false;
      return;
    }
    if (!this.eligibilityAdvancedMode) {
      state.uploadDirectory = '';
      state.incomingDirectory = '';
      state.processedDirectory = '';
    }
  }

  usesEligibilitySftpDirectories(): boolean {
    const vendor = (this.settingsData as PatientEligibilityProgramSettings | null)?.vendor;
    return eligibilityUsesSftpDirectories(vendor);
  }

  /** Operational display label for the current eligibility source/vendor. */
  getEligibilitySourceLabel(value: string | null | undefined): string {
    const match = this.eligibilitySourceOptions.find(o => o.value === value);
    return match?.label ?? (value ?? '');
  }

  private syncEligibilityAdvancedModeFromSettings(state: PatientEligibilityProgramSettings | null): void {
    if (!state) {
      return;
    }
    if (!eligibilityUsesSftpDirectories(state.vendor)) {
      this.eligibilityAdvancedMode = false;
      return;
    }
    const hasPaths =
      !!(state.uploadDirectory ?? '').trim() ||
      !!(state.incomingDirectory ?? '').trim() ||
      !!(state.processedDirectory ?? '').trim();
    if (hasPaths) {
      this.eligibilityAdvancedMode = true;
    }
  }

  private handlePatientSaveError(err: unknown): void {
    this.isSaving = false;
    const errorBody = (err as { error?: { errorCode?: string; patients?: unknown[] } })?.error;
    if (errorBody?.errorCode === 'PATIENTS_MISSING_ACCOUNT_NUMBERS' && Array.isArray(errorBody.patients)) {
      this.missingAccountPatients = errorBody.patients as {
        patId: number;
        name?: string | null;
        accountNumber?: string | null;
      }[];
      this.showMissingAccountsModal = true;
      return;
    }
    this.saveError = this.extractApiErrorMessage(err);
    // eslint-disable-next-line no-console
    console.error('Error saving patient program settings', err);
  }

  private validatePatientEligibility(state: PatientEligibilityProgramSettings): string | null {
    if (!(state.receiverId ?? '').toString().trim()) {
      return 'Select a receiver.';
    }
    if (!(state.vendor ?? '').toString().trim()) {
      return 'Select a source.';
    }
    if (!(state.username ?? '').trim()) {
      return 'Username is required.';
    }
    const pwd = (state.password ?? '').toString();
    if (!pwd.trim() && !state.passwordConfigured) {
      return 'Password is required.';
    }
    if (!(state.server ?? '').trim()) {
      return 'Server is required.';
    }
    if (this.eligibilityAdvancedMode && eligibilityUsesSftpDirectories(state.vendor)) {
      if (!(state.uploadDirectory ?? '').trim() ||
        !(state.incomingDirectory ?? '').trim() ||
        !(state.processedDirectory ?? '').trim()) {
        return 'Please complete all file path settings.';
      }
    }
    return null;
  }

  get eligibilityCredentialsStatusMessage(): string {
    const status = this.eligibilityConfigStatus;
    if (!status) {
      return 'Complete username, password, and server settings.';
    }
    const custom = (status.credentialsStatusMessage ?? '').trim();
    if (custom) {
      return custom;
    }
    return status.credentialsValid
      ? 'Credentials are configured. Use Test Connection to verify gateway access.'
      : 'Complete username, password, and server settings. You can still save while provisioning finishes.';
  }

  get eligibilityTestResultMessage(): string | null {
    if (!this.eligibilityTestResult) {
      return null;
    }
    const mapped = this.mapEligibilityTestMessage(this.eligibilityTestResult);
    if (mapped) {
      return mapped;
    }
    return this.eligibilityTestResult.success
      ? 'Connection test succeeded.'
      : 'Connection test failed. Please verify your settings.';
  }

  closeMissingAccountsModal(): void {
    this.showMissingAccountsModal = false;
  }

  private loadClaimLookups(): void {
    if (this.posOptions.length === 0) {
      this.codeLibraryApi.loadLibraryCodes('pos').subscribe({
        next: rows => {
          this.posOptions = rows ?? [];
        },
        error: err => {
          // eslint-disable-next-line no-console
          console.error('Error loading POS codes', err);
        }
      });
    }
  }

  private loadSendingClaimsLookups(): void {
    if (this.sendingClaimsReceivers.length === 0) {
      this.receiverLibraryApi.getAll().subscribe({
        next: res => {
          this.sendingClaimsReceivers = res?.data ?? [];
        },
        error: err => {
          // eslint-disable-next-line no-console
          console.error('Error loading receiver library for sending claims', err);
        }
      });
    }
  }

  /** Validate company settings. Returns error messages keyed by field (only set when invalid). */
  private validateCompanySettings(): { companyName?: string; taxId?: string; npi?: string } {
    const errs: { companyName?: string; taxId?: string; npi?: string } = {};
    const d = this.settingsData as CompanyProgramSettings | null;
    if (!d) return errs;

    const name = (d.companyName ?? '').trim();
    if (!name) {
      errs.companyName = 'Company Name is required.';
    }

    const npi = (d.npi ?? '').trim().replace(/\D/g, '');
    if (npi && npi.length !== 10) {
      errs.npi = 'NPI must be 10 digits.';
    }

    const taxId = (d.taxId ?? '').trim();
    if (taxId) {
      const ssn = /^\d{3}-\d{2}-\d{4}$/;
      const ein = /^\d{2}-\d{7}$/;
      if (!ssn.test(taxId) && !ein.test(taxId)) {
        errs.taxId = 'Tax ID must be SSN format ###-##-#### or EIN format ##-#######.';
      }
    }

    return errs;
  }

  /** Look up city/state from City State Zip library by zip and auto-fill when section is company. */
  onCompanyZipBlur(): void {
    if (this.selectedSection !== 'company' || !this.settingsData) return;
    const company = this.settingsData as CompanyProgramSettings;
    const zip = (company.zip ?? '').trim();
    if (!zip) return;

    this.cityStateZipApi.get(1, 10, { search: zip }).subscribe({
      next: res => {
        const items = res?.items ?? [];
        const match = items.find((r: { zip: string }) => (r.zip || '').trim() === zip) ?? items[0];
        if (match) {
          company.city = match.city ?? company.city;
          company.state = match.state ?? company.state;
        }
      },
      error: () => { /* ignore */ }
    });
  }

  private refreshEligibilityConfigStatus(): void {
    // Avoid spamming; configuration-status endpoint is cheap, but still only call when settings exist.
    if (!this.settingsData) return;

    this.eligibilityConfigStatus = null;
    this.eligibilityTestResult = null;

    this.eligibilityApi.configurationStatus({ patientId: null }).subscribe({
      next: status => this.eligibilityConfigStatus = status,
      error: () => {
        this.eligibilityConfigStatus = null;
      }
    });
  }

  testEligibilityConnection(): void {
    if (!this.settingsData) return;
    this.isTestingEligibility = true;
    this.eligibilityTestResult = null;

    this.eligibilityApi.testConnection(this.buildEligibilityTestConnectionRequest()).subscribe({
      next: res => {
        const normalized = this.normalizeEligibilityTestResult(res);
        normalized.message = this.mapEligibilityTestMessage(normalized) ?? normalized.message ?? '';
        this.eligibilityTestResult = normalized;
        this.isTestingEligibility = false;
      },
      error: err => {
        this.isTestingEligibility = false;
        const raw = err?.error ?? {};
        const message =
          raw?.message ??
          raw?.error ??
          err?.message ??
          'Eligibility test failed.';

        const normalized = this.normalizeEligibilityTestResult({
          ...(typeof raw === 'object' && raw !== null ? raw : {}),
          success: Boolean(raw?.success),
          message,
        });
        normalized.message = this.mapEligibilityTestMessage(normalized) ?? message;
        this.eligibilityTestResult = normalized;
      }
    });
  }

  private buildEligibilityTestConnectionRequest(): EligibilityConnectionTestRequestDto {
    const d = (this.settingsData ?? {}) as PatientEligibilityProgramSettings;
    const pwd = (d.password ?? '').toString().trim();

    const vendor = (d.vendor ?? 'GenericSftp').toString();
    const settings: EligibilityConnectionTestRequestDto['settings'] = {
      vendor,
      receiverId: d.receiverId != null ? String(d.receiverId) : null,
      server: (d.server ?? '').trim() || null,
      username: (d.username ?? '').trim() || null,
      password: pwd || (d.passwordConfigured ? '********' : null),
      quarantineDirectory: null
    };
    if (eligibilityUsesSftpDirectories(vendor)) {
      settings.uploadDirectory = (d.uploadDirectory ?? '').trim() || null;
      settings.incomingDirectory = (d.incomingDirectory ?? '').trim() || null;
      settings.processedDirectory = (d.processedDirectory ?? '').trim() || null;
    }
    return { patientId: null, settings };
  }

  private mapEligibilityTestMessage(result: EligibilityConnectionTestResultDto): string | null {
    const raw = (result.message ?? '').trim();
    const failureKind = (result.failureKind ?? '').trim();

    switch (failureKind) {
      case 'Authentication':
        if (/authentication failure/i.test(raw)) {
          return 'Waystar accepted the request but rejected the RTE credentials. Confirm the RTE User ID and API password with Waystar (not the portal password).';
        }
        return 'Waystar rejected the username or password.';
      case 'Timeout':
        return 'Waystar gateway did not respond in time. Check network connectivity or try again later.';
      case 'Network':
        return 'Could not reach the Waystar gateway. Check the server URL and network connectivity.';
      case 'InvalidPayload':
        if (/form-urlencoded|empty request received|api specifications/i.test(raw)) {
          return 'Waystar received the request but did not accept the payload format. GatewayAsync expects form-urlencoded fields: UserID, Password, DataFormat, Data, ResponseType.';
        }
        return 'Waystar rejected the test eligibility request. Verify the 270 payload and receiver configuration.';
      case 'IpRestriction':
        return 'Your server IP may not be allowlisted with Waystar yet. You can still save credentials.';
      case 'GatewayError':
        return raw || 'Waystar returned an unexpected gateway error.';
      default:
        break;
    }

    if (/connected host failed to respond/i.test(raw)) {
      return 'Waystar gateway did not respond in time. This usually means the gateway URL or transport settings are wrong.';
    }
    if (/rejected the username|invalid user|unauthorized/i.test(raw)) {
      return 'Waystar rejected the username or password.';
    }
    if (raw) {
      return raw;
    }
    return null;
  }

  private normalizeEligibilityTestResult(raw: any): EligibilityConnectionTestResultDto {
    const message =
      raw?.message ??
      raw?.error ??
      'Eligibility test failed.';

    return {
      success: Boolean(raw?.success),
      message,
      vendor: raw?.vendor ?? null,
      receiverId: raw?.receiverId ?? null,
      server: raw?.server ?? null,
      receiverValid: Boolean(raw?.receiverValid),
      credentialsValid: Boolean(raw?.credentialsValid),
      directoriesValid: Boolean(raw?.directoriesValid),
      failureKind: raw?.failureKind ?? null,
      httpStatusCode: raw?.httpStatusCode ?? null,
      errors: Array.isArray(raw?.errors)
        ? raw.errors
        : message
          ? [message]
          : [],
      diagnostics: Array.isArray(raw?.diagnostics)
        ? raw.diagnostics
        : []
    };
  }

  private loadEligibilityLookups(): void {
    if (this.eligibilityReceivers.length === 0) {
      this.receiverLibraryApi.getAll('eligibility').subscribe({
        next: res => {
          this.eligibilityReceivers = res?.data ?? [];
        },
        error: err => {
          // eslint-disable-next-line no-console
          console.error('Error loading receiver library for eligibility', err);
        }
      });
    }

    if (this.physiciansList.length === 0) {
      this.physicianApi.getPhysicians(1, 500, { inactive: false }).subscribe({
        next: res => {
          this.physiciansList = res?.data ?? [];
        },
        error: err => {
          // eslint-disable-next-line no-console
          console.error('Error loading physicians for eligibility', err);
        }
      });
    }
  }

  openAddCustomField(entityType: 'Patient' | 'Claim' | 'ServiceLine'): void {
    this.customFieldModalEntityType = entityType;
    this.customFieldModalLabel = '';
    this.customFieldModalFieldType = 'TEXT';
    this.customFieldModalId = null;
    this.customFieldModalError = null;
    this.showCustomFieldModal = true;
  }

  openEditCustomField(def: CustomFieldDefinitionDto, entityType: 'Patient' | 'Claim' | 'ServiceLine'): void {
    this.customFieldModalEntityType = entityType;
    this.customFieldModalLabel = def.label;
    this.customFieldModalFieldType = def.fieldType;
    this.customFieldModalId = def.id;
    this.customFieldModalError = null;
    this.showCustomFieldModal = true;
  }

  closeCustomFieldModal(): void {
    this.showCustomFieldModal = false;
    this.customFieldModalError = null;
  }

  saveCustomFieldModal(): void {
    const label = (this.customFieldModalLabel ?? '').trim();
    if (!label) {
      this.customFieldModalError = 'Label is required.';
      return;
    }
    this.customFieldModalSaving = true;
    this.customFieldModalError = null;

    if (this.customFieldModalId != null) {
      this.customFieldsApi.update(this.customFieldModalId, {
        label,
        fieldType: this.customFieldModalFieldType
      }).subscribe({
        next: () => {
          this.customFieldDefinitionsModified = true;
          this.refreshCustomFieldsList();
          this.closeCustomFieldModal();
          this.customFieldModalSaving = false;
        },
        error: err => {
          this.customFieldModalError = err?.error?.error ?? 'Failed to update field.';
          this.customFieldModalSaving = false;
        }
      });
    } else {
      const list = this.getCurrentCustomFieldsList();
      const nextNum = list.length + 1;
      const fieldKey = `custom${nextNum}`;
      this.customFieldsApi.create({
        entityType: this.customFieldModalEntityType,
        fieldKey,
        label,
        fieldType: this.customFieldModalFieldType,
        sortOrder: nextNum - 1
      }).subscribe({
        next: () => {
          this.customFieldDefinitionsModified = true;
          this.refreshCustomFieldsList();
          this.closeCustomFieldModal();
          this.customFieldModalSaving = false;
        },
        error: err => {
          this.customFieldModalError = err?.error?.error ?? 'Failed to create field.';
          this.customFieldModalSaving = false;
        }
      });
    }
  }

  private getCurrentCustomFieldsList(): CustomFieldDefinitionDto[] {
    if (this.selectedSection === 'patient-custom-fields') return this.patientCustomFields;
    if (this.selectedSection === 'claim-custom-fields') {
      return this.customFieldModalEntityType === 'ServiceLine'
        ? this.serviceLineCustomFields
        : this.claimCustomFields;
    }
    return [];
  }

  private refreshCustomFieldsList(): void {
    if (this.selectedSection === 'patient-custom-fields') {
      this.customFieldsApi.getByEntityType('Patient').subscribe({
        next: list => { this.patientCustomFields = list ?? []; }
      });
    } else if (this.selectedSection === 'claim-custom-fields') {
      this.customFieldsApi.getByEntityType('Claim').subscribe({
        next: list => {
          this.claimCustomFields = list ?? [];
          this.customFieldsApi.getByEntityType('ServiceLine').subscribe({
            next: sl => { this.serviceLineCustomFields = sl ?? []; }
          });
        }
      });
    }
  }

  deleteCustomField(def: CustomFieldDefinitionDto, entityType: 'Patient' | 'Claim' | 'ServiceLine'): void {
    if (!window.confirm(`Delete custom field "${def.label}"?`)) return;
    this.customFieldsApi.deactivate(def.id).subscribe({
      next: () => {
        this.customFieldDefinitionsModified = true;
        this.refreshCustomFieldsList();
      },
      error: err => {
        // eslint-disable-next-line no-console
        console.error('Error deactivating custom field', err);
      }
    });
  }
}