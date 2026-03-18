import { WorkspaceTab } from '../domain/workspace-tab.model';

export interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
}

export const initialWorkspaceState: WorkspaceState = {
  tabs: [],
  activeTabId: null
};

