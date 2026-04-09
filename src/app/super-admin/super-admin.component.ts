import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  SuperAdminService,
  SuperAdminTenant,
  SuperAdminFacility,
  SuperAdminUserRow,
  ImpersonateResponse,
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
  /** Optional: restrict new user to this facility only */
  newUserFacilityId: number | null = null;

  /** Context: aligned with toolbar + table Select */
  contextTenantId: number | null = null;
  contextFacilityId: number | null = null;

  /** True while facility list is loading after a tenant change (toolbar facility disabled). */
  facilitiesLoading = false;

  enterTenantBusy = false;

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

  get tenantOptionsForToolbar(): SuperAdminTenant[] {
    return this.tenants;
  }

  get facilityOptionsForToolbar(): SuperAdminFacility[] {
    return this.facilities;
  }

  onContextTenantIdChange(id: number | null): void {
    if (id == null) {
      this.setTenantContext(null);
      return;
    }
    const t = this.tenants.find((x) => x.tenantId === id);
    if (t) {
      this.applyTenantContext(t);
    }
  }

  onContextFacilityIdChange(id: number | null): void {
    if (id == null || id <= 0) {
      this.contextFacilityId = null;
      this.ctx.setSelectedFacilityId(null);
      return;
    }
    this.ctx.setSelectedFacilityId(id);
  }

  selectTenantRow(t: SuperAdminTenant): void {
    this.applyTenantContext(t);
  }

  private applyTenantContext(t: SuperAdminTenant): void {
    this.contextTenantId = t.tenantId;
    this.contextFacilityId = null;
    this.ctx.setSelectedTenant(t.tenantId);
    this.reloadFacilitiesAndUsers();
  }

  private setTenantContext(t: SuperAdminTenant | null): void {
    if (t == null) {
      this.contextTenantId = null;
      this.facilities = [];
      this.users = [];
      this.contextFacilityId = null;
      this.facilitiesLoading = false;
      this.ctx.setSelectedTenant(null);
      return;
    }
    this.applyTenantContext(t);
  }

  isTenantSelected(t: SuperAdminTenant): boolean {
    return this.contextTenantId === t.tenantId;
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
      this.facilitiesLoading = false;
      return;
    }
    this.errorMessage = '';
    this.facilitiesLoading = true;
    this.facilities = [];
    this.api.getFacilities(tid).subscribe({
      next: (f) => {
        this.facilities = f;
        const cur = this.ctx.getFacilityIdOptional();
        if (cur != null) {
          const still = f.find((x) => x.facilityId === cur && x.tenantId === tid);
          if (still) {
            this.contextFacilityId = cur;
          } else {
            this.contextFacilityId = null;
            this.ctx.setSelectedFacilityId(null);
          }
        } else {
          this.contextFacilityId = null;
        }
        this.facilitiesLoading = false;
      },
      error: (err) => {
        this.facilitiesLoading = false;
        this.handleErr(err);
      },
    });
    this.api.getUsers(tid).subscribe({
      next: (u) => (this.users = u),
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
        `Deactivate tenant "${t.name}" (${t.tenantKey})? Users may lose access.`
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

  enterTenantAsUser(): void {
    if (this.contextTenantId == null || this.contextTenantId <= 0) {
      this.errorMessage = 'Select a tenant before entering tenant context.';
      return;
    }
    this.errorMessage = '';
    this.enterTenantBusy = true;
    this.api
      .impersonate({
        tenantId: this.contextTenantId,
        facilityId:
          this.contextFacilityId != null && this.contextFacilityId > 0
            ? this.contextFacilityId
            : undefined,
      })
      .subscribe({
        next: (res: ImpersonateResponse) => {
          this.enterTenantBusy = false;
          this.auth.applyImpersonationSession(res);
          void this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.enterTenantBusy = false;
          this.handleErr(err);
        },
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
}
