import { Claim } from '../../core/services/claim.models';

/** Claim.ClaDiagnosis1 … ClaDiagnosis25 (DB source of truth). */
export const CLAIM_DIAGNOSIS_COUNT = 25;

const CMS_DIAGNOSIS_LABELS: Record<number, string> = {
  1: 'A1',
  2: 'B2',
  3: 'C3',
  4: 'D4',
  5: 'E5',
  6: 'F6',
  7: 'G7',
  8: 'H8',
  9: 'I9',
  10: 'J10',
  11: 'K11',
  12: 'L12'
};

export type ClaimDiagnosisFieldKey = `claDiagnosis${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25}`;

export function claimDiagnosisFieldKey(index: number): ClaimDiagnosisFieldKey {
  return `claDiagnosis${index}` as ClaimDiagnosisFieldKey;
}

export function claimDiagnosisFieldKeys(): ClaimDiagnosisFieldKey[] {
  return Array.from({ length: CLAIM_DIAGNOSIS_COUNT }, (_, i) => claimDiagnosisFieldKey(i + 1));
}

export function claimDiagnosisFieldLabel(index: number): string {
  const suffix = CMS_DIAGNOSIS_LABELS[index] ?? String(index);
  return `Diagnosis ${suffix}`;
}

export function buildClaimDiagnosisFormFields(): Array<{ label: string; field: keyof Claim }> {
  return claimDiagnosisFieldKeys().map((field, i) => ({
    label: claimDiagnosisFieldLabel(i + 1),
    field
  }));
}

export function readClaimDiagnosisValues(
  claim: Claim | Record<string, unknown> | null | undefined
): Record<ClaimDiagnosisFieldKey, string | null> {
  const result = {} as Record<ClaimDiagnosisFieldKey, string | null>;
  if (!claim) {
    for (const key of claimDiagnosisFieldKeys()) {
      result[key] = null;
    }
    return result;
  }
  const record = claim as Record<string, unknown>;
  for (let i = 1; i <= CLAIM_DIAGNOSIS_COUNT; i++) {
    const camel = claimDiagnosisFieldKey(i);
    const pascal = `ClaDiagnosis${i}`;
    const raw = record[camel] ?? record[pascal];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      result[camel] = trimmed || null;
    } else {
      result[camel] = raw == null ? null : String(raw);
    }
  }
  return result;
}

export function emptyClaimDiagnosisValues(): Record<ClaimDiagnosisFieldKey, null> {
  return readClaimDiagnosisValues(null) as Record<ClaimDiagnosisFieldKey, null>;
}
