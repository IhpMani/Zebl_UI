/**
 * Resolves a grid cell for Find-* list screens: checks additionalColumns first, then top-level row properties
 * (camelCase / PascalCase). Use when backend may put related fields on the row DTO or in additionalColumns.
 */
export function getListCellValue(row: unknown, key: string): unknown {
  if (row == null || typeof row !== 'object') return undefined;
  const rec = row as Record<string, unknown>;
  const add = rec['additionalColumns'] as Record<string, unknown> | undefined;
  const candidates = getCellKeyCandidates(key);
  if (add && typeof add === 'object') {
    for (const candidate of candidates) {
      const fromAdd = pickKey(add, candidate);
      if (fromAdd !== undefined && fromAdd !== null && !isBlankString(fromAdd)) return fromAdd;
    }
  }
  for (const candidate of candidates) {
    const fromRow = pickKey(rec, candidate);
    if (fromRow !== undefined) return fromRow;
  }
  return undefined;
}

function isBlankString(v: unknown): boolean {
  return typeof v === 'string' && v.trim() === '';
}

function pickKey(rec: Record<string, unknown>, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(rec, key)) return rec[key];
  const lower = key.toLowerCase();
  const found = Object.keys(rec).find(k => k.toLowerCase() === lower);
  return found ? rec[found] : undefined;
}

function getCellKeyCandidates(key: string): string[] {
  const out = new Set<string>([key]);
  const lower = key.toLowerCase();
  if (lower.endsWith('datetimecreated') || lower === 'createddate') {
    out.add('createdDate');
    out.add('CreatedDate');
    out.add('claDateTimeCreated');
    out.add('patDateTimeCreated');
    out.add('srvDateTimeCreated');
    out.add('pmtDateTimeCreated');
    out.add('adjDateTimeCreated');
    out.add('payDateTimeCreated');
  } else if (lower.endsWith('datetimemodified') || lower === 'modifieddate') {
    out.add('modifiedDate');
    out.add('ModifiedDate');
    out.add('claDateTimeModified');
    out.add('patDateTimeModified');
    out.add('srvDateTimeModified');
    out.add('pmtDateTimeModified');
    out.add('adjDateTimeModified');
    out.add('payDateTimeModified');
  }
  return Array.from(out);
}
