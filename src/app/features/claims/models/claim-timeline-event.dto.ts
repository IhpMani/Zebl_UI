export interface ClaimTimelineEventDto {
  id: string;
  at: string;
  label: string;
  detail: string | null;
  tone: 'info' | 'payment' | 'era' | 'edit' | 'status';
}
