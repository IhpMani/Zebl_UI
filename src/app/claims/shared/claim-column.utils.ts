import { ClaimListItem } from '../../core/services/claim.models';
import {
  formatApiDateTimeDisplay,
  isApiDateTimeColumnKey,
  isApiPlaceholderDateTime
} from '../../core/utils/api-datetime-display';

/** Prefer top-level list DTO fields so additionalColumns cannot override audit timestamps. */
export const CLAIM_ROOT_AUDIT_KEYS = new Set(['createdDate', 'modifiedDate']);

/** Scalar list DTO fields — read from row before additionalColumns (avoids legacy coalesce in extras). */
export const CLAIM_ROOT_SCALAR_KEYS = new Set(['claClassification']);

/** Map UI / registry column keys to API request and DTO property names. */
export const CLAIM_API_KEY_MAP: Record<string, string> = {
  claFirstDOS: 'claFirstDateTRIG',
  claLastDOS: 'claLastDateTRIG',
  claTotalCharge: 'claTotalChargeTRIG',
  claTotalBalance: 'claTotalBalanceCC',
  claTotalInsBalance: 'claTotalInsBalanceTRIG',
  claTotalPatBalance: 'claTotalPatBalanceTRIG',
  claTotalInsAmtPaid: 'claTotalInsAmtPaidTRIG',
  claTotalPatAmtPaid: 'claTotalPatAmtPaidTRIG',
  claPaidDate: 'claPaidDateTRIG',
  claCreatedTimestamp: 'claDateTimeCreated',
  claModifiedTimestamp: 'claDateTimeModified',
  createdDate: 'createdDate',
  modifiedDate: 'modifiedDate',
  patID: 'claPatFID',
  claDischargeDate: 'claDischargedDate',
  claStatementFromOverride: 'claStatementCoversFromOverride',
  claStatementToOverride: 'claStatementCoversThroughOverride',
  claDischargeHour: 'claDischargedHour',
  claPatientReason1: 'claPatientReasonDiagnosis1',
  claPatientReason2: 'claPatientReasonDiagnosis2',
  claPatientReason3: 'claPatientReasonDiagnosis3',
  claLastExported: 'claLastExportedDate',
  claVisitNumber: 'claMedicalRecordNumber',
  billToDisplay: 'billToDisplay',
  primaryPayerName: 'primaryPayerName'
};

export type ClaimColumnDataTypeResolver = (columnKey: string) => string | undefined;

export function toBackendColumnKey(key: string): string {
  return CLAIM_API_KEY_MAP[key] ?? key;
}

/** Map UI column keys to unique backend keys for additionalColumns query params. */
export function mapToBackendAdditionalColumnKeys(keys: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(keys, toBackendColumnKey)));
}

function getColumnCandidates(key: string): string[] {
  const mapped = toBackendColumnKey(key);
  if (mapped === key) return [key];
  return [key, mapped];
}

function getRecordValue(record: Record<string, unknown>, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  const normalizedTarget = key.toLowerCase();
  const actualKey = Object.keys(record).find(k => k.toLowerCase() === normalizedTarget);
  return actualKey ? record[actualKey] : undefined;
}

/**
 * Resolve a claim list cell: audit fields from root DTO first, then additionalColumns, then top-level row.
 */
export function getClaimListCellValue(claim: ClaimListItem, key: string): unknown {
  const claimRecord = claim as unknown as Record<string, unknown>;
  const additionalColumns = (claim.additionalColumns ?? {}) as Record<string, unknown>;
  const canonicalKey = toBackendColumnKey(key);

  if (CLAIM_ROOT_AUDIT_KEYS.has(canonicalKey)) {
    const rootOrder =
      canonicalKey === 'createdDate'
        ? (['createdDate', 'CreatedDate', 'claDateTimeCreated', 'claCreatedTimestamp'] as const)
        : (['modifiedDate', 'ModifiedDate', 'claDateTimeModified', 'claModifiedTimestamp'] as const);
    for (const k of rootOrder) {
      const v = getRecordValue(claimRecord, k);
      if (v !== null && v !== undefined && v !== '') {
        return v;
      }
    }
    for (const k of rootOrder) {
      const v = getRecordValue(additionalColumns, k);
      if (v !== null && v !== undefined && v !== '') {
        return v;
      }
    }
  }

  if (CLAIM_ROOT_SCALAR_KEYS.has(canonicalKey)) {
    const scalarOrder = ['claClassification', 'ClaClassification'] as const;
    for (const k of scalarOrder) {
      const v = getRecordValue(claimRecord, k);
      if (v !== null && v !== undefined && v !== '') {
        return v;
      }
    }
    for (const k of scalarOrder) {
      if (getRecordValue(claimRecord, k) === '') {
        return '';
      }
    }
  }

  const candidates = getColumnCandidates(key);
  for (const candidate of candidates) {
    if (CLAIM_ROOT_AUDIT_KEYS.has(toBackendColumnKey(candidate))) {
      continue;
    }
    if (CLAIM_ROOT_SCALAR_KEYS.has(toBackendColumnKey(candidate))) {
      continue;
    }
    const additionalValue = getRecordValue(additionalColumns, candidate);
    if (additionalValue !== null && additionalValue !== undefined && additionalValue !== '') {
      return additionalValue;
    }

    const claimValue = getRecordValue(claimRecord, candidate);
    if (claimValue !== null && claimValue !== undefined && claimValue !== '') {
      return claimValue;
    }
  }

  for (const candidate of candidates) {
    if (CLAIM_ROOT_AUDIT_KEYS.has(toBackendColumnKey(candidate))) {
      continue;
    }
    if (getRecordValue(additionalColumns, candidate) === '') {
      return '';
    }
    if (getRecordValue(claimRecord, candidate) === '') {
      return '';
    }
  }

  return null;
}

export function formatClaimListDateDisplay(value: unknown): string {
  if (isApiPlaceholderDateTime(value)) return '';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value ?? '') : d.toLocaleDateString('en-US');
}

export function formatClaimListDateTimeDisplay(value: unknown): string {
  return formatApiDateTimeDisplay(value);
}

function toDatePipeValue(v: unknown): string | number | Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s.startsWith('0001-01-01')) return null;
    return s;
  }
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && '$date' in (v as Record<string, unknown>)) {
    const inner = (v as { $date?: unknown }).$date;
    if (inner instanceof Date) return inner;
    if (typeof inner === 'string') {
      const s = inner.trim();
      if (!s || s.startsWith('0001-01-01')) return null;
      return s;
    }
    if (typeof inner === 'number') return inner;
  }
  return String(v);
}

/**
 * Read created/modified audit timestamps from the list row (root + additionalColumns).
 * Values always come from the API/SQL projection — the UI does not synthesize them.
 */
export function getClaimAuditTimestamp(
  claim: ClaimListItem,
  which: 'created' | 'modified'
): string | number | Date | null {
  const row = claim as unknown as Record<string, unknown>;
  const add = (claim.additionalColumns ?? {}) as Record<string, unknown>;
  const keys =
    which === 'created'
      ? ([
          'createdDate',
          'CreatedDate',
          'claDateTimeCreated',
          'ClaDateTimeCreated',
          'claCreatedTimestamp',
          'ClaCreatedTimestamp'
        ] as const)
      : ([
          'modifiedDate',
          'ModifiedDate',
          'claDateTimeModified',
          'ClaDateTimeModified',
          'claModifiedTimestamp',
          'ClaModifiedTimestamp'
        ] as const);
  for (const k of keys) {
    const v = getRecordValue(row, k);
    if (v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === '')) {
      return toDatePipeValue(v);
    }
  }
  for (const k of keys) {
    const v = getRecordValue(add, k);
    if (v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === '')) {
      return toDatePipeValue(v);
    }
  }
  return null;
}

/** Values in the default table cell: format registry datetime columns and *DateTime* keys. */
export function formatClaimListDefaultCellValue(
  claim: ClaimListItem,
  columnKey: string,
  resolveDataType?: ClaimColumnDataTypeResolver
): string {
  const raw = getClaimListCellValue(claim, columnKey);
  const dataType = resolveDataType?.(columnKey);
  if (dataType === 'datetime') {
    return formatApiDateTimeDisplay(raw);
  }
  if (isApiDateTimeColumnKey(columnKey)) {
    return formatApiDateTimeDisplay(raw);
  }
  if (raw == null) return '';
  return String(raw);
}

export function getClaimStatusTone(status: unknown): string {
  const value = String(status ?? '').trim().toLowerCase();
  if (!value) return 'status-chip-neutral';
  if (value.includes('paid') || value.includes('closed') || value.includes('submitted')) {
    return 'status-chip-success';
  }
  if (value.includes('onhold') || value.includes('hold') || value.includes('pending') || value.includes('rts')) {
    return 'status-chip-warning';
  }
  if (value.includes('reject') || value.includes('denied') || value.includes('error') || value.includes('void')) {
    return 'status-chip-danger';
  }
  return 'status-chip-neutral';
}

export function getClaimCurrencyTone(amount: unknown): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'money-neutral';
  if (n > 0) return 'money-positive';
  if (n < 0) return 'money-negative';
  return 'money-zero';
}

export type ClaimListSortDirection = 'asc' | 'desc';

function sortableScalar(value: unknown): string | number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  const s = String(value).trim();
  if (!s) return null;
  const asNum = Number(s);
  if (!Number.isNaN(asNum) && s !== '') return asNum;
  const asDate = Date.parse(s);
  if (!Number.isNaN(asDate) && /\d{4}/.test(s)) return asDate;
  return s.toLowerCase();
}

function compareSortValues(a: unknown, b: unknown): number {
  const sa = sortableScalar(a);
  const sb = sortableScalar(b);
  if (sa == null && sb == null) return 0;
  if (sa == null) return 1;
  if (sb == null) return -1;
  if (typeof sa === 'number' && typeof sb === 'number') return sa - sb;
  return String(sa).localeCompare(String(sb), undefined, { numeric: true, sensitivity: 'base' });
}

/** Client-side sort for claim list / send-claims grids. */
export function sortClaimListItems(
  rows: ClaimListItem[],
  columnKey: string,
  direction: ClaimListSortDirection
): ClaimListItem[] {
  const sorted = [...rows].sort((left, right) => {
    const cmp = compareSortValues(
      getClaimListCellValue(left, columnKey),
      getClaimListCellValue(right, columnKey)
    );
    return direction === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

/**
 * Merge API list rows into batch stub rows by claim id; preserves batch-only additionalColumns keys.
 */
export function mergeClaimListRowsForBatch(
  stubRows: ClaimListItem[],
  apiRows: ClaimListItem[]
): ClaimListItem[] {
  const byId = new Map(apiRows.map((r) => [r.claID, r]));
  return stubRows.map((stub) => {
    const fromApi = byId.get(stub.claID);
    if (!fromApi) return stub;
    const batchExtras = { ...(stub.additionalColumns ?? {}) };
    return {
      ...fromApi,
      additionalColumns: {
        ...(fromApi.additionalColumns ?? {}),
        ...batchExtras
      }
    };
  });
}
