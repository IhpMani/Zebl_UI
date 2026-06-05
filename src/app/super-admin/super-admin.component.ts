import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  SuperAdminService,
  SuperAdminTenant,
  TenantSummaryRow,
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
  readonly isDev = !environment.production;

  tenantRows: TenantSummaryRow[] = [];
  loading = false;
  errorMessage = '';

  showCreateModal = false;
  showEditModal = false;
  showResetPasswordModal = false;

  /** Create tenant wizard */
  wizardTenantName = '';
  wizardTenantKey = '';
  wizardAdminUsername = '';
  wizardAdminPassword = '';
  wizardAdminEmail = '';
  wizardFacilityName = '';
  wizardSaving = false;

  editRow: TenantSummaryRow | null = null;
  resetRow: TenantSummaryRow | null = null;
  resetPassword = '';

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
    this.reloadTenantRows();
  }

  ngOnDestroy(): void {
    this.auth.syncOperationalContextFromJwt();
  }

  reloadTenantRows(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getTenants().pipe(
      switchMap((tenants) => {
        if (!tenants.length) {
          return of([] as TenantSummaryRow[]);
        }
        return forkJoin(
          tenants.map((t) =>
            forkJoin({
              facilities: this.api.getFacilities(t.tenantId).pipe(catchError(() => of([]))),
              users: this.api.getUsers(t.tenantId).pipe(catchError(() => of([]))),
            }).pipe(
              map(({ facilities, users }) => {
                const admin = users[0];
                return {
                  tenantId: t.tenantId,
                  name: t.name,
                  tenantKey: t.tenantKey,
                  adminUserName: admin?.userName ?? '—',
                  adminUserGuid: admin?.userGuid ?? null,
                  facilityCount: facilities.length,
                  status: 'Active',
                  createdDate: t.createdDate,
                } satisfies TenantSummaryRow;
              })
            )
          )
        );
      })
    ).subscribe({
      next: (rows) => {
        this.tenantRows = rows;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.handleErr(err);
      },
    });
  }

  openCreateModal(): void {
    this.clearWizard();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.wizardSaving = false;
  }

  private clearWizard(): void {
    this.wizardTenantName = '';
    this.wizardTenantKey = '';
    this.wizardAdminUsername = '';
    this.wizardAdminPassword = '';
    this.wizardAdminEmail = '';
    this.wizardFacilityName = '';
  }

  saveNewTenant(): void {
    const name = this.wizardTenantName.trim();
    const key = this.wizardTenantKey.trim();
    const user = this.wizardAdminUsername.trim();
    const pass = this.wizardAdminPassword;
    const facility = this.wizardFacilityName.trim();

    if (!name || !key || !user || !pass || !facility) {
      this.errorMessage = 'Fill in tenant name, key, admin username, password, and facility name.';
      return;
    }

    this.wizardSaving = true;
    this.errorMessage = '';

    this.api.createTenant({ name, tenantKey: key }).pipe(
      switchMap((res) => {
        const tenantId = (res as { tenantId?: number })?.tenantId;
        if (typeof tenantId !== 'number' || tenantId <= 0) {
          throw new Error('Tenant was created but no tenant id was returned.');
        }
        return this.api.createFacility({ tenantId, name: facility }).pipe(
          switchMap((facRes) => {
            const facilityId = (facRes as { facilityId?: number })?.facilityId;
            if (typeof facilityId !== 'number' || facilityId <= 0) {
              throw new Error('Facility was created but no facility id was returned.');
            }
            return this.api
              .createUser({
                tenantId,
                facilityId,
                userName: user,
                password: pass,
              })
              .pipe(map(() => tenantId));
          })
        );
      })
    ).subscribe({
      next: () => {
        this.wizardSaving = false;
        this.closeCreateModal();
        this.reloadTenantRows();
      },
      error: (err) => {
        this.wizardSaving = false;
        this.handleErr(err);
      },
    });
  }

  openEditModal(row: TenantSummaryRow): void {
    this.editRow = { ...row };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editRow = null;
  }

  openResetPasswordModal(row: TenantSummaryRow): void {
    this.resetRow = row;
    this.resetPassword = '';
    this.showResetPasswordModal = true;
  }

  closeResetPasswordModal(): void {
    this.showResetPasswordModal = false;
    this.resetRow = null;
    this.resetPassword = '';
  }

  saveResetPassword(): void {
    if (!this.resetRow?.adminUserName || this.resetRow.adminUserName === '—') {
      this.errorMessage = 'No admin user is on file for this tenant.';
      return;
    }
    if (!this.resetPassword.trim()) {
      this.errorMessage = 'Enter a new password.';
      return;
    }
    if (environment.production) {
      this.errorMessage =
        'Password reset from this screen is not enabled in production yet. Use your deployment process or support tools.';
      return;
    }

    this.errorMessage = '';
    this.api
      .setPasswordDev({
        userName: this.resetRow.adminUserName,
        password: this.resetPassword,
        tenantKey: this.resetRow.tenantKey,
      })
      .subscribe({
        next: () => {
          this.closeResetPasswordModal();
        },
        error: (err) => this.handleErr(err),
      });
  }

  disableTenant(row: TenantSummaryRow): void {
    if (
      !confirm(
        `Disable "${row.name}"? Users and facilities will be deactivated; data is kept.`
      )
    ) {
      return;
    }
    this.errorMessage = '';
    this.api.deleteTenant(row.tenantId).subscribe({
      next: () => this.reloadTenantRows(),
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
    if (err instanceof HttpErrorResponse && err.status === 0) {
      this.errorMessage = `Cannot reach the API at ${environment.apiUrl}. Start the backend: dotnet run --launch-profile http.`;
      return;
    }
    if (err instanceof HttpErrorResponse && err.status === 403) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const body = err instanceof HttpErrorResponse ? err.error : (err as { error?: unknown })?.error;
    const msg =
      (typeof body === 'object' && body !== null
        ? (body as { message?: string; error?: string }).message ??
          (body as { error?: string }).error
        : undefined) ??
      (typeof body === 'string' ? body : undefined) ??
      (err as Error)?.message ??
      'Request failed';
    this.errorMessage = msg;
  }
}
