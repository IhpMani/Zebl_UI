export type TabType = 'patient' | 'claim' | 'report' | 'generic';

export interface WorkspaceTab {
  id: string;
  title: string;
  route: string;
  /** Set for `/claims/{id}` tabs so submit/actions use the visible claim, not stale ribbon context. */
  claimId?: number | null;
  params?: Record<string, unknown>;
  tabType: TabType;
  isActive: boolean;
  isDirty: boolean;
  createdAt: string; // ISO string for safe persistence
}

