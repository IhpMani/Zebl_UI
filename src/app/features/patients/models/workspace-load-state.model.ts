export type WorkspaceSliceKey =
  | 'header'
  | 'financial'
  | 'claimsPreview'
  | 'insuranceSummary'
  | 'eligibilitySnapshot'
  | 'recentPayments'
  | 'aging'
  | 'overview'
  | 'claims'
  | 'payments'
  | 'insurance'
  | 'statements'
  | 'era'
  | 'documents'
  | 'notes'
  | 'tasks'
  | 'audit';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface SliceLoadState {
  status: LoadStatus;
  error: string | null;
  loadedAt: number | null;
}

export function idleSlice(): SliceLoadState {
  return { status: 'idle', error: null, loadedAt: null };
}

export function loadingSlice(): SliceLoadState {
  return { status: 'loading', error: null, loadedAt: null };
}
