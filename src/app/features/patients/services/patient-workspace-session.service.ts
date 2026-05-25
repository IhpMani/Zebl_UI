import { Injectable } from '@angular/core';
import { PatientWorkspaceTabId } from '../models/patient-workspace-tab-id';

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
  save(patId: number, snapshot: Omit<PatientWorkspaceSessionSnapshot, 'savedAt'>): void {
    try {
      const payload: PatientWorkspaceSessionSnapshot = { ...snapshot, savedAt: Date.now() };
      localStorage.setItem(`${SESSION_PREFIX}${patId}`, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  restore(patId: number): PatientWorkspaceSessionSnapshot | null {
    try {
      const raw = localStorage.getItem(`${SESSION_PREFIX}${patId}`);
      if (!raw) return null;
      return JSON.parse(raw) as PatientWorkspaceSessionSnapshot;
    } catch {
      return null;
    }
  }

  clear(patId: number): void {
    try {
      localStorage.removeItem(`${SESSION_PREFIX}${patId}`);
    } catch {
      /* ignore */
    }
  }
}
