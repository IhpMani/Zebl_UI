import { Component, OnInit } from '@angular/core';
import { ClaimTemplate, ClaimTemplateApiService } from './claim-template-api.service';
import { PatientApiService } from '../../core/services/patient-api.service';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { PatientsApiResponse, PatientListItem } from '../../core/services/patient.models';
import { PhysiciansApiResponse, PhysicianListItem } from '../../core/services/physician.models';

@Component({
  selector: 'app-claim-template-library-page',
  templateUrl: './claim-template-library-page.component.html',
  styleUrls: ['./claim-template-library-page.component.scss']
})
export class ClaimTemplateLibraryPageComponent implements OnInit {
  templates: ClaimTemplate[] = [];
  selectedTemplateId: number | null = null;

  patients = [] as { id: number; label: string }[];
  /** Rendering / referring / ordering / supervising providers (Person type) */
  physicians = [] as { id: number; label: string }[];
  /** Billing providers (Non-Person / organization type) */
  billingProviders = [] as { id: number; label: string }[];
  /** Service facilities (Non-Person type) */
  facilities = [] as { id: number; label: string }[];

  template: ClaimTemplate & { diagnoses: Record<string, string> } = {
    id: undefined,
    templateName: '',
    availableToPatientId: null,
    billingProviderId: null,
    renderingProviderId: null,
    serviceFacilityId: null,
    referringProviderId: null,
    orderingProviderId: null,
    supervisingProviderId: null,
    diagnoses: {}
  };

  diagnosisPositions = [
    { key: 'A1', label: 'A1' }, { key: 'B2', label: 'B2' },
    { key: 'C3', label: 'C3' }, { key: 'D4', label: 'D4' },
    { key: 'E5', label: 'E5' }, { key: 'F6', label: 'F6' },
    { key: 'G7', label: 'G7' }, { key: 'H8', label: 'H8' },
    { key: 'I9', label: 'I9' }, { key: 'J10', label: 'J10' },
    { key: 'K11', label: 'K11' }, { key: 'L12', label: 'L12' }
  ];

  serviceLines: any[] = [];

  saving = false;
  error: string | null = null;

  constructor(
    private api: ClaimTemplateApiService,
    private patientApi: PatientApiService,
    private physicianApi: PhysicianApiService
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
    this.loadPatients();
    this.loadPhysicians();
  }

  private loadTemplates(): void {
    this.api.getAll().subscribe({
      next: (items) => {
        this.templates = items;
      },
      error: () => {
        this.error = 'Failed to load claim templates.';
      }
    });
  }

  private loadPatients(): void {
    // Backend enforces pageSize <= 100, so cap at 100.
    this.patientApi.getPatients(1, 100, {
      active: true
    }).subscribe({
      next: (resp: PatientsApiResponse) => {
        this.patients = (resp.data || []).map((p: PatientListItem) => {
          // Name: LAST, FIRST (like desktop UI)
          let name = '';
          if (p.patLastName || p.patFirstName) {
            const last = (p.patLastName ?? '').toUpperCase();
            const first = (p.patFirstName ?? '').toUpperCase();
            name = `${last}, ${first}`.trim().replace(/^, /, '').replace(/, $/, '');
          } else if (p.patFullNameCC) {
            name = p.patFullNameCC.toUpperCase();
          }

          const acct = p.patAccountNo ? p.patAccountNo : '';
          const balValue = p.patTotalBalanceCC ?? 0;
          const bal = `$${balValue.toFixed(2)}`;
          const parts = [name, acct, bal].filter(x => !!x);
          return {
            id: p.patID,
            label: parts.join(' | ')
          };
        });
      },
      error: () => {
        // Non-fatal; dropdown will just be empty
      }
    });
  }

  private loadPhysicians(): void {
    this.physicianApi.getPhysicians(1, 1000, {
      inactive: false
    }).subscribe({
      next: (resp: PhysiciansApiResponse) => {
        const all: PhysicianListItem[] = resp.data || [];
        const rendering = all.filter(p => p.phyType === 'Person');
        const nonPerson = all.filter(p => p.phyType === 'Non-Person');

        this.physicians = rendering.map(p => ({
          id: p.phyID,
          label: p.phyFullNameCC || p.phyName || `Provider ${p.phyID}`
        }));

        // Billing Provider: Classification = Billing in Physician Library.
        // That is stored as phyPrimaryCodeType = 'BI' for Non-Person rows.
        const billingCandidates = nonPerson.filter(p => p.phyPrimaryCodeType === 'BI');
        this.billingProviders = billingCandidates.map(p => ({
          id: p.phyID,
          label: p.phyFullNameCC || p.phyName || `Billing Provider ${p.phyID}`
        }));

        // Service Facility: Classification = Facility (phyPrimaryCodeType = 'FA') for Non-Person rows.
        const facilityCandidates = nonPerson.filter(p => p.phyPrimaryCodeType === 'FA');
        this.facilities = facilityCandidates.map(p => ({
          id: p.phyID,
          label: p.phyFullNameCC || p.phyName || `Facility ${p.phyID}`
        }));
      },
      error: () => {
        // Non-fatal
      }
    });
  }

  onAddNewClick(): void {
    this.selectedTemplateId = null;
    this.template = {
      id: undefined,
      templateName: '',
      availableToPatientId: null,
      billingProviderId: null,
      renderingProviderId: null,
      serviceFacilityId: null,
      referringProviderId: null,
      orderingProviderId: null,
      supervisingProviderId: null,
      diagnoses: {}
    };
    this.serviceLines = [];
  }

  onSelectTemplate(t: ClaimTemplate): void {
    if (!t.id) {
      return;
    }
    this.selectedTemplateId = t.id;
    this.saving = true;
    this.error = null;

    this.api.getById(t.id).subscribe({
      next: (full) => {
        this.template = {
          id: full.id,
          templateName: full.templateName,
          availableToPatientId: full.availableToPatientId,
          billingProviderId: full.billingProviderId,
          renderingProviderId: full.renderingProviderId,
          serviceFacilityId: full.serviceFacilityId,
          referringProviderId: full.referringProviderId,
          orderingProviderId: full.orderingProviderId,
          supervisingProviderId: full.supervisingProviderId,
          diagnoses: this.template.diagnoses || {}
        };
        this.saving = false;
      },
      error: () => {
        this.error = 'Failed to load template.';
        this.saving = false;
      }
    });
  }

  onAddServiceLineClick(): void {
    this.serviceLines = [
      ...this.serviceLines,
      { placeOfService: '', procedureCode: '', modifier1: '', diagnosisPointer: '', units: 1, description: '' }
    ];
  }

  onSaveNew(): void {
    this.saveInternal(true);
  }

  onSaveClose(): void {
    this.saveInternal(false);
  }

  private saveInternal(addNewAfter: boolean): void {
    if (!this.template.templateName || !this.template.templateName.trim()) {
      this.error = 'Template Name is required.';
      return;
    }

    this.saving = true;
    this.error = null;

    const payload: ClaimTemplate = {
      id: this.template.id ?? this.selectedTemplateId ?? undefined,
      templateName: this.template.templateName.trim(),
      availableToPatientId: this.template.availableToPatientId,
      billingProviderId: this.template.billingProviderId,
      renderingProviderId: this.template.renderingProviderId,
      serviceFacilityId: this.template.serviceFacilityId,
      referringProviderId: this.template.referringProviderId,
      orderingProviderId: this.template.orderingProviderId,
      supervisingProviderId: this.template.supervisingProviderId
    };

    if (payload.id) {
      this.api.update(payload).subscribe({
        next: () => {
          this.saving = false;
          this.loadTemplates();
          if (addNewAfter) {
            this.onAddNewClick();
          }
        },
        error: () => {
          this.error = 'Failed to save template.';
          this.saving = false;
        }
      });
    } else {
      this.api.create(payload).subscribe({
        next: (created) => {
          if (created && created.id) {
            this.selectedTemplateId = created.id;
            this.template.id = created.id;
          }
          this.saving = false;
          this.loadTemplates();
          if (addNewAfter) {
            this.onAddNewClick();
          }
        },
        error: () => {
          this.error = 'Failed to save template.';
          this.saving = false;
        }
      });
    }
  }

  onDelete(): void {
    if (!this.selectedTemplateId) {
      return;
    }
    this.saving = true;
    this.error = null;
    this.api.delete(this.selectedTemplateId).subscribe({
      next: () => {
        this.saving = false;
        this.onAddNewClick();
        this.loadTemplates();
      },
      error: () => {
        this.error = 'Failed to delete template.';
        this.saving = false;
      }
    });
  }

  onClose(): void {
    // For now, just reset current selection.
    this.onAddNewClick();
  }
}

