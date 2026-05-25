import { Injectable } from '@angular/core';
import { PatientWorkspaceTabId, isPatientWorkspaceTabId } from '../models/patient-workspace-tab-id';

const TAB_KEY = 'bb.patientWorkspace.tab';
const RECENT_KEY = 'bb.patientWorkspace.recent';
const RECENT_SEARCH_KEY = 'bb.patientWorkspace.recentSearch';
const MAX_RECENT = 12;
const MAX_RECENT_SEARCH = 8;

@Injectable({ providedIn: 'root' })
export class PatientWorkspacePersistenceService {
  getLastTab(patId: number): PatientWorkspaceTabId | null {
    try {
      const raw = localStorage.getItem(`${TAB_KEY}.${patId}`);
      return isPatientWorkspaceTabId(raw) ? raw : null;
    } catch {
      return null;
    }
  }

  saveLastTab(patId: number, tabId: PatientWorkspaceTabId): void {
    try {
      localStorage.setItem(`${TAB_KEY}.${patId}`, tabId);
    } catch {
      /* ignore quota */
    }
  }

  pushRecentPatient(patId: number, label: string): void {
    try {
      const list = this.getRecentPatients().filter((r) => r.patId !== patId);
      list.unshift({ patId, label, visitedAt: Date.now() });
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
    } catch {
      /* ignore */
    }
  }

  pushRecentSearch(term: string): void {
    const t = term.trim();
    if (t.length < 2) return;
    try {
      const list = this.getRecentSearches().filter((s) => s.toLowerCase() !== t.toLowerCase());
      list.unshift(t);
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(list.slice(0, MAX_RECENT_SEARCH)));
    } catch {
      /* ignore */
    }
  }

  getRecentSearches(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_SEARCH_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  getRecentPatients(): Array<{ patId: number; label: string; visitedAt: number }> {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<{ patId: number; label: string; visitedAt: number }>;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
