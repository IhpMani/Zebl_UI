# Find Add Columns — Final QA Report

**Date:** 2026-06-03  
**Scope:** Stabilization pass after runtime/discoverability fixes  
**Automated check:** `node scripts/final-qa-add-column-picker.mjs` → **PASS** (all 9 screens)

---

## Verified screens (automated + code review)

| Screen | Picker UI | Search (label/key/category) | Category sections | Dupes | Status |
|--------|-----------|------------------------------|-------------------|------:|--------|
| Find Claims | `claim-add-column-dialog` | Yes | 16 (curated order) | 0 | **Ready** |
| Find Patients | Inline overlay | Yes | 6 | 0 | **Ready** |
| Find Services | Inline overlay | Yes | 3 | 0 | **Ready** |
| Find Payments | Inline overlay | Yes | 6 | 0 | **Ready** |
| Find Disbursements | Inline overlay | Yes | 2 | 0 | **Ready** |
| Find Adjustments | Inline overlay | Yes | 4 | 0 | **Ready** |
| Find Payers | Inline overlay | Yes | 5 | 0 | **Ready** |
| Find Physicians | Inline overlay | Yes | 2 | 0 | **Ready** |
| Find Claim Notes | Inline overlay | Yes | 16 | 0 | **Ready** |

---

## Business search terms verified (simulation)

All terms below return ≥1 column in the picker model:

**Claims:** classification, claim classification, claClassification, diagnosis, edi, balance, status  

**Patients:** classification, balance, recall (Recall Date), payment, patClassification  

**Services:** balance, modifier, procedure, revenue  

**Payments:** response, disbursed, payer  

**Payers:** eligibility, submission, classification  

**Physicians:** specialty, npi, entity  

**Claim Notes:** classification, claClassification, auditID, noteText  

---

## Manual browser checklist (recommended once per release)

For each screen:

1. Open **Add Column** — dialog opens, no console errors.
2. Search by label (e.g. `classification`), raw key (`claClassification`), and category (`Financial`).
3. Confirm **no empty category headers** when search is blank.
4. Confirm **no duplicate checkbox rows** for the same key.
5. Enable **Claim Classification** (Claims) / **Patient Classification** (Patients) — column appears in grid; value loads when API provides it.
6. **Find Claims only:** toggle columns, reload page — layout persists via `claimListColumnPreferences` (v4).
7. **Claim Notes:** open picker — scroll/search remains responsive with ~234 keys (grouped sections).

---

## Stabilization changes in this pass

- Removed temporary `logListColumnPickerDebug` / `console.debug` picker logging from all components.
- Removed dev-only column count footer from Claims dialog.
- Fixed duplicate `pmtPayFID` in `payment.models.ts` (build blocker).
- QA scripts: `scripts/final-qa-add-column-picker.mjs`, `scripts/verify-find-column-picker-runtime.mjs`.

---

## localStorage / migrations

| Screen | Persistence | Notes |
|--------|---------------|--------|
| Find Claims | `claimListColumnPreferences` v4 | `migrateLegacyColumnKey` maps `patFullName` → `patFullNameCC` only; **claClassification no longer mapped to facilityName** |
| Send Claims | Separate prefs key | Same migration helper |
| Other Find screens | Session-only (visible flags in memory) | Reload resets to component defaults |

**Action for users with old prefs:** If Claim Classification still missing after upgrade, clear `claimListColumnPreferences` in browser devtools once, or re-toggle column in Add Column.

---

## Known intentional limitations

1. **Data vs picker:** Picker can show columns the list API does not populate (especially Claim Notes claim fields and many Service audit/EDI fields). Empty cells = API/DTO gap, not picker bug.
2. **Claim Notes:** Notes endpoint returns a small claim slice; most added claim columns need `additionalColumns` support on the notes API to show data.
3. **Related tables:** `available-columns` API often empty; “Add Columns from Related Tables” section usually unused.
4. **Claims checkbox state:** Dialog checked state reflects **visible** columns only (hidden base columns show unchecked until enabled).
5. **Services:** ~40 UI columns exist without matching `ServiceListItemDto` fields (documented in coverage audit).

---

## API-limited fields (high value, may show empty)

- **Claims:** Many registry fields load via `additionalColumns` when column is visible and requested.
- **Claim Notes:** Most claim columns beyond status/balances/diag 1–4.
- **Services:** Audit GUIDs, EPSDT, attach CMN, several computed TRIG fields not on list DTO.

---

## Deferred cleanup (non-blocking)

- Remove legacy `console.log` in `claim-list.component.ts` (related-column debug).
- Send Claims: align with same picker patterns if not already using `claim-add-column-dialog`.
- Optional: persist column prefs for Patients/Services (out of scope; no new architecture added).
- Regenerate `claim-list-entity-column-fields.ts` via `scripts/gen-claim-entity-columns.mjs` when base grid changes.

---

## Ship recommendation

**Approve for release** from an Add Columns discoverability standpoint, after one quick manual smoke on Find Claims (`claClassification` search + grid value) and Find Patients (`Patient Classification` search).

Regenerate QA: `node scripts/final-qa-add-column-picker.mjs`
