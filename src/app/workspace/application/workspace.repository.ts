import { InjectionToken } from '@angular/core';
import { WorkspaceState } from './workspace.state';
import { WorkspaceTab } from '../domain/workspace-tab.model';

export interface WorkspaceRepository {
  saveTabs(state: { tabs: WorkspaceTab[]; activeTabId: string | null }): void;
  restoreTabs(): { tabs: WorkspaceTab[]; activeTabId: string | null } | null;
}

export const WORKSPACE_REPOSITORY = new InjectionToken<WorkspaceRepository>(
  'WORKSPACE_REPOSITORY'
);

