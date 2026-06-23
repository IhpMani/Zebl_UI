/** Minimal column shape used by Find * list Add Column dialogs. */
export interface ListColumnPickerColumn {
  key: string;
  label: string;
  visible?: boolean;
  category?: string;
  isRelatedColumn?: boolean;
  table?: string;
}

export interface ListColumnPickerDedupeReport {
  unique: ListColumnPickerColumn[];
  duplicateKeys: Array<{ key: string; count: number; labels: string[] }>;
}

export interface ListColumnPickerSection {
  title: string;
  columns: ListColumnPickerColumn[];
}

export interface ListColumnPickerRuntimeReport {
  screen: string;
  sourceCount: number;
  uniqueCount: number;
  searchableCount: number;
  duplicateKeyCount: number;
  missingFromSearch: string[];
  badLabelFields: Array<{ key: string; label: string; issue: string }>;
}

const CATEGORY_ORDER = [
  'Notes',
  'Identity',
  'Status',
  'Classification',
  'Financial',
  'Dates',
  'Audit',
  'Patient',
  'Clinical',
  'Diagnosis',
  'Billing',
  'EDI',
  'Provider',
  'Insurance',
  'Facility',
  'Admission',
  'Custom',
  'Other',
  'Standard'
] as const;

/** Important business keys per Find screen (discoverability checks). */
export const SCREEN_IMPORTANT_KEYS: Record<string, string[]> = {
  'Find Claims': ['claClassification', 'claStatus', 'claTotalChargeTRIG', 'claTotalBalanceCC', 'primaryPayerName'],
  'Find Patients': ['patClassification', 'patPaymentMatchingKey', 'patTotalBalanceCC'],
  'Find Services': ['srvProcedureCode', 'srvTotalInsBalanceCC', 'srvTotalPatBalanceCC', 'srvPlace'],
  'Find Payments': ['payClassification', 'patClassification', 'pmt835Ref', 'pmtRemainingCC'],
  'Find Disbursements': ['disbAmount', 'disbCode', 'disbBatchOperationReference'],
  'Find Adjustments': ['adj835Ref', 'adjGroupCode', 'adjReasonCode', 'adjRemarkCode'],
  'Find Payers': ['payClassification', 'payClaimFilingIndicator', 'payPaymentMatchingKey'],
  'Find Physicians': ['phyNPI', 'phyClassification', 'phyEntityType'],
  'Find Claim Notes': ['claClassification', 'auditID', 'activityDate', 'noteText']
};

/**
 * Match search against label, raw key, spaced camelCase key, and optional category.
 */
export function columnMatchesListPickerSearch(
  col: Pick<ListColumnPickerColumn, 'key' | 'label' | 'category'>,
  searchText: string
): boolean {
  const q = searchText.trim().toLowerCase();
  if (!q) return true;
  const label = col.label.toLowerCase();
  const key = col.key.toLowerCase();
  const category = (col.category ?? inferListColumnCategory(col.key, col.label)).toLowerCase();
  if (label.includes(q) || key.includes(q) || category.includes(q)) {
    return true;
  }
  const keySpaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return keySpaced.includes(q);
}

export function inferListColumnCategory(key: string, label: string): string {
  const k = key.toLowerCase();
  const l = label.toLowerCase();
  if (/^note|notetext|username|activitydate|auditid/.test(k) || l.includes('note ')) return 'Notes';
  if (/classification/.test(k) || /classification/.test(l)) return 'Classification';
  if (/status|locked|archived|active|inactive/.test(k)) return 'Status';
  if (/trig|balance|charge|amt|adj|applied|deposit|paid|amount|fee|disbursed|remaining/.test(k)) return 'Financial';
  if (/date|dos|time|aging/.test(k) && !/datetime|timestamp|username/.test(k)) return 'Dates';
  if (/created|modified|user|guid|computer|audit/.test(k)) return 'Audit';
  if (/^pat/.test(k)) return 'Patient';
  if (/diagnosis|diag|condition|poa|procedure|icd|reason/.test(k)) return k.includes('diagnosis') ? 'Diagnosis' : 'Clinical';
  if (/edi|export|835/.test(k) || /edi/.test(l)) return 'EDI';
  if (/phy|physician|rendering|attending|billing.*phy|referring/.test(k) || /provider/.test(l)) return 'Provider';
  if (/pay|payer|insured|insurance|filing/.test(k)) return 'Insurance';
  if (/facility/.test(k) || k === 'facilityname') return 'Facility';
  if (/bill|invoice|submission|admission|discharge|visit/.test(k)) return 'Billing';
  if (/custom/.test(k)) return 'Custom';
  if (/place/.test(k) || /place of service/.test(l)) return 'Clinical';
  if (/^srv|^adj|^pmt|^disb/.test(k) && /id$/.test(k)) return 'Identity';
  if (/^cla?id$|^pat?id$|^pay?id$|^phy?id$/.test(k)) return 'Identity';
  return 'Other';
}

export function dedupeListPickerColumns(columns: ListColumnPickerColumn[]): ListColumnPickerDedupeReport {
  const byKey = new Map<string, ListColumnPickerColumn>();
  const countByKey = new Map<string, number>();
  const labelsByKey = new Map<string, Set<string>>();
  for (const col of columns) {
    countByKey.set(col.key, (countByKey.get(col.key) ?? 0) + 1);
    labelsByKey.set(col.key, (labelsByKey.get(col.key) ?? new Set()).add(col.label));
    if (!byKey.has(col.key)) {
      byKey.set(col.key, col);
    }
  }
  const duplicateKeys = [...countByKey.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => ({
      key,
      count: countByKey.get(key)!,
      labels: [...(labelsByKey.get(key) ?? [])]
    }));

  return { unique: [...byKey.values()], duplicateKeys };
}

export function filterListPickerColumns(
  columns: ListColumnPickerColumn[],
  searchText: string,
  options?: { standardOnly?: boolean }
): ListColumnPickerColumn[] {
  let list = options?.standardOnly ? columns.filter((c) => !c.isRelatedColumn) : [...columns];
  const q = searchText.trim();
  if (q) {
    list = list.filter((c) => columnMatchesListPickerSearch(c, q));
  }
  return list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function buildFlatListPickerSections(
  columns: ListColumnPickerColumn[],
  searchText: string,
  options?: { standardOnly?: boolean }
): ListColumnPickerSection[] {
  const filtered = filterListPickerColumns(columns, searchText, options);
  const byCategory = new Map<string, ListColumnPickerColumn[]>();
  for (const col of filtered) {
    const cat = col.category ?? inferListColumnCategory(col.key, col.label);
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push({ ...col, category: cat });
  }
  const sections: ListColumnPickerSection[] = [];
  for (const title of CATEGORY_ORDER) {
    const cols = byCategory.get(title);
    if (cols?.length) {
      sections.push({ title, columns: cols });
      byCategory.delete(title);
    }
  }
  for (const [title, cols] of byCategory) {
    sections.push({ title, columns: cols });
  }
  return sections;
}

export function runListColumnPickerRuntimeCheck(
  screen: string,
  columns: ListColumnPickerColumn[],
  searchTerms: string[] = ['classification', 'claim classification', 'claClassification']
): ListColumnPickerRuntimeReport {
  const { unique, duplicateKeys } = dedupeListPickerColumns(columns);
  const important = SCREEN_IMPORTANT_KEYS[screen] ?? [];
  const missingFromSearch: string[] = [];
  const badLabelFields: Array<{ key: string; label: string; issue: string }> = [];

  for (const key of important) {
    const col = unique.find((c) => c.key === key);
    if (!col) {
      missingFromSearch.push(`${key} (not in source columns)`);
      continue;
    }
    const failedTerms = searchTerms.filter((term) => !columnMatchesListPickerSearch(col, term));
    if (failedTerms.length === searchTerms.length) {
      missingFromSearch.push(`${key} (fails all search terms)`);
    }
    if (key.includes('Classification') && !col.label.toLowerCase().includes('classification')) {
      badLabelFields.push({ key, label: col.label, issue: 'label does not mention classification' });
    }
    if (key === 'patClassification' && col.label === 'Facility') {
      badLabelFields.push({ key, label: col.label, issue: 'misleading Facility label' });
    }
  }

  return {
    screen,
    sourceCount: columns.length,
    uniqueCount: unique.length,
    searchableCount: filterListPickerColumns(unique, '').length,
    duplicateKeyCount: duplicateKeys.length,
    missingFromSearch,
    badLabelFields
  };
}
