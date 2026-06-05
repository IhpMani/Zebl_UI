import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  UsersApiService,
  UserListItemDto,
  CreateUserRequest,
} from '../../core/services/users-api.service';
import {
  AdminFacilityListItem,
  FacilitiesAdminApiService,
  UpsertFacilityRequest,
} from '../../core/services/facilities-admin-api.service';
import { UserFacilitiesApiService } from '../../core/services/user-facilities-api.service';
import { FacilityService } from '../../core/services/facility.service';
import { OperationalFacilitiesRefreshService } from '../../core/services/operational-facilities-refresh.service';
import { OperationalToastService } from '../../shared/operational/services/operational-toast.service';
import { friendlyApiErrorMessage } from '../../core/utils/api-error-message.util';
import {
  facilityDisplayLabel,
  findDuplicateFacilityNameGroups,
} from '../../core/utils/facility-display.util';
import { environment } from 'src/environments/environment';
import {
  USER_PERMISSION_ROWS,
  permissionsForRole,
  resolvePermissionRole,
  roleDisplayLabel,
  PermissionRoleKey,
} from './user-role-permissions';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit {
  users: UserListItemDto[] = [];
  /** All tenant facilities from admin API (names for display; includes inactive). */
  facilities: AdminFacilityListItem[] = [];
  loading = false;
  facilitiesLoading = false;

  searchQuery = '';
  showInactive = false;
  showAddForm = false;
  showResetPanel = false;

  newUserName = '';
  newPassword = '';
  newEmail = '';
  /** Selected by name in dropdown (object binding avoids raw id display). */
  newFacility: AdminFacilityListItem | null = null;
  resetPasswordValue = '';

  readonly isDev = !environment.production;
  readonly permissionRows = USER_PERMISSION_ROWS;
  roleDisplayLabel = roleDisplayLabel;

  selectedUser: UserListItemDto | null = null;
  editPermissionRole: PermissionRoleKey = 'StandardUser';
  editFacilityIds: number[] = [];
  facilityAccessSaving = false;

  showAddFacilityModal = false;
  addFacilityName = '';
  addFacilitySaving = false;

  constructor(
    private usersApi: UsersApiService,
    private facilitiesAdminApi: FacilitiesAdminApiService,
    private userFacilitiesApi: UserFacilitiesApiService,
    private facility: FacilityService,
    private facilitiesRefresh: OperationalFacilitiesRefreshService,
    private toast: OperationalToastService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadFacilities();
    this.refresh();
  }

  get filteredUsers(): UserListItemDto[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.users.filter((u) => {
      if (!this.showInactive && !u.isActive) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        u.userName.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    });
  }

  get canResetPassword(): boolean {
    return (
      !!this.selectedUser &&
      !this.showAddForm &&
      !this.isSelectedPracticeAdmin &&
      !this.showResetPanel
    );
  }

  get canDeactivateSelected(): boolean {
    return !!this.selectedUser && !this.showAddForm && !this.isSelectedPracticeAdmin;
  }

  get addPermissionPreview(): Record<string, boolean> {
    return permissionsForRole('StandardUser');
  }

  get editPermissionPreview(): Record<string, boolean> {
    return permissionsForRole(this.editPermissionRole);
  }

  get isSelectedPracticeAdmin(): boolean {
    return this.selectedUser != null && this.editPermissionRole === 'TenantAdmin';
  }

  get duplicateFacilityNameWarnings(): string[] {
    return findDuplicateFacilityNameGroups(this.facilities).map(
      (group) => `"${facilityDisplayLabel(group[0].name)}" (${group.length} facilities)`
    );
  }

  /** Active facilities only — used for assign/create dropdowns and access checkboxes. */
  get assignableFacilities(): AdminFacilityListItem[] {
    return this.facilities
      .filter((f) => f.isActive)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  onShowInactiveChange(): void {
    this.ensureSelection();
  }

  loadFacilities(selectFacilityId?: number): void {
    this.facilitiesLoading = true;
    this.facilitiesAdminApi.list().subscribe({
      next: (rows) => {
        this.facilities = Array.isArray(rows) ? rows : [];
        this.facilitiesLoading = false;
        const pickId = selectFacilityId ?? this.newFacility?.facilityId;
        if (pickId != null && pickId > 0) {
          this.newFacility = this.assignableFacilities.find((f) => f.facilityId === pickId) ?? null;
          return;
        }
        if (this.newFacility == null && this.assignableFacilities.length === 1) {
          this.newFacility = this.assignableFacilities[0];
        }
      },
      error: (err) => {
        this.facilities = [];
        this.facilitiesLoading = false;
        this.toast.error(friendlyApiErrorMessage(err, 'Could not load facilities.'));
      },
    });
  }

  openAddFacilityModal(): void {
    this.addFacilityName = '';
    this.showAddFacilityModal = true;
  }

  closeAddFacilityModal(): void {
    this.showAddFacilityModal = false;
    this.addFacilityName = '';
    this.addFacilitySaving = false;
  }

  saveNewFacility(): void {
    const name = this.addFacilityName.trim();
    if (!name) {
      this.toast.warning('Enter a facility name.');
      return;
    }
    const payload: UpsertFacilityRequest = { name, isActive: true };
    this.addFacilitySaving = true;
    this.facilitiesAdminApi.create(payload).subscribe({
      next: (res) => {
        const facilityId = res?.facilityId;
        if (typeof facilityId !== 'number' || facilityId <= 0) {
          this.addFacilitySaving = false;
          this.toast.error('Facility was created but could not be selected. Refresh and try again.');
          this.loadFacilities(facilityId);
          this.closeAddFacilityModal();
          return;
        }
        const created: AdminFacilityListItem = {
          facilityId,
          name,
          isActive: true,
          usersAssigned: 0,
        };
        const exists = this.facilities.some((f) => f.facilityId === facilityId);
        if (!exists) {
          this.facilities = [...this.facilities, created];
        }
        this.newFacility = created;
        this.addFacilitySaving = false;
        this.closeAddFacilityModal();
        this.facilitiesRefresh.notifyFacilitiesChanged();
        this.toast.success(`"${name}" is ready to assign.`);
      },
      error: (err) => {
        this.addFacilitySaving = false;
        this.toast.error(friendlyApiErrorMessage(err, 'Could not add facility.'));
      },
    });
  }

  refresh(): void {
    this.loading = true;
    this.usersApi.getUsers().subscribe({
      next: (u) => {
        this.users = Array.isArray(u) ? u : [];
        this.loading = false;
        this.afterUsersLoaded();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(friendlyApiErrorMessage(err, 'Could not load users. Try again.'));
        console.error('User list load failed', err);
      },
    });
  }

  private afterUsersLoaded(): void {
    if (this.users.length === 0) {
      this.selectedUser = null;
      this.openAddUser();
      return;
    }
    if (this.showAddForm) {
      return;
    }
    this.ensureSelection();
  }

  private ensureSelection(): void {
    const list = this.filteredUsers;
    if (list.length === 0) {
      if (this.users.length > 0 && !this.showInactive) {
        this.toast.info('Turn on Inactive to view inactive users.');
      }
      this.selectedUser = null;
      return;
    }
    const current = this.selectedUser;
    if (current && list.some((x) => x.userGuid === current.userGuid)) {
      const updated = list.find((x) => x.userGuid === current.userGuid)!;
      this.selectedUser = updated;
      this.syncEditRoleFromUser(updated);
      this.loadUserFacilities(updated.userGuid);
      return;
    }
    this.selectUser(list[0]);
  }

  openAddUser(): void {
    this.showAddForm = true;
    this.showResetPanel = false;
    this.selectedUser = null;
    this.editFacilityIds = [];
    this.loadFacilities();
    if (this.newFacility == null && this.assignableFacilities.length === 1) {
      this.newFacility = this.assignableFacilities[0];
    }
  }

  /** Stable select binding by facility id; options still show names only. */
  compareFacilityOption(a: AdminFacilityListItem | null, b: AdminFacilityListItem | null): boolean {
    if (a == null && b == null) {
      return true;
    }
    if (a == null || b == null) {
      return false;
    }
    return a.facilityId === b.facilityId;
  }

  cancelAddUser(): void {
    this.showAddForm = false;
    this.newUserName = '';
    this.newPassword = '';
    this.newEmail = '';
    this.newFacility = null;
    if (this.users.length > 0) {
      this.ensureSelection();
    }
  }

  create(): void {
    if (!this.newUserName?.trim() || !this.newPassword?.trim()) {
      this.toast.warning('Username and password are required.');
      return;
    }
    const facilityId = this.newFacility?.facilityId;
    if (facilityId == null || facilityId <= 0) {
      this.toast.warning('Select a facility for this user.');
      return;
    }
    const req: CreateUserRequest = {
      userName: this.newUserName.trim(),
      password: this.newPassword,
      email: this.newEmail?.trim() || null,
      facilityId,
      role: 'StandardUser',
    };
    this.usersApi.createUser(req).subscribe({
      next: () => {
        this.toast.success('User created.');
        this.cancelAddUser();
        this.refresh();
      },
      error: (err) => {
        const msg = friendlyApiErrorMessage(err, 'Could not create user.');
        this.toast.error(msg.includes('already') ? 'That username is already used in your practice.' : msg);
        console.error('Create user failed', err);
      },
    });
  }

  selectUser(u: UserListItemDto): void {
    this.showAddForm = false;
    this.showResetPanel = false;
    this.selectedUser = u;
    this.syncEditRoleFromUser(u);
    this.loadUserFacilities(u.userGuid);
  }

  openResetPassword(): void {
    if (!this.canResetPassword) {
      return;
    }
    this.showResetPanel = true;
    this.showAddForm = false;
    this.resetPasswordValue = '';
  }

  closeResetPassword(): void {
    this.showResetPanel = false;
    this.resetPasswordValue = '';
  }

  saveResetPassword(): void {
    if (!this.selectedUser || !this.isDev) {
      this.toast.info('Password reset is not available in this environment.');
      return;
    }
    const password = this.resetPasswordValue.trim();
    if (!password) {
      this.toast.warning('Enter a new password.');
      return;
    }
    const tenantKey = this.facility.getTenantKeyOptional();
    if (!tenantKey) {
      this.toast.error('Practice context is missing. Sign out and sign in again.');
      return;
    }
    this.http
      .post(`${environment.apiUrl}/api/auth/set-password`, {
        userName: this.selectedUser.userName,
        password,
        tenantKey,
      })
      .subscribe({
        next: () => {
          this.toast.success('Password updated.');
          this.closeResetPassword();
        },
        error: (err) => {
          this.toast.error(friendlyApiErrorMessage(err, 'Could not reset password.'));
          console.error('Reset password failed', err);
        },
      });
  }

  deactivateSelected(): void {
    if (!this.selectedUser || this.isSelectedPracticeAdmin) {
      return;
    }
    const u = this.selectedUser;
    const action = u.isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action === 'deactivate' ? 'Deactivate' : 'Activate'} ${u.userName}?`)) {
      return;
    }
    this.toggleActive(u);
  }

  private syncEditRoleFromUser(u: UserListItemDto): void {
    this.editPermissionRole = resolvePermissionRole(u.role, u.isAdmin);
  }

  private loadUserFacilities(userGuid: string): void {
    this.userFacilitiesApi.getFacilityIdsForUser(userGuid).subscribe({
      next: (ids) => {
        this.editFacilityIds = Array.isArray(ids) ? [...ids] : [];
      },
      error: () => {
        this.editFacilityIds = [];
      },
    });
  }

  facilityDisplayName(f: AdminFacilityListItem): string {
    return facilityDisplayLabel(f.name);
  }

  facilityName(facilityId: number): string {
    const row = this.facilities.find((f) => f.facilityId === facilityId);
    if (!row) {
      return 'Unlisted facility';
    }
    return this.facilityDisplayName(row);
  }

  assignedFacilitySummary(): string {
    return this.editFacilityIds.map((id) => this.facilityName(id)).join(', ');
  }

  hasFacilityAccess(facilityId: number): boolean {
    return this.editFacilityIds.includes(facilityId);
  }

  toggleEditFacility(facilityId: number, checked: boolean): void {
    if (!this.selectedUser || this.isSelectedPracticeAdmin) {
      return;
    }
    this.facilityAccessSaving = true;
    const userId = this.selectedUser.userGuid;
    const req = checked
      ? this.userFacilitiesApi.addMapping(userId, facilityId)
      : this.userFacilitiesApi.removeMapping(userId, facilityId);
    req.subscribe({
      next: () => {
        if (checked) {
          this.editFacilityIds = [...this.editFacilityIds, facilityId];
        } else {
          this.editFacilityIds = this.editFacilityIds.filter((id) => id !== facilityId);
        }
        this.facilityAccessSaving = false;
        this.toast.success('Facility access updated.');
      },
      error: (err) => {
        this.facilityAccessSaving = false;
        this.toast.error(friendlyApiErrorMessage(err, 'Could not update facility access.'));
        console.error('Facility access update failed', err);
        this.loadUserFacilities(userId);
      },
    });
  }

  toggleActive(u: UserListItemDto): void {
    const req = u.isActive
      ? this.usersApi.deactivate(u.userGuid)
      : this.usersApi.activate(u.userGuid);
    req.subscribe({
      next: () => {
        this.toast.success(u.isActive ? 'User deactivated.' : 'User activated.');
        this.refresh();
      },
      error: (err) => {
        this.toast.error(friendlyApiErrorMessage(err, 'Could not update user status.'));
        console.error('Activate/deactivate failed', err);
      },
    });
  }
}
