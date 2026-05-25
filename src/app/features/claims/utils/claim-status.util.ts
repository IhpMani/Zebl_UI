export type ClaimStatusCategory =
  | 'draft'
  | 'submitted'
  | 'rts'
  | 'pending'
  | 'denied'
  | 'paid'
  | 'partial'
  | 'secondary'
  | 'closed'
  | 'unknown';

export function deriveClaimStatusCategory(status: string | null | undefined): ClaimStatusCategory {
  const s = (status ?? '').toLowerCase();
  if (!s) return 'unknown';
  if (s.includes('draft')) return 'draft';
  if (s.includes('rts') || s.includes('return')) return 'rts';
  if (s.includes('denied') || s.includes('reject')) return 'denied';
  if (s.includes('partial')) return 'partial';
  if (s.includes('secondary')) return 'secondary';
  if (s.includes('paid') || s.includes('closed')) return s.includes('closed') ? 'closed' : 'paid';
  if (s.includes('submit') || s.includes('sent')) return 'submitted';
  if (s.includes('pend') || s.includes('hold') || s.includes('open')) return 'pending';
  return 'unknown';
}

export function isRtsStatus(status: string | null | undefined): boolean {
  return deriveClaimStatusCategory(status) === 'rts';
}

export function deriveEdiStatus(claim: { claEDINotes?: string | null; claSubmissionMethod?: string | null }): string {
  if ((claim.claEDINotes ?? '').trim()) return 'ERA activity';
  if ((claim.claSubmissionMethod ?? '').toLowerCase().includes('edi')) return 'Submitted EDI';
  return '—';
}
