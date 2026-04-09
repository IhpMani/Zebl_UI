import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilityService } from '../core/services/facility.service';

const TENANT_ID_KEY = 'zebl.superAdminContextTenantId';

/**
 * Global super-admin context: ties UI tenant/facility selection to API headers (via FacilityService).
 */
@Injectable({ providedIn: 'root' })
export class SuperAdminContextService {
  private readonly tenantId$ = new BehaviorSubject<number | null>(this.readStoredTenantId());

  constructor(private facility: FacilityService) {}

  /**
   * Entering `/super-admin`: clear operational tenant + facility so headers are not sent on super-admin calls.
   * In-memory tenant row selection (`zebl.superAdminContextTenantId`) is kept for the UI.
   */
  enterSuperAdminOperationalContext(): void {
    this.facility.clearFacilityStorage();
    this.facility.clearTenantStorage();
    try {
      localStorage.removeItem('facility');
      localStorage.removeItem('tenant');
    } catch {
      /* ignore */
    }
  }

  readonly selectedTenantIdObservable = this.tenantId$.asObservable();

  /** Current context tenant for super-admin (persisted). */
  getSelectedTenantId(): number | null {
    return this.tenantId$.value;
  }

  setSelectedTenant(tenantId: number | null): void {
    this.facility.clearFacilityStorage();
    try {
      localStorage.removeItem('facility');
    } catch {
      /* ignore */
    }

    this.tenantId$.next(tenantId);
    if (tenantId != null) {
      try {
        localStorage.setItem(TENANT_ID_KEY, String(tenantId));
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.removeItem(TENANT_ID_KEY);
      } catch {
        /* ignore */
      }
    }

  }

  /** Persist facility for non-super-admin API calls; pass null to clear selection (no `X-Facility-Id`). */
  setSelectedFacilityId(facilityId: number | null): void {
    if (facilityId == null || facilityId <= 0) {
      this.facility.clearFacilityStorage();
      return;
    }
    this.facility.setFacilityId(facilityId);
  }

  getFacilityIdOptional(): number | null {
    return this.facility.getFacilityIdOptional();
  }

  private readStoredTenantId(): number | null {
    try {
      const raw = localStorage.getItem(TENANT_ID_KEY);
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }
}
