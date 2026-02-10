import { Component, OnInit, OnDestroy } from '@angular/core';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { Subject, takeUntil } from 'rxjs';

interface PhysicianListItem {
  phyID: number;
  phyName: string | null;
  phyPrimaryCodeType: string | null;
}

interface PhysicianDetail {
  phyID: number;
  phyName: string | null;
  phyPrimaryCodeType: string | null;
  phyType: string;
  phyLastName: string | null;
  phyFirstName: string | null;
  phyMiddleName: string | null;
  phyAddress1: string | null;
  phyAddress2: string | null;
  phyCity: string | null;
  phyState: string | null;
  phyZip: string | null;
  phyTelephone: string | null;
  phyFax: string | null;
  phyEMail: string | null;
  phySpecialtyCode: string | null;
  phyInactive: boolean;
  phyNPI: string | null;
  phyEntityType: string | null;
  phyPrimaryIDCode: string | null;
}

@Component({
  selector: 'app-physician-library',
  templateUrl: './physician-library.component.html',
  styleUrls: ['./physician-library.component.css']
})
export class PhysicianLibraryComponent implements OnInit, OnDestroy {
  physicians: PhysicianListItem[] = [];
  filteredPhysicians: PhysicianListItem[] = [];
  selectedPhysician: PhysicianDetail | null = null;
  searchText: string = '';
  loading: boolean = false;
  saving: boolean = false;
  error: string | null = null;
  isNew: boolean = false;

  formData: PhysicianDetail = {
    phyID: 0,
    phyName: null,
    phyPrimaryCodeType: null,
    phyType: 'Person',
    phyLastName: null,
    phyFirstName: null,
    phyMiddleName: null,
    phyAddress1: null,
    phyAddress2: null,
    phyCity: null,
    phyState: null,
    phyZip: null,
    phyTelephone: null,
    phyFax: null,
    phyEMail: null,
    phySpecialtyCode: null,
    phyInactive: false,
    phyNPI: null,
    phyEntityType: null,
    phyPrimaryIDCode: null
  };

  classificationOptions = ['Rendering', 'Supervising', 'Facility'];
  typeOptions = ['Person', 'Non-Person'];
  taxIdTypeOptions = ['S', 'E', 'O'];

  private destroy$ = new Subject<void>();

  constructor(private physicianApiService: PhysicianApiService) { }

  ngOnInit(): void {
    this.loadPhysicians();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPhysicians(): void {
    this.loading = true;
    this.error = null;

    this.physicianApiService.getPhysicians(1, 1000, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.physicians = (response.data || []).map(p => ({
            phyID: p.phyID,
            phyName: p.phyName || p.phyFullNameCC,
            phyPrimaryCodeType: p.phyPrimaryCodeType ?? null
          }));
          this.filteredPhysicians = this.physicians;
          this.loading = false;
        },
        error: (err) => {
          if (err.status !== 0) {
            this.error = 'Failed to load physicians.';
            console.error('Error loading physicians:', err);
          }
          this.loading = false;
        }
      });
  }

  onSearchChange(): void {
    if (!this.searchText.trim()) {
      this.filteredPhysicians = this.physicians;
      return;
    }

    const searchLower = this.searchText.toLowerCase();
    this.filteredPhysicians = this.physicians.filter(p =>
      (p.phyName?.toLowerCase().includes(searchLower) ?? false) ||
      (p.phyPrimaryCodeType?.toLowerCase().includes(searchLower) ?? false)
    );
  }

  onAddNew(): void {
    this.isNew = true;
    this.selectedPhysician = null;
    this.formData = {
      phyID: 0,
      phyName: null,
      phyPrimaryCodeType: null,
      phyType: 'Person',
      phyLastName: null,
      phyFirstName: null,
      phyMiddleName: null,
      phyAddress1: null,
      phyAddress2: null,
      phyCity: null,
      phyState: null,
      phyZip: null,
      phyTelephone: null,
      phyFax: null,
      phyEMail: null,
      phySpecialtyCode: null,
      phyInactive: false,
      phyNPI: null,
      phyEntityType: null,
      phyPrimaryIDCode: null
    };
  }

  onSelectPhysician(physician: PhysicianListItem): void {
    this.isNew = false;
    this.loading = true;
    this.error = null;

    this.physicianApiService.getPhysicianById(physician.phyID)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.selectedPhysician = response.data;
          this.formData = { ...response.data };
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load physician details.';
          console.error('Error loading physician:', err);
          this.loading = false;
        }
      });
  }

  onSaveAndNew(): void {
    this.save(true);
  }

  onSaveAndClose(): void {
    this.save(false);
  }

  onClose(): void {
    this.selectedPhysician = null;
    this.isNew = false;
    this.formData = {
      phyID: 0,
      phyName: null,
      phyPrimaryCodeType: null,
      phyType: 'Person',
      phyLastName: null,
      phyFirstName: null,
      phyMiddleName: null,
      phyAddress1: null,
      phyAddress2: null,
      phyCity: null,
      phyState: null,
      phyZip: null,
      phyTelephone: null,
      phyFax: null,
      phyEMail: null,
      phySpecialtyCode: null,
      phyInactive: false,
      phyNPI: null,
      phyEntityType: null,
      phyPrimaryIDCode: null
    };
  }

  private save(andNew: boolean): void {
    if (!this.formData.phyName?.trim()) {
      this.error = 'Display Name is required.';
      return;
    }

    this.saving = true;
    this.error = null;

    if (this.isNew || this.formData.phyID === 0) {
      this.physicianApiService.createPhysician(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.saving = false;
            this.loadPhysicians();
            if (andNew) {
              this.onAddNew();
            } else {
              this.selectedPhysician = response.data;
              this.formData = { ...response.data };
              this.isNew = false;
            }
          },
          error: (err) => {
            this.saving = false;
            this.error = err.error?.message || 'Failed to create physician.';
            console.error('Error creating physician:', err);
          }
        });
    } else {
      if (this.formData.phyID === 0) {
        this.saving = false;
        this.error = 'Cannot update physician with ID 0. Please save as new first.';
        return;
      }

      this.physicianApiService.updatePhysician(this.formData.phyID, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.saving = false;
            this.selectedPhysician = response.data;
            this.formData = { ...response.data };
            this.loadPhysicians();
            if (andNew) {
              this.onAddNew();
            }
          },
          error: (err) => {
            this.saving = false;
            this.error = err.error?.message || 'Failed to update physician.';
            console.error('Error updating physician:', err);
          }
        });
    }
  }
}
