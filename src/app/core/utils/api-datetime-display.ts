/**
 * Format API date/time strings for list grids.
 * Handles SQL/.NET placeholders and values the Angular date pipe may not parse reliably.
 */

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value !== null && '$date' in (value as Record<string, unknown>)) {
    const inner = (value as { $date?: unknown }).$date;
    return toDate(inner);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const msJson = /^\/Date\((-?\d+)\)\/?$/.exec(raw);
  if (msJson) {
    const d = new Date(parseInt(msJson[1], 10));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // SQL Server / .NET often omit "T" between date and time; strict ES parsers reject that.
  let normalized = raw;
  if (/^\d{4}-\d{2}-\d{2} \d/.test(normalized)) {
    normalized = normalized.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T');
  }
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isApiPlaceholderDateTime(value: unknown): boolean {
  if (value == null) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  if (raw.startsWith('0001-01-01')) return true;
  const d = toDate(value);
  if (!d) return false;
  return d.getFullYear() <= 1900;
}

export function formatApiDateTimeDisplay(value: unknown): string {
  if (value == null) return '';
  const rawTrim = String(value).trim();
  if (!rawTrim) return '';
  if (rawTrim.startsWith('0001-01-01')) return '';
  const d = toDate(value);
  if (!d) return '';
  if (d.getFullYear() <= 1900) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatDateTime(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '0001-01-01T00:00:00' || raw.startsWith('0001-01-01')) return '';
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleString();
}

/** Typical DB column names for audit timestamps on list DTOs */
export function isApiDateTimeColumnKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  return key.includes('DateTime') || key === 'createdDate' || key === 'modifiedDate';
}
