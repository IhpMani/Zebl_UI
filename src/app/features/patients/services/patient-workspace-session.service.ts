import { Injectable } from '@angular/core';
import { PatientWorkspaceTabId } from '../models/patient-workspace-tab-id';
import { FacilityService } from '../../../core/services/facility.service';

export interface PatientWorkspaceSessionSnapshot {
  activeTabId: PatientWorkspaceTabId;
  selectedClaimId: number | null;
  selectedPaymentId: number | null;
  claimsPage: number;
  expandedClaimId: number | null;
  scrollTop: number;
  savedAt: number;
}

const SESSION_PREFIX = 'bb.patientWorkspace.session.';

@Injectable({ providedIn: 'root' })
export class PatientWorkspaceSessionService {
  constructor(private readonly facilityService: FacilityService) {}

  save(patId: number, snapshot: Omit<PatientWorkspaceSessionSnapshot, 'savedAt'>): void {
    try {
      const payload: PatientWorkspaceSessionSnapshot = { ...snapshot, savedAt: Date.now() };
      localStorage.setItem(`${this.scopePrefix()}:${SESSION_PREFIX}${patId}`, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  restore(patId: number): PatientWorkspaceSessionSnapshot | null {
    try {
      const raw = localStorage.getItem(`${SESSION_PREFIX}${patId}`);
      const scopedRaw = localStorage.getItem(`${this.scopePrefix()}:${SESSION_PREFIX}${patId}`);
      if (scopedRaw) return JSON.parse(scopedRaw) as PatientWorkspaceSessionSnapshot;
      if (!raw) return null;
      return JSON.parse(raw) as PatientWorkspaceSessionSnapshot;
    } catch {
      return null;
    }
  }

  clear(patId: number): void {
    try {
      localStorage.removeItem(`${this.scopePrefix()}:${SESSION_PREFIX}${patId}`);
    } catch {
      /* ignore */
    }
  }

  private scopePrefix(): string {
    const tenant = this.facilityService.getTenantKeyOptional() ?? 'tenant-unknown';
    const facility = this.facilityService.getFacilityIdOptional() ?? 0;
    return `${tenant}:${facility}`;
  }
}
