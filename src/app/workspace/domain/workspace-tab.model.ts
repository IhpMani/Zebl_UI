export type TabType = 'patient' | 'claim' | 'report' | 'generic';

export interface WorkspaceTab {
  id: string;
  title: string;
  route: string;
  params?: Record<string, unknown>;
  tabType: TabType;
  isActive: boolean;
  isDirty: boolean;
  createdAt: string; // ISO string for safe persistence
}

