export type ClaimStatusCategory =
  | 'submitted'
  | 'rts'
  | 'denied'
  | 'paid'
  | 'pending'
  | 'unknown';

export function deriveClaimStatusCategory(status: string | null | undefined): ClaimStatusCategory {
  const s = (status ?? '').toLowerCase();
  if (!s) return 'unknown';
  if (s.includes('rts') || s.includes('return to sender') || s.includes('returned')) return 'rts';
  if (s.includes('denied') || s.includes('reject')) return 'denied';
  if (s.includes('paid') || s.includes('closed')) return 'paid';
  if (s.includes('submit') || s.includes('sent')) return 'submitted';
  if (s.includes('pend') || s.includes('hold') || s.includes('open')) return 'pending';
  return 'unknown';
}

export function balanceTone(balance: number | null | undefined): 'zero' | 'overdue' | 'normal' {
  const b = Number(balance ?? 0);
  if (b === 0) return 'zero';
  if (b > 0) return 'overdue';
  return 'normal';
}
