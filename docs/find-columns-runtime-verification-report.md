# Find Screens — Add Column Runtime Verification

Generated: 2026-06-03T06:14:46.605Z

## Find Claims

| Metric | Value |
|--------|------:|
| Source column rows | 226 |
| Unique keys | 226 |
| Duplicate keys | 0 |
| Searchable (no filter) | 226 |

**Important fields:** search OK (simulated).

## Find Patients

| Metric | Value |
|--------|------:|
| Source column rows | 115 |
| Unique keys | 115 |
| Duplicate keys | 0 |
| Searchable (no filter) | 115 |

**Important fields:** search OK (simulated).

## Find Services

| Metric | Value |
|--------|------:|
| Source column rows | 74 |
| Unique keys | 74 |
| Duplicate keys | 0 |
| Searchable (no filter) | 74 |

**Important fields:** search OK (simulated).

## Find Payments

| Metric | Value |
|--------|------:|
| Source column rows | 30 |
| Unique keys | 30 |
| Duplicate keys | 0 |
| Searchable (no filter) | 30 |

**Important fields:** search OK (simulated).

## Find Disbursements

| Metric | Value |
|--------|------:|
| Source column rows | 16 |
| Unique keys | 16 |
| Duplicate keys | 0 |
| Searchable (no filter) | 16 |

**Important fields:** search OK (simulated).

## Find Adjustments

| Metric | Value |
|--------|------:|
| Source column rows | 25 |
| Unique keys | 25 |
| Duplicate keys | 0 |
| Searchable (no filter) | 25 |

**Important fields:** search OK (simulated).

## Find Payers

| Metric | Value |
|--------|------:|
| Source column rows | 53 |
| Unique keys | 53 |
| Duplicate keys | 0 |
| Searchable (no filter) | 53 |

**Important fields:** search OK (simulated).

## Find Physicians

| Metric | Value |
|--------|------:|
| Source column rows | 39 |
| Unique keys | 39 |
| Duplicate keys | 0 |
| Searchable (no filter) | 39 |

**Important fields:** search OK (simulated).

## Find Claim Notes

| Metric | Value |
|--------|------:|
| Source column rows | 234 |
| Unique keys | 234 |
| Duplicate keys | 0 |
| Searchable (no filter) | 234 |

**Important fields:** search OK (simulated).

---

## Runtime issues found (before this pass)

| Screen | Issue | Severity |
|--------|--------|----------|
| Find Claims | Label-only search; `claClassification` under Facility; stale merge cache; `claClassification`→`facilityName` prefs migration | High |
| Find Patients | `patClassification` labeled **Facility** (search "classification" failed) | High |
| Find Payers | `payClassification` labeled **Classification** only (ambiguous) | Medium |
| Find Claim Notes | 234 columns in one flat list (no categories); label-only search | High |
| All flat Find screens | No category grouping; key search missing spaced camelCase | Medium |

## Fixes applied (minimal architecture)

1. **`src/app/core/utils/list-column-picker.utils.ts`** — shared search, categories, dedupe, debug logs.
2. **Find Claims** — `claim-add-column-dialog` + Classification category + merge cache version + prefs fix.
3. **Other Find screens** — `columnPickerSections` grouped picker + logs on open.
4. **Labels** — Patient Classification, Payer Classification.
5. Re-run: `node scripts/verify-find-column-picker-runtime.mjs`

## Browser verification (dev)

Open Add Column on each screen; console shows `[Find *] Add Column picker` with `importantFields` and `missingFromRenderedPicker: 0` when search is empty. Search `claClassification`, `classification`, and `claim classification` on Claims/Notes.
