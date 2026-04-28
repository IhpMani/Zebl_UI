import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  SuperAdminService,
  SuperAdminTenant,
  SuperAdminFacility,
  SuperAdminUserRow,
  UserFacilityAccessRow,
} from './super-admin.service';
import { SuperAdminContextService } from './super-admin-context.service';
import { AuthService } from '../core/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html',
  styleUrls: ['./super-admin.component.css'],
})
export class SuperAdminComponent implements OnInit, OnDestroy {
  tenants: SuperAdminTenant[] = [];
  facilities: SuperAdminFacility[] = [];
  users: SuperAdminUserRow[] = [];

  errorMessage = '';

  tenantName = '';
  tenantKey = '';

  facilityName = '';

  userName = '';
  userPassword = '';
  /** Required: initial facility access for a newly created user */
  newUserFacilityId: number | null = null;
  selectedUserId: string | null = null;
  selectedUserAccess: UserFacilityAccessRow[] = [];
  selectedUserMenuOpen = false;
  newUserFacilityMenuOpen = false;

  /** Context tenant from table <strong>Select</strong> */
  contextTenantId: number | null = null;

  /** Server snapshot for facility-access checkboxes (detect unsaved toggles). */
  private facilityAccessBaseline: string | null = null;

  constructor(
    private api: SuperAdminService,
    private ctx: SuperAdminContextService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isSuperAdmin()) {
      return;
    }
    this.ctx.enterSuperAdminOperationalContext();
    this.reloadTenants(undefined);
  }

  ngOnDestroy(): void {
    this.auth.syncOperationalContextFromJwt();
  }

  selectTenantRow(t: SuperAdminTenant): void {
    this.applyTenantContext(t);
  }

  private applyTenantContext(t: SuperAdminTenant): void {
    this.contextTenantId = t.tenantId;
    this.ctx.setSelectedTenant(t.tenantId);
    this.userName = '';
    this.userPassword = '';
    this.newUserFacilityId = null;
    this.reloadFacilitiesAndUsers();
  }

  private setTenantContext(t: SuperAdminTenant | null): void {
    if (t == null) {
      this.contextTenantId = null;
      this.facilities = [];
      this.users = [];
      this.ctx.setSelectedTenant(null);
      return;
    }
    this.applyTenantContext(t);
  }

  isTenantSelected(t: SuperAdminTenant): boolean {
    return this.contextTenantId === t.tenantId;
  }

  /** Glow Create tenant when name or key has any input. */
  get tenantCreatePending(): boolean {
    return !!(this.tenantName?.trim() || this.tenantKey?.trim());
  }

  /** Glow Create facility when new name has input and a tenant is in context. */
  get facilityCreatePending(): boolean {
    return !!(
      this.contextTenantId &&
      this.contextTenantId > 0 &&
      this.facilityName?.trim()
    );
  }

  /** Glow Create user when any create-user field is set and tenant is in context. */
  get userCreatePending(): boolean {
    if (!this.contextTenantId || this.contextTenantId <= 0) {
      return false;
    }
    return !!(
      this.userName?.trim() ||
      this.userPassword?.trim() ||
      (this.newUserFacilityId != null && this.newUserFacilityId > 0)
    );
  }

  /** Glow Save facility access when checkboxes differ from last load. */
  get facilityAccessSavePending(): boolean {
    if (!this.selectedUserId || this.selectedUserAccess.length === 0) {
      return false;
    }
    if (this.facilityAccessBaseline == null) {
      return false;
    }
    return this.snapshotFacilityAccess(this.selectedUserAccess) !== this.facilityAccessBaseline;
  }

  private snapshotFacilityAccess(rows: UserFacilityAccessRow[]): string {
    return JSON.stringify(
      rows
        .map((r) => ({ i: r.facilityId, h: r.hasAccess }))
        .sort((a, b) => a.i - b.i)
    );
  }

  reloadTenants(preferredTenantId?: number): void {
    this.errorMessage = '';
    this.api.getTenants().subscribe({
      next: (rows) => {
        this.tenants = rows;
        let pick: SuperAdminTenant | null = null;
        if (preferredTenantId != null) {
          pick = rows.find((r) => r.tenantId === preferredTenantId) ?? null;
        }
        if (pick == null) {
          const stored = this.ctx.getSelectedTenantId();
          if (stored != null) {
            pick = rows.find((r) => r.tenantId === stored) ?? null;
          }
        }
        if (pick == null && rows.length > 0) {
          pick = rows[0];
        }
        if (pick) {
          this.applyTenantContext(pick);
        } else {
          this.contextTenantId = null;
          this.facilities = [];
          this.users = [];
        }
      },
      error: (err) => this.handleErr(err),
    });
  }

  reloadFacilitiesAndUsers(): void {
    const tid = this.contextTenantId;
    if (tid == null || tid <= 0) {
      this.facilities = [];
      this.users = [];
      return;
    }
    this.errorMessage = '';
    this.facilities = [];
    this.api.getFacilities(tid).subscribe({
      next: (f) => {
        this.facilities = f;
      },
      error: (err) => {
        this.handleErr(err);
      },
    });
    this.api.getUsers(tid).subscribe({
      next: (u) => {
        this.users = u;
        if (!this.selectedUserId || !u.some((x) => x.userGuid === this.selectedUserId)) {
          this.selectedUserId = null;
          this.selectedUserAccess = [];
        } else {
          this.loadSelectedUserAccess();
        }
      },
      error: (err) => this.handleErr(err),
    });
  }

  createTenant(): void {
    this.errorMessage = '';
    this.api
      .createTenant({ name: this.tenantName, tenantKey: this.tenantKey })
      .subscribe({
        next: (res) => {
          const raw = res as { tenantId?: number };
          const newId =
            typeof raw?.tenantId === 'number' ? raw.tenantId : undefined;
          this.tenantName = '';
          this.tenantKey = '';
          this.reloadTenants(newId);
        },
        error: (err) => this.handleErr(err),
      });
  }

  deleteTenant(t: SuperAdminTenant): void {
    if (
      !confirm(
        `Deactivate tenant "${t.name}" (${t.tenantKey})? Users and facilities will be disabled; data is kept.`
      )
    ) {
      return;
    }
    this.errorMessage = '';
    this.api.deleteTenant(t.tenantId).subscribe({
      next: () => this.reloadTenants(undefined),
      error: (err) => this.handleErr(err),
    });
  }

  createFacility(): void {
    if (this.contextTenantId == null || this.contextTenantId <= 0) {
      this.errorMessage = 'Select a tenant before creating a facility.';
      return;
    }
    this.errorMessage = '';
    this.api
      .createFacility({
        tenantId: this.contextTenantId,
        name: this.facilityName,
      })
      .subscribe({
        next: () => {
          this.facilityName = '';
          this.reloadFacilitiesAndUsers();
        },
        error: (err) => this.handleErr(err),
      });
  }

  createUser(): void {
    if (this.contextTenantId == null || this.contextTenantId <= 0) {
      this.errorMessage = 'Select a tenant before creating a user.';
      return;
    }
    if (this.newUserFacilityId == null || this.newUserFacilityId <= 0) {
      this.errorMessage =
        'Select a facility for this user (explicit access only).';
      return;
    }
    this.errorMessage = '';
    const payload: {
      userName: string;
      password: string;
      tenantId: number;
      facilityId: number;
    } = {
      userName: this.userName,
      password: this.userPassword,
      tenantId: this.contextTenantId,
      facilityId: this.newUserFacilityId,
    };
    this.api.createUser(payload).subscribe({
      next: () => {
        this.userName = '';
        this.userPassword = '';
        this.newUserFacilityId = null;
        this.reloadFacilitiesAndUsers();
      },
      error: (err) => this.handleErr(err),
    });
  }

  onSelectedUserChange(userId: unknown): void {
    const nextUserId =
      typeof userId === 'string' && userId.trim().length > 0 && userId !== 'null'
        ? userId
        : null;
    this.selectedUserId = nextUserId;
    this.facilityAccessBaseline = null;
    this.loadSelectedUserAccess();
  }

  toggleSelectedUserMenu(event: Event): void {
    event.stopPropagation();
    this.selectedUserMenuOpen = !this.selectedUserMenuOpen;
    if (this.selectedUserMenuOpen) {
      this.newUserFacilityMenuOpen = false;
    }
  }

  toggleNewUserFacilityMenu(event: Event): void {
    event.stopPropagation();
    this.newUserFacilityMenuOpen = !this.newUserFacilityMenuOpen;
    if (this.newUserFacilityMenuOpen) {
      this.selectedUserMenuOpen = false;
    }
  }

  pickSelectedUser(userGuid: string | null): void {
    this.selectedUserMenuOpen = false;
    this.onSelectedUserChange(userGuid);
  }

  pickNewUserFacility(facilityId: number | null): void {
    this.newUserFacilityMenuOpen = false;
    this.newUserFacilityId = facilityId;
  }

  getSelectedUserLabel(): string {
    if (!this.selectedUserId) return '— select user —';
    const u = this.users.find((x) => x.userGuid === this.selectedUserId);
    return u?.userName ?? '— select user —';
  }

  getSelectedNewUserFacilityLabel(): string {
    if (this.newUserFacilityId == null || this.newUserFacilityId <= 0) return '— select facility —';
    const f = this.facilities.find((x) => x.facilityId === this.newUserFacilityId);
    return f ? `${f.name} (${f.facilityId})` : '— select facility —';
  }

  toggleFacilityAccess(facilityId: number, checked: boolean): void {
    this.selectedUserAccess = this.selectedUserAccess.map((row) =>
      row.facilityId === facilityId ? { ...row, hasAccess: checked } : row
    );
  }

  saveSelectedUserAccess(): void {
    if (!this.contextTenantId || !this.selectedUserId) {
      this.errorMessage = 'Select tenant and user first.';
      return;
    }

    const assignedIds = this.selectedUserAccess
      .filter((x) => x.hasAccess)
      .map((x) => x.facilityId);

    this.errorMessage = '';
    this.api
      .updateUserFacilityAccess(this.contextTenantId, this.selectedUserId, assignedIds)
      .subscribe({
        next: () => {
          this.loadSelectedUserAccess();
        },
        error: (err) => this.handleErr(err),
      });
  }

  private loadSelectedUserAccess(): void {
    if (!this.contextTenantId || !this.selectedUserId) {
      this.selectedUserAccess = [];
      return;
    }

    this.api
      .getUserFacilityAccess(this.contextTenantId, this.selectedUserId)
      .subscribe({
        next: (rows) => {
          this.selectedUserAccess = rows;
          this.facilityAccessBaseline = this.snapshotFacilityAccess(rows);
        },
        error: (err) => this.handleErr(err),
      });
  }

  formatDate(v: string | null | undefined): string {
    if (v == null || v === '') return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  }

  private handleErr(err: unknown): void {
    console.error(err);
    /* status 0 = browser could not connect (ERR_CONNECTION_REFUSED, offline, CORS preflight blocked, etc.) */
    if (err instanceof HttpErrorResponse && err.status === 0) {
      this.errorMessage = `Cannot reach the API at ${environment.apiUrl}. Start the backend (Zebl.Api HTTPS profile listens on port 7183), or change environment.apiUrl if you run HTTP-only (e.g. http://localhost:5226).`;
      return;
    }
    if (err instanceof HttpErrorResponse && err.status === 403) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const e = err as {
      status?: number;
      error?: {
        message?: string;
        error?: string;
        Message?: string;
        errorCode?: string;
      };
      message?: string;
    };
    if (e?.status === 403) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const body =
      err instanceof HttpErrorResponse ? err.error : e?.error;
    const msg =
      (typeof body === 'object' && body !== null
        ? (body as { message?: string; Message?: string }).message ??
          (body as { Message?: string }).Message
        : undefined) ??
      (typeof body === 'string' ? body : undefined) ??
      e?.error?.error ??
      e?.message ??
      'Request failed';
    const code =
      typeof body === 'object' &&
      body !== null &&
      'errorCode' in body &&
      typeof (body as { errorCode?: string }).errorCode === 'string'
        ? (body as { errorCode: string }).errorCode
        : undefined;
    this.errorMessage = code ? `${code}: ${msg}` : msg;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sa-custom-select')) {
      this.selectedUserMenuOpen = false;
      this.newUserFacilityMenuOpen = false;
    }
  }
}
