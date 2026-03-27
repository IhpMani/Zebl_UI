import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
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
  settingsData: any = null;
  isLoading = false;
  loadError: string | null = null;
  isSaving = false;
  saveError: string | null = null;

  patientTemplates: PatientTemplateDto[] = [];
  showMissingAccountsModal = false;
  missingAccountPatients: { patId: number; name?: string | null; accountNumber?: string | null }[] = [];

  readonly claimStatusOptions: readonly ClaimStatusOption[] = CLAIM_STATUS_OPTIONS;
  posOptions: CodeLibraryRow[] = [];

  /** Patient Eligibility: source options (clearinghouse; value stored in settingsData.source). */
  eligibilitySourceOptions: { value: string; label: string }[] = [
    { value: 'Capario', label: 'Capario (Change Healthcare)' },
    { value: 'TriZetto', label: 'TriZetto' },
    { value: 'Navicure', label: 'Navicure' },
    { value: 'PracticeInsight', label: 'Practice Insight' },
    { value: 'ZirMed', label: 'ZirMed' },
    { value: 'OfficeAlly', label: 'Office Ally' },
    { value: 'Waystar', label: 'Waystar' },
    { value: 'EDIConnection', label: 'EDI Connection (Mock EDI)' }
  ];
  /** Sources that require clearinghouse credentials (username/password/server). */
  readonly eligibilitySourcesRequiringCredentials = ['Capario', 'TriZetto', 'Navicure', 'PracticeInsight', 'ZirMed', 'OfficeAlly', 'Waystar'];

  get eligibilityCredentialsEnabled(): boolean {
    const source = (this.settingsData?.source ?? '').trim();
    return source.length > 0 && this.eligibilitySourcesRequiringCredentials.includes(source);
  }

  /** Receivers filtered for Format = "Eligibility Inquiry 270" (from receiver library). */
  eligibilityReceivers: ReceiverLibraryDto[] = [];
  /** Provider mode options. */
  providerModeOptions: { value: string; label: string }[] = [
    { value: 'PatientBillingProvider', label: 'Patient Billing Provider' },
    { value: 'PatientRenderingProvider', label: 'Patient Rendering Provider' },
    { value: 'SpecificProvider', label: 'Specific Provider' }
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
    private customFieldsApi: CustomFieldsApiService
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
          this.settingsData = this.applyPatientEligibilityDefaults(data);
          this.loadEligibilityLookups();
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

    this.programSettingsApi.getSection(sectionId).subscribe({
      next: data => {
        if (sectionId === 'patient') {
          this.settingsData = this.applyPatientDefaults(data);
          this.loadPatientTemplates();
        } else if (sectionId === 'claim') {
          this.settingsData = this.applyClaimDefaults(data);
          this.loadClaimLookups();
        } else if (sectionId === 'company') {
          this.settingsData = this.applyCompanyDefaults(data);
        } else if (sectionId === 'sending-claims') {
          this.settingsData = this.applySendingClaimsDefaults(data);
          this.loadSendingClaimsLookups();
        } else if (sectionId === 'interface') {
          this.settingsData = this.applyInterfaceDefaults(data);
        } else {
          this.settingsData = data;
        }
        this.isLoading = false;
      },
      error: err => {
        this.loadError = 'Failed to load settings.';
        this.isLoading = false;
        // eslint-disable-next-line no-console
        console.error('Error loading program settings', sectionId, err);
      }
    });
  }

  onSave(): void {
    this.save(false);
  }

  onSaveAndClose(): void {
    this.save(true);
  }

  onClose(): void {
    window.history.back();
  }

  private applyPatientDefaults(data: any): any {
    const defaults = {
      automaticAccountNumber: true,
      nextAccountNumber: 1000,
      nextAccountPrefix: '',
      requireAccountNumbers: false,
      requireUniqueAccountNumbers: false,
      automaticPatientTemplateId: null,
      initialAcceptAssignment: true
    };

    if (!data || typeof data !== 'object') {
      return { ...defaults };
    }

    return { ...defaults, ...data };
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
        window.history.back();
      }
      return;
    }

    if (!this.settingsData) {
      return;
    }

    this.isSaving = true;
    this.saveError = null;
    this.showMissingAccountsModal = false;
    this.missingAccountPatients = [];

    if (this.selectedSection === 'patient') {
      this.programSettingsApi.saveSection('patient', this.settingsData).subscribe({
        next: () => {
          this.isSaving = false;
          if (closeAfter) {
            window.history.back();
          }
        },
        error: err => {
          this.isSaving = false;
          const errorBody = err?.error;
          if (errorBody?.errorCode === 'PATIENTS_MISSING_ACCOUNT_NUMBERS' && Array.isArray(errorBody.patients)) {
            this.missingAccountPatients = errorBody.patients;
            this.showMissingAccountsModal = true;
          } else {
            this.saveError = 'Failed to save settings.';
            // eslint-disable-next-line no-console
            console.error('Error saving patient program settings', err);
          }
        }
      });
    } else if (this.selectedSection === 'claim') {
      this.programSettingsApi.saveSection('claim', this.settingsData).subscribe({
        next: () => {
          this.isSaving = false;
          if (closeAfter) {
            window.history.back();
          }
        },
        error: err => {
          this.isSaving = false;
          this.saveError = 'Failed to save settings.';
          // eslint-disable-next-line no-console
          console.error('Error saving claim program settings', err);
        }
      });
    } else if (this.selectedSection === 'patient-eligibility') {
      if (this.eligibilityCredentialsEnabled && !(this.settingsData.username ?? '').trim()) {
        this.saveError = 'Username is required when a clearinghouse source is selected.';
        this.isSaving = false;
        return;
      }
      this.saveError = null;
      this.programSettingsApi.saveSection('patientEligibility', this.settingsData).subscribe({
        next: () => {
          this.isSaving = false;
          if (closeAfter) {
            window.history.back();
          }
        },
        error: err => {
          this.isSaving = false;
          this.saveError = err?.error?.error ?? 'Failed to save settings.';
          // eslint-disable-next-line no-console
          console.error('Error saving patient eligibility program settings', err);
        }
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
      this.saveError = null;
      this.programSettingsApi.saveSection('company', this.settingsData).subscribe({
        next: () => {
          this.isSaving = false;
          if (closeAfter) {
            window.history.back();
          }
        },
        error: err => {
          this.isSaving = false;
          this.saveError = 'Failed to save settings.';
          // eslint-disable-next-line no-console
          console.error('Error saving company program settings', err);
        }
      });
    } else if (this.selectedSection === 'sending-claims') {
      this.programSettingsApi.saveSection('sending-claims', this.settingsData).subscribe({
        next: () => {
          this.isSaving = false;
          if (closeAfter) {
            window.history.back();
          }
        },
        error: err => {
          this.isSaving = false;
          this.saveError = 'Failed to save settings.';
          // eslint-disable-next-line no-console
          console.error('Error saving sending claims program settings', err);
        }
      });
    } else if (this.selectedSection === 'interface') {
      this.programSettingsApi.saveSection('interface', this.settingsData).subscribe({
        next: () => {
          this.isSaving = false;
          if (closeAfter) {
            window.history.back();
          }
        },
        error: err => {
          this.isSaving = false;
          this.saveError = 'Failed to save settings.';
          // eslint-disable-next-line no-console
          console.error('Error saving interface program settings', err);
        }
      });
    } else {
      this.isSaving = false;
    }
  }

  closeMissingAccountsModal(): void {
    this.showMissingAccountsModal = false;
  }

  private applyClaimDefaults(data: any): any {
    const defaults = {
      initialClaimStatus: 'OnHold',
      initialPlaceOfService: '11',
      initialICDIndicator: '0',
      lockClaimsAfterPrint: false,
      checkDuplicateServiceLines: true,
      validateICDLogic: true
    };

    if (!data || typeof data !== 'object') {
      return { ...defaults };
    }

    return { ...defaults, ...data };
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

  private applyPatientEligibilityDefaults(data: any): any {
    const defaults = {
      source: '',
      receiverId: null as string | null,
      providerMode: 'PatientBillingProvider',
      specificProviderId: null as number | null,
      username: '',
      password: '',
      server: '',
      showEligibilityResponseViewer: true
    };

    if (!data || typeof data !== 'object') {
      return { ...defaults };
    }

    return { ...defaults, ...data };
  }

  private applyCompanyDefaults(data: any): any {
    const defaults = {
      companyName: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      fax: '',
      email: '',
      website: '',
      taxId: '',
      npi: ''
    };

    if (!data || typeof data !== 'object') {
      return { ...defaults };
    }

    return { ...defaults, ...data };
  }

  private applySendingClaimsDefaults(data: any): any {
    const defaults = {
      defaultSubmitterReceiverId: null as string | null,
      exportFormat: 'ANSI837',
      autoMarkClaimsSent: true,
      lockClaimsAfterExport: false,
      exportBatchSize: 100
    };

    if (!data || typeof data !== 'object') {
      return { ...defaults };
    }

    return { ...defaults, ...data };
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

  private applyInterfaceDefaults(data: any): any {
    const defaultDuplicateCheckFields = {
      serviceDate: true,
      procedureCode: true,
      productCode: true,
      modifiers: true,
      diagnosisPointer: true
    };
    const defaults = {
      duplicateCheckFields: { ...defaultDuplicateCheckFields },
      assignPatientDiagnosisCodes: true
    };

    if (!data || typeof data !== 'object') {
      return { ...defaults };
    }

    return {
      duplicateCheckFields: { ...defaultDuplicateCheckFields, ...(data.duplicateCheckFields || {}) },
      assignPatientDiagnosisCodes: data.assignPatientDiagnosisCodes !== undefined ? data.assignPatientDiagnosisCodes : true
    };
  }

  /** Validate company settings. Returns error messages keyed by field (only set when invalid). */
  private validateCompanySettings(): { companyName?: string; taxId?: string; npi?: string } {
    const errs: { companyName?: string; taxId?: string; npi?: string } = {};
    const d = this.settingsData;
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
    const zip = (this.settingsData.zip ?? '').trim();
    if (!zip) return;

    this.cityStateZipApi.get(1, 10, { search: zip }).subscribe({
      next: res => {
        const items = res?.items ?? [];
        const match = items.find((r: { zip: string }) => (r.zip || '').trim() === zip) ?? items[0];
        if (match) {
          this.settingsData.city = match.city ?? this.settingsData.city;
          this.settingsData.state = match.state ?? this.settingsData.state;
        }
      },
      error: () => { /* ignore */ }
    });
  }

  private loadEligibilityLookups(): void {
    if (this.eligibilityReceivers.length === 0) {
      this.receiverLibraryApi.getAll().subscribe({
        next: res => {
          const list = res?.data ?? [];
          this.eligibilityReceivers = list.filter(
            r => (r.exportFormat && r.exportFormat.includes('270')) ||
                 (r.claimType && r.claimType.toLowerCase().includes('eligibility'))
          );
          if (this.eligibilityReceivers.length === 0) {
            this.eligibilityReceivers = list;
          }
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