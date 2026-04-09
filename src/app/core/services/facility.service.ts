import { Injectable } from '@angular/core';



const STORAGE_KEY = 'zebl.facilityId';

const TENANT_KEY_STORAGE = 'zebl.tenantKey';

/** Legacy / debug alias (kept in sync when clearing facility on tenant switch). */

const FACILITY_LEGACY_KEY = 'facility';



@Injectable({ providedIn: 'root' })

export class FacilityService {

  /** Lower-case tenant key from storage, or null if unset (do not send `X-Tenant-Key`). */

  getTenantKeyOptional(): string | null {

    try {

      const raw = localStorage.getItem(TENANT_KEY_STORAGE);

      const k = raw?.trim().toLowerCase();

      return k && k.length > 0 ? k : null;

    } catch {

      return null;

    }

  }



  clearTenantStorage(): void {

    try {

      localStorage.removeItem(TENANT_KEY_STORAGE);

      localStorage.removeItem('tenant');

    } catch {

      // ignore

    }

  }



  /** Persists tenant key for `X-Tenant-Key`. Empty / whitespace clears storage (no silent default). */

  setTenantKey(key: string): void {

    try {

      const k = key.trim().toLowerCase();

      if (k.length === 0) {

        this.clearTenantStorage();

        return;

      }

      localStorage.setItem(TENANT_KEY_STORAGE, k);

      localStorage.setItem('tenant', k);

    } catch {

      // ignore

    }

  }



  getFacilityIdOptional(): number | null {

    try {

      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw == null || raw === '') {

        return null;

      }

      const n = Number(raw);

      if (!Number.isFinite(n)) {

        return null;

      }

      const id = Math.floor(n);

      return id > 0 ? id : null;

    } catch {

      return null;

    }

  }



  /**

   * Valid facility required for HL7 and other strict operational calls.

   * @throws Error when no facility is selected

   */

  getFacilityIdStrict(): number {

    const id = this.getFacilityIdOptional();

    if (id == null || id <= 0) {

      throw new Error('Select facility');

    }

    return id;

  }



  clearFacilityStorage(): void {

    try {

      localStorage.removeItem(STORAGE_KEY);

      localStorage.removeItem(FACILITY_LEGACY_KEY);

    } catch {

      // ignore

    }

  }



  setFacilityId(id: number): void {

    const n = Number(id);

    if (!Number.isFinite(n) || Math.floor(n) <= 0) {

      this.clearFacilityStorage();

      throw new Error('Invalid facility id');

    }

    const store = Math.floor(n);

    try {

      localStorage.setItem(STORAGE_KEY, String(store));

    } catch {

      // ignore

    }

  }

}

