import { Component, OnInit } from '@angular/core';
import {
  AdminFacilityListItem,
  FacilitiesAdminApiService,
  UpsertFacilityRequest,
} from '../../core/services/facilities-admin-api.service';
import { OperationalToastService } from '../../shared/operational/services/operational-toast.service';
import { OperationalFacilitiesRefreshService } from '../../core/services/operational-facilities-refresh.service';
import { friendlyApiErrorMessage } from '../../core/utils/api-error-message.util';
import {
  facilityDisplayLabel,
  findDuplicateFacilityNameGroups,
} from '../../core/utils/facility-display.util';

@Component({
  selector: 'app-facility-management',
  templateUrl: './facility-management.component.html',
  styleUrls: ['./facility-management.component.css'],
})
export class FacilityManagementComponent implements OnInit {
  facilities: AdminFacilityListItem[] = [];
  loading = false;
  searchQuery = '';
  showInactive = true;
  showAddForm = false;
  showEditForm = false;

  selected: AdminFacilityListItem | null = null;

  form: UpsertFacilityRequest = this.emptyForm();

  constructor(
    private api: FacilitiesAdminApiService,
    private facilitiesRefresh: OperationalFacilitiesRefreshService,
    private toast: OperationalToastService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  facilityDisplayName(f: AdminFacilityListItem): string {
    return facilityDisplayLabel(f.name);
  }

  get duplicateFacilityNameWarnings(): string[] {
    return findDuplicateFacilityNameGroups(this.facilities).map(
      (group) => `"${facilityDisplayLabel(group[0].name)}" (${group.length} facilities)`
    );
  }

  get filteredFacilities(): AdminFacilityListItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.facilities.filter((f) => {
      if (!this.showInactive && !f.isActive) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        f.name.toLowerCase().includes(q) ||
        (f.facilityCode ?? '').toLowerCase().includes(q)
      );
    });
  }

  refresh(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (rows) => {
        this.facilities = Array.isArray(rows) ? rows : [];
        this.loading = false;
        this.afterLoad();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(friendlyApiErrorMessage(err, 'Could not load facilities.'));
        console.error(err);
      },
    });
  }

  private afterLoad(): void {
    if (this.facilities.length === 0) {
      this.selected = null;
      this.openAdd();
      return;
    }
    if (this.showAddForm) {
      return;
    }
    const list = this.filteredFacilities;
    if (list.length === 0) {
      this.selected = null;
      return;
    }
    if (this.selected) {
      const still = list.find((f) => f.facilityId === this.selected?.facilityId);
      if (still) {
        this.selected = still;
        return;
      }
    }
    this.select(list[0]);
  }

  select(f: AdminFacilityListItem): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.selected = f;
  }

  openAdd(): void {
    this.showAddForm = true;
    this.showEditForm = false;
    this.selected = null;
    this.form = { ...this.emptyForm(), isActive: true };
  }

  openEdit(): void {
    if (!this.selected) {
      return;
    }
    this.showAddForm = false;
    this.showEditForm = true;
    this.form = {
      name: this.selected.name,
      facilityCode: this.selected.facilityCode ?? '',
      address1: this.selected.address1 ?? '',
      address2: this.selected.address2 ?? '',
      city: this.selected.city ?? '',
      state: this.selected.state ?? '',
      zip: this.selected.zip ?? '',
      phone: this.selected.phone ?? '',
      npi: this.selected.npi ?? '',
      taxId: this.selected.taxId ?? '',
      isActive: this.selected.isActive,
    };
  }

  cancelForm(): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.afterLoad();
  }

  save(): void {
    if (!this.form.name?.trim()) {
      this.toast.warning('Facility name is required.');
      return;
    }
    const payload = this.normalizePayload(this.form);
    if (this.showAddForm) {
      this.api.create(payload).subscribe({
        next: () => {
          this.toast.success('Facility created.');
          this.facilitiesRefresh.notifyFacilitiesChanged();
          this.showAddForm = false;
          this.refresh();
        },
        error: (err) => {
          this.toast.error(friendlyApiErrorMessage(err, 'Could not create facility.'));
          console.error(err);
        },
      });
      return;
    }
    if (!this.selected) {
      return;
    }
    this.api.update(this.selected.facilityId, payload).subscribe({
      next: () => {
        this.toast.success('Facility saved.');
        this.showEditForm = false;
        this.refresh();
      },
      error: (err) => {
        this.toast.error(friendlyApiErrorMessage(err, 'Could not save facility.'));
        console.error(err);
      },
    });
  }

  toggleActive(): void {
    if (!this.selected) {
      return;
    }
    const f = this.selected;
    const action = f.isActive ? 'Deactivate' : 'Activate';
    if (!confirm(`${action} "${f.name}"?`)) {
      return;
    }
    const req = f.isActive
      ? this.api.deactivate(f.facilityId)
      : this.api.activate(f.facilityId);
    req.subscribe({
      next: () => {
        this.toast.success(f.isActive ? 'Facility deactivated.' : 'Facility activated.');
        this.refresh();
      },
      error: (err) => {
        this.toast.error(friendlyApiErrorMessage(err, 'Could not update facility status.'));
        console.error(err);
      },
    });
  }

  onShowInactiveChange(): void {
    this.afterLoad();
  }

  private normalizePayload(form: UpsertFacilityRequest): UpsertFacilityRequest {
    const trim = (v?: string | null) => (v?.trim() ? v.trim() : null);
    return {
      name: form.name.trim(),
      facilityCode: trim(form.facilityCode),
      address1: trim(form.address1),
      address2: trim(form.address2),
      city: trim(form.city),
      state: trim(form.state),
      zip: trim(form.zip),
      phone: trim(form.phone),
      npi: trim(form.npi),
      taxId: trim(form.taxId),
      isActive: form.isActive ?? true,
    };
  }

  private emptyForm(): UpsertFacilityRequest {
    return {
      name: '',
      facilityCode: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      npi: '',
      taxId: '',
      isActive: true,
    };
  }
}
