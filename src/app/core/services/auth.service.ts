import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ClaimDetailsBootstrapCacheService } from './claim-details-bootstrap-cache.service';
import { ContextResetService } from './context-reset.service';
import { FacilityService } from './facility.service';

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  userGuid: string;
  userName: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  tenantId?: number | null;
  facilityId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'zebl.jwt';

  private readonly userNameSubject = new BehaviorSubject<string | null>(this.getUserNameFromToken());
  private readonly isAdminSubject = new BehaviorSubject<boolean>(this.getIsAdminFromToken());

  userName$ = this.userNameSubject.asObservable();
  isAdmin$ = this.isAdminSubject.asObservable();

  constructor(
    private http: HttpClient,
    private facility: FacilityService,
    private readonly contextReset: ContextResetService,
    private readonly claimBootstrap: ClaimDetailsBootstrapCacheService
  ) {}

  login(userName: string, password: string, tenantKey?: string | null): Observable<LoginResponse> {
    const body: { userName: string; password: string; tenantKey?: string } = {
      userName,
      password,
    };
    const tk = tenantKey?.trim();
    if (tk) {
      body.tenantKey = tk;
    }
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, body)
      .pipe(
        tap((res) => {
          this.setToken(res.token);
          this.syncOperationalContextFromJwt();
          if (res.isSuperAdmin === true) {
            this.facility.clearFacilityStorage();
          } else if (res.facilityId != null && res.facilityId > 0) {
            this.facility.setFacilityId(res.facilityId);
          } else {
            this.facility.clearFacilityStorage();
          }
          // New session: drop reused routes, HTTP caches, tabs (previous user/facility).
          this.contextReset.clearAllClientCaches();
          if (res.isSuperAdmin !== true) {
            this.claimBootstrap.preload();
          }
        })
      );
  }

  /**
   * Sets `zebl.tenantKey` from JWT `tenantKey` claim when present (no default tenant).
   */
  syncOperationalContextFromJwt(): void {
    const p = this.getJwtPayload() as
      | { tenantKey?: string; TenantKey?: string; facilityId?: number | string | null; FacilityId?: number | string | null }
      | null;
    const tk = p?.tenantKey ?? p?.TenantKey;
    if (typeof tk === 'string' && tk.trim().length > 0) {
      this.facility.setTenantKey(tk);
    } else {
      this.facility.clearTenantStorage();
    }

    // JWT default facility only when the user has not chosen one in the top bar.
    const storedFacility = this.facility.getFacilityIdOptional();
    const rawFacility = p?.facilityId ?? p?.FacilityId;
    const parsedFacility = rawFacility == null ? NaN : Math.floor(Number(rawFacility));
    if (this.isSuperAdmin()) {
      this.facility.clearFacilityStorage();
    } else if (storedFacility != null && storedFacility > 0) {
      // Preserve top-bar selection across refresh; X-Facility-Id drives API scope.
    } else if (Number.isFinite(parsedFacility) && parsedFacility > 0) {
      this.facility.setFacilityId(parsedFacility);
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.userNameSubject.next(null);
    this.isAdminSubject.next(false);
    this.facility.clearTenantStorage();
    this.facility.clearFacilityStorage();
    this.contextReset.clearAllClientCaches();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserName(): string | null {
    return this.userNameSubject.value;
  }

  getIsAdmin(): boolean {
    return this.isAdminSubject.value;
  }

  /** JWT `role` claim (TenantAdmin, StandardUser, SuperAdmin, …). */
  getRole(): string | null {
    const payload = this.getJwtPayload() as Record<string, unknown> | null;
    if (!payload) return null;
    const keys = [
      'role',
      'Role',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
    ];
    for (const key of keys) {
      const raw = payload[key];
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw.trim();
      }
    }
    return null;
  }

  /** Practice administrator only — never platform super-admin accounts. */
  canAccessUserManagement(): boolean {
    if (!this.isLoggedIn() || this.isSuperAdmin()) {
      return false;
    }
    if (this.getIsAdmin()) {
      return true;
    }
    return this.getRole() === 'TenantAdmin';
  }

  /** Tenant-wide program settings (save at practice level). */
  canManageTenantProgramSettings(): boolean {
    return this.canAccessUserManagement();
  }

  /** From JWT claim `isSuperAdmin` (platform super-admin only). */
  isSuperAdmin(): boolean {
    const payload = this.getJwtPayload() as Record<string, unknown> | null;
    if (!payload) return false;
    const v = payload['isSuperAdmin'] ?? payload['IsSuperAdmin'];
    return v === true || v === 'true';
  }

  /** Super admin operating inside a tenant via POST /api/super-admin/impersonate. */
  isImpersonating(): boolean {
    const payload = this.getJwtPayload() as Record<string, unknown> | null;
    if (!payload) return false;
    const v = payload['impersonation'] ?? payload['Impersonation'];
    return v === true || v === 'true';
  }

  /** After impersonate API — JWT becomes operational; persist tenant/facility headers. */
  applyImpersonationSession(res: {
    token: string;
    facilityId?: number | null;
    tenantName?: string | null;
  }): void {
    this.setToken(res.token);
    this.syncOperationalContextFromJwt();
    if (res.facilityId != null && res.facilityId > 0) {
      this.facility.setFacilityId(res.facilityId);
    } else {
      this.facility.clearFacilityStorage();
    }
    this.contextReset.clearAllClientCaches();
    this.claimBootstrap.preload();
  }

  /** After exit API — restore platform JWT and clear operational headers. */
  applySuperAdminSession(res: { token: string }): void {
    this.setToken(res.token);
    this.facility.clearTenantStorage();
    this.facility.clearFacilityStorage();
    this.contextReset.clearAllClientCaches();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.userNameSubject.next(this.getUserNameFromToken());
    this.isAdminSubject.next(this.getIsAdminFromToken());
  }

  private getUserNameFromToken(): string | null {
    const payload = this.getJwtPayload();
    return payload?.UserName ?? payload?.unique_name ?? null;
  }

  private getIsAdminFromToken(): boolean {
    const payload = this.getJwtPayload() as Record<string, unknown> | null;
    if (!payload) return false;
    for (const key of ['IsAdmin', 'isAdmin', 'isadmin']) {
      const v = payload[key];
      if (v === true || v === 'true') {
        return true;
      }
    }
    return false;
  }

  private getJwtPayload(): any | null {
    const token = this.getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const json = atob(this.base64UrlToBase64(parts[1]));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private base64UrlToBase64(input: string): string {
    return input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  }
}
