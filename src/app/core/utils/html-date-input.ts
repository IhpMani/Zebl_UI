/**
 * Values for <input type="date"> must be exactly `yyyy-MM-dd`.
 * ASP.NET Core typically serializes `DateTime?` as ISO 8601, e.g.
 * `"1957-01-23T00:00:00"` or with offset — browsers ignore invalid shapes and show blank.
 *
 * Prefer the calendar prefix when present (avoids timezone shifts from parsing midnight UTC).
 */
const YMD_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

function pad2(n: number): string {
  return `${n}`.padStart(2, '0');
}

function toYmdFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Converts API / form values to `yyyy-MM-dd` or `null` for date inputs.
 * Safe for null, empty string, invalid dates, and SQL sentinel dates.
 */
export function toHtmlDateInputValue(value: unknown): string | null {
  if (value == null) return null;
  if (value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    if (value.getFullYear() <= 1) return null;
    return toYmdFromDate(value);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.startsWith('0001-01-01')) return null;

  const prefix = raw.match(YMD_PREFIX);
  if (prefix) {
    return prefix[1]!;
  }

  const normalized = /^\d{4}-\d{2}-\d{2} \d/.test(raw)
    ? raw.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T')
    : raw;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() <= 1) return null;
  return toYmdFromDate(d);
}
