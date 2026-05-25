export type ClaimWorkspaceSliceKey =
  | 'header'
  | 'financial'
  | 'lifecycle'
  | 'serviceLines'
  | 'adjustments'
  | 'payments'
  | 'era'
  | 'timeline';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface SliceLoadState {
  status: LoadStatus;
  error: string | null;
  loadedAt: number | null;
}

export function idleSlice(): SliceLoadState {
  return { status: 'idle', error: null, loadedAt: null };
}
