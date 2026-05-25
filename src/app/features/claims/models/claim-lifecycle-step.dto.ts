export interface ClaimLifecycleStepDto {
  id: string;
  label: string;
  state: 'complete' | 'current' | 'pending' | 'error';
  at: string | null;
}
