import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
export class ProgramSetupPageComponent implements OnInit {
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

  selectedSection: string = 'general';
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

  constructor(
    private programSettingsApi: ProgramSettingsApiService,
    private patientTemplatesApi: PatientTemplatesApiService,
    private codeLibraryApi: CodeLibraryApiService,
    private receiverLibraryApi: ReceiverLibraryApiService,
    private physicianApi: PhysicianApiService,
    private cityStateZipApi: CityStateZipApiService,
    private customFieldsApi: CustomFieldsApiService,
    private eligibilityApi: EligibilityApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadSection(this.selectedSection);
  }

  onSelectSection(sectionId: string): void {
    if (this.selectedSection === sectionId) {
      return;
    }

    this.selectedSection = sectionId;
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
      this.programSettingsApi.getSection('patientEligibility').subscribe({
        next: data => {
          this.settingsData = hydratePatientEligibilitySettings(data);
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
    this.programSettingsApi.getSection(apiSection).subscribe({
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

  onSave(): void {
    this.save(false);
  }

  onSaveAndClose(): void {
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
    if (this.selectedSection === 'patient-custom-fields' || this.selectedSection === 'claim-custom-fields') {
      if (closeAfter) {
        this.onClose();
      }
      return;
    }

    if (!this.settingsData) {
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
      this.programSettingsApi.saveSection('claim', claimPayload).pipe(
        switchMap(() => this.programSettingsApi.getSection('claim'))
      ).subscribe({
        next: data => {
          this.settingsData = hydrateClaimSettings(data);
          this.finishSave(closeAfter, 'Claim settings saved.');
        },
        error: err => this.handleSaveError(err, 'claim')
      });
    } else if (this.selectedSection === 'patient-eligibility') {
      const eligibility = this.settingsData as PatientEligibilityProgramSettings;
      const validationError = this.validatePatientEligibility(eligibility);
      if (validationError) {
        this.saveError = validationError;
        this.isSaving = false;
        return;
      }

      const payload = toPatientEligibilitySavePayload(eligibility);
      this.programSettingsApi.saveSection('patientEligibility', payload).pipe(
        switchMap(saved => of(hydratePatientEligibilitySettings(saved)))
      ).subscribe({
        next: data => {
          const missingTransport = this.getMissingEligibilityTransportFields(data);
          if (missingTransport.length > 0) {
            this.isSaving = false;
            this.saveError = `Save completed but persisted settings are missing: ${missingTransport.join(', ')}.`;
            return;
          }
          this.settingsData = data;
          this.refreshEligibilityConfigStatus();
          this.finishSave(closeAfter, 'Patient Eligibility settings saved.');
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
      this.programSettingsApi.saveSection('company', payload).pipe(
        switchMap(() => this.programSettingsApi.getSection('company'))
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
        this.programSettingsApi.saveSection('sendingClaims', extendedPayload)
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
      this.programSettingsApi.saveSection('interface', payload).pipe(
        switchMap(() => this.programSettingsApi.getSection('interface'))
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
    this.saveSuccessMessage = successMessage;
    if (closeAfter) {
      this.onClose();
    }
  }

  private handleSaveError(err: unknown, sectionLabel: string, useApiMessage = false): void {
    this.isSaving = false;
    const body = (err as { error?: { error?: string; message?: string; details?: string } })?.error;
    this.saveError = useApiMessage
      ? (body?.error ?? body?.message ?? body?.details ?? 'Failed to save settings.')
      : 'Failed to save settings.';
    // eslint-disable-next-line no-console
    console.error(`Error saving ${sectionLabel} program settings`, err);
  }

  private handleEligibilitySaveError(err: unknown): void {
    this.isSaving = false;
    const httpErr = err as HttpErrorResponse;
    const body = (httpErr?.error ?? {}) as { error?: string; message?: string; details?: string; errorCode?: string };
    const apiMessage = body?.error ?? body?.message ?? body?.details ?? 'Failed to save settings.';

    if (httpErr?.status === 409) {
      this.saveError = `Save conflict: ${apiMessage} Reloaded latest server values. Re-apply changes and save again.`;
      this.programSettingsApi.getSection('patientEligibility').subscribe({
        next: data => {
          this.settingsData = hydratePatientEligibilitySettings(data);
          this.refreshEligibilityConfigStatus();
        },
        error: () => {
          // Keep conflict message; no-op if reload fails.
        }
      });
      return;
    }

    this.saveError = apiMessage;
    // eslint-disable-next-line no-console
    console.error('Error saving patient eligibility program settings', err);
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
    this.saveError = 'Failed to save settings.';
    // eslint-disable-next-line no-console
    console.error('Error saving patient program settings', err);
  }

  private validatePatientEligibility(state: PatientEligibilityProgramSettings): string | null {
    if (!(state.receiverId ?? '').toString().trim()) {
      return 'Receiver is required for eligibility.';
    }
    if (!(state.vendor ?? '').toString().trim()) {
      return 'Eligibility vendor is required.';
    }
    if (!(state.username ?? '').trim()) {
      return 'Username is required for eligibility.';
    }
    if (!(state.server ?? '').trim()) {
      return 'Server is required for eligibility.';
    }
    const pwd = (state.password ?? '').toString();
    if (!pwd.trim() && !state.passwordConfigured) {
      return 'Password is required for eligibility (or configure a password to enable persistence).';
    }
    if (!(state.uploadDirectory ?? '').trim() ||
      !(state.incomingDirectory ?? '').trim() ||
      !(state.processedDirectory ?? '').trim()) {
      return 'Upload, Incoming, and Processed directories are required.';
    }
    return null;
  }

  private getMissingEligibilityTransportFields(state: PatientEligibilityProgramSettings): string[] {
    const missing: string[] = [];
    if (!(state.server ?? '').trim()) missing.push('server');
    if (!(state.uploadDirectory ?? '').trim()) missing.push('uploadDirectory');
    if (!(state.incomingDirectory ?? '').trim()) missing.push('incomingDirectory');
    if (!(state.processedDirectory ?? '').trim()) missing.push('processedDirectory');
    return missing;
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
        this.eligibilityTestResult = this.normalizeEligibilityTestResult(res);
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

        // Always normalize so template never hits undefined arrays.
        this.eligibilityTestResult = this.normalizeEligibilityTestResult({
          ...(typeof raw === 'object' && raw !== null ? raw : {}),
          success: Boolean(raw?.success),
          message,
        });
      }
    });
  }

  private buildEligibilityTestConnectionRequest(): EligibilityConnectionTestRequestDto {
    const d = (this.settingsData ?? {}) as PatientEligibilityProgramSettings;
    const pwd = (d.password ?? '').toString().trim();

    return {
      patientId: null,
      settings: {
        vendor: (d.vendor ?? 'GenericSftp').toString(),
        receiverId: d.receiverId != null ? String(d.receiverId) : null,
        server: (d.server ?? '').trim() || null,
        username: (d.username ?? '').trim() || null,
        password: pwd || (d.passwordConfigured ? '********' : null),
        uploadDirectory: (d.uploadDirectory ?? '').trim() || null,
        incomingDirectory: (d.incomingDirectory ?? '').trim() || null,
        processedDirectory: (d.processedDirectory ?? '').trim() || null,
        quarantineDirectory: null
      }
    };
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