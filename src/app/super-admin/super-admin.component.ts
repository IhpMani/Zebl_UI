import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap, map } from 'rxjs/operators';
import { SuperAdminService, TenantSummaryRow } from './super-admin.service';
import { SuperAdminContextService } from './super-admin-context.service';
import { ImpersonationContextService } from './impersonation-context.service';
import { AuthService } from '../core/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html',
  styleUrls: ['./super-admin.component.css'],
})
export class SuperAdminComponent implements OnInit, OnDestroy {
  tenantRows: TenantSummaryRow[] = [];
  loading = false;
  errorMessage = '';
  actionInProgress = false;

  showCreateModal = false;
  showEditModal = false;
  showResetPasswordModal = false;

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
    private impersonation: ImpersonationContextService,
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
    this.api.getTenants().subscribe({
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
      this.errorMessage = 'Fill in practice name, key, admin username, password, and facility name.';
      return;
    }

    this.wizardSaving = true;
    this.errorMessage = '';

    this.api.createTenant({ name, tenantKey: key }).pipe(
      switchMap((res) => {
        const tenantId = (res as { tenantId?: number })?.tenantId;
        if (typeof tenantId !== 'number' || tenantId <= 0) {
          throw new Error('Practice was created but no tenant id was returned.');
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
    const admin = this.resetRow?.primaryAdmin;
    if (!admin?.userGuid) {
      this.errorMessage = 'No primary administrator is on file for this practice.';
      return;
    }
    if (!this.resetPassword.trim()) {
      this.errorMessage = 'Enter a new password.';
      return;
    }

    this.errorMessage = '';
    this.actionInProgress = true;
    this.api.resetPrimaryAdminPassword(this.resetRow!.tenantId, this.resetPassword).subscribe({
      next: () => {
        this.actionInProgress = false;
        this.closeResetPasswordModal();
      },
      error: (err) => {
        this.actionInProgress = false;
        this.handleErr(err);
      },
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
    this.runTenantAction(() => this.api.disableTenant(row.tenantId));
  }

  enableTenant(row: TenantSummaryRow): void {
    if (!confirm(`Enable "${row.name}"? The practice shell and facilities will be restored.`)) {
      return;
    }
    this.runTenantAction(() => this.api.enableTenant(row.tenantId));
  }

  disablePrimaryAdmin(row: TenantSummaryRow): void {
    const adminName = row.primaryAdmin?.userName ?? 'the administrator';
    if (!confirm(`Disable primary administrator "${adminName}" for "${row.name}"?`)) {
      return;
    }
    this.runTenantAction(() => this.api.disablePrimaryAdmin(row.tenantId));
  }

  enablePrimaryAdmin(row: TenantSummaryRow): void {
    this.runTenantAction(() => this.api.enablePrimaryAdmin(row.tenantId));
  }

  openPractice(row: TenantSummaryRow): void {
    if (!row.isActive) {
      this.errorMessage = `Cannot open "${row.name}" — the practice is disabled. Enable it first.`;
      return;
    }
    if (row.facilityCount <= 0) {
      this.errorMessage = `Cannot open "${row.name}" — no facilities exist for this practice.`;
      return;
    }

    this.errorMessage = '';
    this.actionInProgress = true;
    this.api.impersonate({ tenantId: row.tenantId }).subscribe({
      next: (res) => {
        this.actionInProgress = false;
        const practiceName = res.tenantName?.trim() || row.name;
        this.impersonation.setPracticeName(practiceName);
        this.auth.applyImpersonationSession({
          token: res.token,
          facilityId: res.facilityId,
          tenantName: practiceName,
        });
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.actionInProgress = false;
        this.handleErr(err);
      },
    });
  }

  private runTenantAction(action: () => ReturnType<SuperAdminService['enableTenant']>): void {
    this.errorMessage = '';
    this.actionInProgress = true;
    action().subscribe({
      next: () => {
        this.actionInProgress = false;
        this.reloadTenantRows();
        if (this.editRow) {
          const updated = this.tenantRows.find((r) => r.tenantId === this.editRow?.tenantId);
          if (updated) {
            this.editRow = { ...updated };
          }
        }
      },
      error: (err) => {
        this.actionInProgress = false;
        this.handleErr(err);
      },
    });
  }

  adminUserName(row: TenantSummaryRow): string {
    return row.primaryAdmin?.userName ?? '—';
  }

  adminStatus(row: TenantSummaryRow): string {
    if (!row.primaryAdmin) {
      return 'Not assigned';
    }
    return row.primaryAdmin.isActive ? 'Active' : 'Disabled';
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'sa-status sa-status--active';
      case 'Disabled':
        return 'sa-status sa-status--disabled';
      case 'Pending':
        return 'sa-status sa-status--pending';
      default:
        return 'sa-status';
    }
  }

  adminStatusClass(row: TenantSummaryRow): string {
    if (!row.primaryAdmin) {
      return 'sa-status sa-status--pending';
    }
    return row.primaryAdmin.isActive
      ? 'sa-status sa-status--active'
      : 'sa-status sa-status--disabled';
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
