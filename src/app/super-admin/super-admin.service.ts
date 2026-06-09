import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface TenantAdminRow {
  userGuid: string;
  userName: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  isPrimaryAdmin: boolean;
}

export interface TenantUserLookup {
  userGuid: string;
  userName: string;
  displayName: string;
  isActive: boolean;
  role: string;
  canPromote: boolean;
}

export interface SuperAdminFacilityRow {
  facilityId: number;
  name: string;
  tenantId: number;
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

  getTenantAdmins(tenantId: number): Observable<TenantAdminRow[]> {
    return this.http
      .get<TenantAdminRow[] | null>(`${this.superAdminBase()}/tenants/${tenantId}/admins`)
      .pipe(map((data) => (Array.isArray(data) ? data : [])));
  }

  lookupTenantUser(tenantId: number, userName: string): Observable<TenantUserLookup> {
    const params = new HttpParams().set('userName', userName.trim());
    return this.http.get<TenantUserLookup>(
      `${this.superAdminBase()}/tenants/${tenantId}/users/lookup`,
      { params }
    );
  }

  getFacilities(tenantId: number): Observable<SuperAdminFacilityRow[]> {
    return this.http
      .get<SuperAdminFacilityRow[] | null>(
        `${this.superAdminBase()}/tenants/${tenantId}/facilities`
      )
      .pipe(map((data) => (Array.isArray(data) ? data : [])));
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

  promoteTenantAdmin(tenantId: number, userGuid: string): Observable<unknown> {
    return this.http.post(
      `${this.superAdminBase()}/tenants/${tenantId}/admins/${userGuid}/promote`,
      {}
    );
  }

  demoteTenantAdmin(tenantId: number, userGuid: string): Observable<unknown> {
    return this.http.post(
      `${this.superAdminBase()}/tenants/${tenantId}/admins/${userGuid}/demote`,
      {}
    );
  }

  enableTenantAdmin(tenantId: number, userGuid: string): Observable<unknown> {
    return this.http.post(
      `${this.superAdminBase()}/tenants/${tenantId}/admins/${userGuid}/enable`,
      {}
    );
  }

  disableTenantAdmin(tenantId: number, userGuid: string): Observable<unknown> {
    return this.http.post(
      `${this.superAdminBase()}/tenants/${tenantId}/admins/${userGuid}/disable`,
      {}
    );
  }

  resetTenantAdminPassword(
    tenantId: number,
    userGuid: string,
    password: string
  ): Observable<unknown> {
    return this.http.post(
      `${this.superAdminBase()}/tenants/${tenantId}/admins/${userGuid}/reset-password`,
      { password }
    );
  }

  createFacility(data: { tenantId: number; name: string }): Observable<unknown> {
    return this.http.post(`${this.superAdminBase()}/facilities`, data);
  }

  createUser(data: {
    userName: string;
    password: string;
    email?: string | null;
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
