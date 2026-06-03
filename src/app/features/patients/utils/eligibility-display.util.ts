export type EligibilityDisplayKind =
  | 'Active'
  | 'Inactive'
  | 'Pending'
  | 'Rejected'
  | 'Unknown'
  | 'NeverChecked'
  | 'InProgress';

export function normalizeEligibilityDisplayStatus(status: string | null | undefined): EligibilityDisplayKind {
  const s = (status ?? '').trim();
  switch (s) {
    case 'Active':
      return 'Active';
    case 'Inactive':
      return 'Inactive';
    case 'Pending':
      return 'Pending';
    case 'Rejected':
      return 'Rejected';
    case 'InProgress':
      return 'InProgress';
    case 'NeverChecked':
      return 'NeverChecked';
    default:
      return 'Unknown';
  }
}

export function eligibilityPillClass(status: string | null | undefined): string {
  const kind = normalizeEligibilityDisplayStatus(status);
  return `pw-elig-pill pw-elig-pill--${kind.toLowerCase()}`;
}

/** Relative phrase e.g. "Verified 2 hours ago" */
export function formatEligibilityVerifiedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;

  const diffMs = Date.now() - at.getTime();
  const abs = Math.abs(diffMs);
  const future = diffMs < 0;

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  let phrase: string;
  if (abs < minute) {
    phrase = 'just now';
  } else if (abs < hour) {
    const n = Math.round(abs / minute);
    phrase = `${n} minute${n === 1 ? '' : 's'} ago`;
  } else if (abs < day) {
    const n = Math.round(abs / hour);
    phrase = `${n} hour${n === 1 ? '' : 's'} ago`;
  } else if (abs < 7 * day) {
    const n = Math.round(abs / day);
    phrase = `${n} day${n === 1 ? '' : 's'} ago`;
  } else {
    phrase = at.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (future) return `Scheduled ${phrase}`;
  return `Verified ${phrase}`;
}

/** Eligibility date for the overview KV row (optional coverage end). */
export function formatEligibilityDateLabel(
  startIso: string | null | undefined,
  endRaw: string | null | undefined
): string | null {
  if (!startIso && !endRaw) return null;

  const start = startIso ? formatSingleDate(startIso) : null;
  const end = endRaw ? formatEdiOrIsoDate(endRaw) : null;

  if (start && end) return `${start} – ${end}`;
  return start ?? end;
}

function formatSingleDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatEdiOrIsoDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(4, 6)) - 1;
    const day = Number(s.slice(6, 8));
    const d = new Date(y, m, day);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return formatSingleDate(s);
}

export function formatProviderCompact(npi: string | null | undefined, mode: string | null | undefined): string | null {
  if (!npi) return null;
  const m = mode?.trim();
  return m ? `NPI ${npi} (${m})` : `NPI ${npi}`;
}
