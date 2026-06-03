/**
 * Display-only formatting for Claim Details service line grid (not save payloads).
 */

/** Compact comma-separated diagnosis indexes (1–12) from stored pointer string. */
export function formatServiceLineDiagnosisPointerDisplay(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') {
    return '';
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
    return '';
  }
  indexes.sort((a, b) => a - b);
  return indexes.join(',');
}

/** True when SrvEMG indicates an emergency line (display/sort only). */
export function isServiceLineEmgActive(raw: string | null | undefined): boolean {
  const v = (raw ?? '').trim().toUpperCase();
  if (!v) return false;
  return v === 'Y' || v === 'YES' || v === '1' || v === 'TRUE';
}

/** EMG / emergency indicator for grid — Yes/No from stored SrvEMG. */
export function formatServiceLineEmgDisplay(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return 'No';
  const upper = v.toUpperCase();
  if (upper === 'Y' || upper === 'YES' || upper === '1' || upper === 'TRUE') return 'Yes';
  if (upper === 'N' || upper === 'NO' || upper === '0' || upper === 'FALSE') return 'No';
  return isServiceLineEmgActive(v) ? 'Yes' : 'No';
}

export function formatServiceLineModifierDisplay(raw: string | null | undefined): string {
  return (raw ?? '').trim();
}
