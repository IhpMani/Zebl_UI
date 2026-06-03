/** Persisted column layout (localStorage only; separate keys per screen). */
export interface ClaimColumnPreferencesV2 {
  version: number;
  /** Visible column keys in display order. */
  visibleColumns: string[];
  selectedAdditional?: string[];
  /** Optional pixel widths by column key. */
  columnWidths?: Record<string, number>;
}

export const CLAIM_LIST_COLUMN_PREFS_VERSION = 4;
export const SEND_CLAIMS_COLUMN_PREFS_VERSION = 2;

export function migrateLegacyColumnKey(key: string): string {
  if (key === 'patFullName') return 'patFullNameCC';
  // claClassification and facilityName are distinct list columns — do not conflate.
  return key;
}

export function parseColumnPreferences(raw: string | null): ClaimColumnPreferencesV2 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ClaimColumnPreferencesV2;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.visibleColumns)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildColumnPreferencesPayload(
  version: number,
  visibleKeysInOrder: string[],
  selectedAdditional: Iterable<string>,
  columnWidths?: Record<string, number>
): ClaimColumnPreferencesV2 {
  const payload: ClaimColumnPreferencesV2 = {
    version,
    visibleColumns: visibleKeysInOrder,
    selectedAdditional: Array.from(selectedAdditional)
  };
  if (columnWidths && Object.keys(columnWidths).length > 0) {
    payload.columnWidths = { ...columnWidths };
  }
  return payload;
}

/**
 * Order visible columns: saved order first, then any visible keys not yet listed (stable).
 */
export function orderVisibleColumns<T extends { key: string; visible: boolean }>(
  columns: T[],
  displayOrder: string[]
): T[] {
  const visible = columns.filter((c) => c.visible);
  if (!displayOrder.length) {
    return visible;
  }
  const visibleKeys = new Set(visible.map((c) => c.key));
  const byKey = new Map(visible.map((c) => [c.key, c]));
  const ordered: T[] = [];
  for (const key of displayOrder) {
    if (visibleKeys.has(key)) {
      const col = byKey.get(key);
      if (col) ordered.push(col);
    }
  }
  for (const col of visible) {
    if (!displayOrder.includes(col.key)) {
      ordered.push(col);
    }
  }
  return ordered;
}

export function visibleKeysInDisplayOrder(
  columns: Array<{ key: string; visible: boolean }>,
  displayOrder: string[]
): string[] {
  return orderVisibleColumns(columns, displayOrder).map((c) => c.key);
}

export function reorderColumnKeys(order: string[], draggedKey: string, targetKey: string): string[] {
  if (draggedKey === targetKey) return order;
  const next = order.filter((k) => k !== draggedKey);
  const targetIndex = next.indexOf(targetKey);
  if (targetIndex < 0) {
    next.push(draggedKey);
    return next;
  }
  next.splice(targetIndex, 0, draggedKey);
  return next;
}

export function clampColumnWidth(widthPx: number, min = 72, max = 480): number {
  return Math.min(max, Math.max(min, Math.round(widthPx)));
}
