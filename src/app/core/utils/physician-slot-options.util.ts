import { PhysicianListItem } from '../services/physician.models';

/** Dropdown row for patient physician / facility slots. */
export interface PhysicianSlotOption {
  phyID: number;
  facilityId: number;
  phyName: string;
  phyEntityType: string | null;
  phyType: string | null;
  phyPrimaryCodeType: string | null;
  isFacility: boolean;
  isPerson: boolean;
  isSystemPlaceholder: boolean;
}

/** Map API row → immutable slot option (no invented labels). */
export function mapPhysicianApiRow(p: PhysicianListItem): PhysicianSlotOption {
  return {
    phyID: p.phyID,
    facilityId: p.facilityId,
    phyName: (p.phyFullNameCC || p.phyName || '').trim() || `Provider #${p.phyID}`,
    phyEntityType: p.phyType ?? null,
    phyType: p.phyType ?? null,
    phyPrimaryCodeType: p.phyPrimaryCodeType ?? null,
    isFacility: !!p.isFacility,
    isPerson: !!p.isPerson,
    isSystemPlaceholder: !!p.isSystemPlaceholder
  };
}

/**
 * Keep only rows for the active operational facility. When facility is unset,
 * returns an empty list so the UI never shows cross-facility providers.
 */
export function filterPhysiciansForOperationalFacility(
  rows: PhysicianSlotOption[],
  operationalFacilityId: number | null | undefined
): PhysicianSlotOption[] {
  const fid = operationalFacilityId != null ? Math.floor(Number(operationalFacilityId)) : 0;
  if (!Number.isFinite(fid) || fid <= 0) {
    return [];
  }
  return dedupePhysicianSlotOptions(
    rows.filter((p) => p.phyID > 0 && p.facilityId === fid && !p.isSystemPlaceholder)
  );
}

/** Stable dedupe by PhyID (first wins). Returns a new array. */
export function dedupePhysicianSlotOptions(rows: PhysicianSlotOption[]): PhysicianSlotOption[] {
  const seen = new Set<number>();
  const out: PhysicianSlotOption[] = [];
  for (const row of rows) {
    if (seen.has(row.phyID)) continue;
    seen.add(row.phyID);
    out.push({ ...row });
  }
  return out;
}

/** Deep-freeze slot lists for dropdown binding (prevents accidental mutation). */
export function freezePhysicianSlotOptions(rows: PhysicianSlotOption[]): readonly PhysicianSlotOption[] {
  return Object.freeze(rows.map((r) => Object.freeze({ ...r })));
}
