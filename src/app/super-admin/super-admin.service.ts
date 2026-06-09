import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface PrimaryAdminSummary {
  userGuid: string;
  userName: string;
  isActive: boolean;
}

/** Platform practice row from GET /api/super-admin/tenants */
export interface TenantSummaryRow {
  tenantId: number;
  name: string;
  tenantKey: string;
  isActive: boolean;
  status: 'Active' | 'Disabled' | 'Pending' | string;
  facilityCount: number;
  userCount: number;
  primaryAdmin: PrimaryAdminSummary | null;
}

export interface ImpersonateResponse {
  token: string;
  expiresAtUtc: string;
  isSuperAdmin: boolean;
  tenantId?: number | null;
  facilityId?: number | null;
  tenantKey?: string | null;
  tenantName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  constructor(private http: HttpClient) {}

  private superAdminBase(): string {
    const base = (environment.apiUrl || '').replace(/\/$/, '');
    return base ? `${base}/api/super-admin` : '/api/super-admin';
  }

  getTenants(): Observable<TenantSummaryRow[]> {
    const url = `${this.superAdminBase()}/tenants`;
    return this.http.get<TenantSummaryRow[] | null>(url).pipe(
      map((data) => (Array.isArray(data) ? data : []))
    );
  }

  createTenant(data: { name: string; tenantKey: string }): Observable<unknown> {
    return this.http.post(`${this.superAdminBase()}/tenants`, data);
  }

  disableTenant(tenantId: number): Observable<unknown> {
    return this.http.delete(`${this.superAdminBase()}/tenants/${tenantId}`);
  }

  enableTenant(tenantId: number): Observable<unknown> {
    return this.http.post(`${this.superAdminBase()}/tenants/${tenantId}/enable`, {});
  }

  enablePrimaryAdmin(tenantId: number): Observable<unknown> {
    return this.http.post(`${this.superAdminBase()}/tenants/${tenantId}/primary-admin/enable`, {});
  }

  disablePrimaryAdmin(tenantId: number): Observable<unknown> {
    return this.http.post(`${this.superAdminBase()}/tenants/${tenantId}/primary-admin/disable`, {});
  }

  resetPrimaryAdminPassword(tenantId: number, password: string): Observable<unknown> {
    return this.http.post(
      `${this.superAdminBase()}/tenants/${tenantId}/primary-admin/reset-password`,
      { password }
    );
  }

  createFacility(data: { tenantId: number; name: string }): Observable<unknown> {
    return this.http.post(`${this.superAdminBase()}/facilities`, data);
  }

  createUser(data: {
    userName: string;
    password: string;
    tenantId: number;
    facilityId: number;
  }): Observable<unknown> {
    return this.http.post(`${this.superAdminBase()}/users`, data);
  }

  impersonate(data: {
    tenantId: number;
    facilityId?: number | null;
  }): Observable<ImpersonateResponse> {
    return this.http.post<ImpersonateResponse>(
      `${this.superAdminBase()}/impersonate`,
      data
    );
  }

  exitImpersonation(): Observable<ImpersonateResponse> {
    return this.http.post<ImpersonateResponse>(
      `${this.superAdminBase()}/exit`,
      {}
    );
  }
}
