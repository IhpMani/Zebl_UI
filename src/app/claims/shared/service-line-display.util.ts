/**
 * Display-only formatting for Claim Details service line grid (not save payloads).
 */

/** Compact comma-separated diagnosis indexes (1–12) from stored pointer string. */
export function formatServiceLineDiagnosisPointerDisplay(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') {
    return '1';
  }
  const indexes: number[] = [];
  for (const part of String(raw).split(/[,:\s;|/]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const n = parseInt(trimmed, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 12 && !indexes.includes(n)) {
      indexes.push(n);
    }
  }
  if (indexes.length === 0) {
    return '1';
  }
  indexes.sort((a, b) => a - b);
  return indexes.join(',');
}

/** EMG / emergency indicator for grid (Y, blank, or short stored value). */
export function formatServiceLineEmgDisplay(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  const upper = v.toUpperCase();
  if (upper === 'Y' || upper === 'YES' || upper === '1' || upper === 'TRUE') return 'Y';
  if (upper === 'N' || upper === 'NO' || upper === '0' || upper === 'FALSE') return '';
  return v.length <= 3 ? v.toUpperCase() : v.slice(0, 3).toUpperCase();
}

export function formatServiceLineModifierDisplay(raw: string | null | undefined): string {
  return (raw ?? '').trim();
}
