/** Full facility name for operational UI — never abbreviate or disambiguate duplicates. */
export function facilityDisplayLabel(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed || 'Unnamed facility';
}

export interface FacilityNameRow {
  facilityId: number;
  name: string;
}

/** Returns groups of facility ids that share the same normalized name within a tenant list. */
export function findDuplicateFacilityNameGroups<T extends FacilityNameRow>(
  rows: T[]
): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = (row.name?.trim() || '').toLowerCase();
    if (!key) {
      continue;
    }
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

export function duplicateFacilityIdSet(rows: FacilityNameRow[]): Set<number> {
  const ids = new Set<number>();
  for (const group of findDuplicateFacilityNameGroups(rows)) {
    for (const row of group) {
      ids.add(row.facilityId);
    }
  }
  return ids;
}
