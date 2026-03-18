import { Injectable } from '@angular/core';
import { WorkspaceRepository } from '../application/workspace.repository';
import { WorkspaceTab } from '../domain/workspace-tab.model';

type PersistedWorkspace = {
  v: 1;
  tabs: WorkspaceTab[];
  activeTabId: string | null;
};

@Injectable()
export class LocalStorageWorkspaceRepository implements WorkspaceRepository {
  private readonly storageKey = 'workspace.tabs';

  saveTabs(state: { tabs: WorkspaceTab[]; activeTabId: string | null }): void {
    const payload: PersistedWorkspace = {
      v: 1,
      tabs: state.tabs,
      activeTabId: state.activeTabId
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage failures (quota/private mode)
    }
  }

  restoreTabs(): { tabs: WorkspaceTab[]; activeTabId: string | null } | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>;
      if (parsed.v !== 1 || !Array.isArray(parsed.tabs)) return null;

      const tabs = parsed.tabs
        .filter((t): t is WorkspaceTab => !!t && typeof (t as any).id === 'string')
        .map((t) => ({
          ...t,
          isActive: false,
          tabType:
            (t as any).tabType === 'patient' ||
            (t as any).tabType === 'claim' ||
            (t as any).tabType === 'report' ||
            (t as any).tabType === 'generic'
              ? (t as any).tabType
              : 'generic',
          isDirty: !!t.isDirty,
          createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString()
        }));

      const activeTabId =
        typeof parsed.activeTabId === 'string' ? parsed.activeTabId : null;

      return { tabs, activeTabId };
    } catch {
      return null;
    }
  }
}

