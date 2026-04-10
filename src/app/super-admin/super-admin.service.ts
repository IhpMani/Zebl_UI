import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/** Matches API JSON (camelCase). */
export interface SuperAdminTenant {
  tenantId: number;
  name: string;
  tenantKey: string;
  createdDate?: string | null;
}

export interface SuperAdminFacility {
  facilityId: number;
  name: string;
  tenantId: number;
  tenantName: string;
  createdDate?: string | null;
}

export interface SuperAdminUserRow {
  userGuid: string;
  userName: string;
  tenantId: number;
  tenantName: string;
  role: string;
  createdAt?: string | null;
}

export interface UserFacilityAccessRow {
  facilityId: number;
  name: string;
  hasAccess: boolean;
}

export interface ImpersonateResponse {
  token: string;
  expiresAtUtc: string;
  isSuperAdmin: boolean;
  tenantId?: number | null;
  facilityId?: number | null;
  tenantKey?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  constructor(private http: HttpClient) {}

  private superAdminBase(): string {
    const base = (environment.apiUrl || '').replace(/\/$/, '');
    return base ? `${base}/api/super-admin` : '/api/super-admin';
  }

  getTenants(): Observable<SuperAdminTenant[]> {
    const url = `${this.superAdminBase()}/tenants`;
    return this.http.get<SuperAdminTenant[] | null>(url).pipe(
      map((data) => (Array.isArray(data) ? data : []))
    );
  }

  getFacilities(tenantId: number): Observable<SuperAdminFacility[]> {
    const url = `${this.superAdminBase()}/tenants/${tenantId}/facilities`;
    return this.http.get<SuperAdminFacility[] | null>(url).pipe(
      map((data) => (Array.isArray(data) ? data : []))
    );
  }

  getUsers(tenantId: number): Observable<SuperAdminUserRow[]> {
    const url = `${this.superAdminBase()}/users?tenantId=${tenantId}`;
    return this.http.get<SuperAdminUserRow[] | null>(url).pipe(
      map((data) => (Array.isArray(data) ? data : []))
    );
  }

  createTenant(data: { name: string; tenantKey: string }): Observable<unknown> {
    return this.http.post(`${this.superAdminBase()}/tenants`, data);
  }

  deleteTenant(tenantId: number): Observable<unknown> {
    return this.http.delete(`${this.superAdminBase()}/tenants/${tenantId}`);
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

  getUserFacilityAccess(
    tenantId: number,
    userId: string
  ): Observable<UserFacilityAccessRow[]> {
    return this.http
      .get<UserFacilityAccessRow[] | null>(
        `${this.superAdminBase()}/tenants/${tenantId}/users/${userId}/facilities`
      )
      .pipe(map((data) => (Array.isArray(data) ? data : [])));
  }

  updateUserFacilityAccess(
    tenantId: number,
    userId: string,
    facilityIds: number[]
  ): Observable<unknown> {
    return this.http.put(
      `${this.superAdminBase()}/tenants/${tenantId}/users/${userId}/facilities`,
      { facilityIds }
    );
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
