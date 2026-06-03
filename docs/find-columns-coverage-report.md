# Find Screens — Add Columns Coverage Report

**Date:** 2026-06-03  
**Scope:** Find Claims, Patients, Services, Payments, Disbursements, Adjustments, Payers, Physicians, Claim Notes

## Executive summary

Column coverage was incomplete because **Find Claims** (and Claim Notes) used a **curated Add Column registry** that did not include ~112 keys already present in the base grid `columns[]`. Fields such as **`claClassification`** were in the registry but mislabeled and easy to miss; many entity scalars were grid-only.

**Approach (incremental, no grid rewrite):**

1. Merge entity/base grid keys into the Claims Add Column picker via `claim-list-entity-column-fields.ts` + `mergeAllColumns()`.
2. Extend list DTOs and API projections where UI columns existed but APIs returned nothing.
3. Remove duplicate or fake UI columns; align TypeScript models with DTOs.
4. For other Find screens, extend inline `columns[]` and backend `*ListItemDto` projections.

---

## 1. Find Claims

| Layer | Notes |
|-------|--------|
| **Entity** | Full `Claim` table (~200+ scalars) |
| **List DTO** | Narrow `ClaimListItemDto` (~33 top-level fields) + `additionalColumns` via reflection when requested |
| **UI** | Base `columns[]` ~165 keys; registry ~93 curated; **merged picker ~265 keys** |

### Root cause (Add Columns gap)

`claim-add-column-dialog` calls `ClaimListAdditionalColumns.getAllColumns()`, which previously used only `AVAILABLE_COLUMNS`. Base grid keys (e.g. many EDI/audit/diag fields) were **not selectable**.

### Fixes applied

- **`claim-list-entity-column-fields.ts`**: generated/synced entity scalar keys from base grid.
- **`claim-list-additional-columns.ts`**: `mergeAllColumns()` merges curated + entity keys; **Audit** category added.
- **`claClassification`**: label corrected to **Claim Classification** (was "Facility Classification").
- **`ClaimsController.PopulateAdditionalColumns`**: explicit cases for financial/computed fields (`billToDisplay`, TRIG/CC aliases, etc.).
- **`claim-column.utils.ts`**: API key aliases for list/additional column resolution.

### Remaining architecture note

Many picker keys still rely on **`additionalColumns`** (not top-level `ClaimListItemDto`). That matches existing design; users must add the column to fetch data. Registry aliases (`claTotalCharge` → `claTotalChargeTRIG`) are mapped in `claim-column.utils.ts`.

---

## 2. Find Patients (legacy)

| Metric | Value |
|--------|------:|
| DTO fields | 117 |
| UI columns | ~114 |
| Missing (DTO not in UI) | 3 → **2 after fix** |

### Missing → fixed / intentional

| Field | Action |
|-------|--------|
| `patPaymentMatchingKey` | **Added** to Add Columns |
| `patDateTimeCreated` / `patDateTimeModified` | UI uses `createdDate` / `modifiedDate` (equivalent) |
| Duplicate `patMI` | **Removed** duplicate row |

Patient list API already returns full `PatientListItemDto`; no backend change required.

---

## 3. Find Services

| Metric | Value |
|--------|------:|
| DTO fields | 32 |
| UI columns | 74 |
| Broken UI keys | ~42 (entity fields not on list DTO) |

### Fixes applied (backend)

- `SrvTotalAdjCC`, `SrvTotalInsBalanceCC`, `SrvTotalPatBalanceCC`, `SrvTotalAmtAppliedCC`, `SrvTotalOtherAdjCC` on DTO + projections.

### Remaining

Many UI columns (audit GUIDs, EPSDT, attach CMN, etc.) are **not on `ServiceListItemDto`** — data only if `additionalColumns` / future DTO expansion. No fake columns removed in this pass (need per-field API audit).

---

## 4. Find Payments

| Metric | Value |
|--------|------:|
| DTO fields | 27 |
| UI columns | 30 |

### Fixes applied

- **Removed** fake `pmtSource` (never populated).
- **Added** `pmtDisbursedTRIG`, `pmtResponseCode`, batch/audit/reference fields to UI + DTO/repo.
- TypeScript `payment.models.ts` aligned.

### Still hidden (optional)

`pmtBFEPFID`, `pmtCreatedUserGUID`, `pmtLastUserGUID` — on DTO, not in Add Columns menu (audit; low priority).

---

## 5. Find Adjustments

| Metric | Value |
|--------|------:|
| DTO fields | 22 |
| UI columns | 19 unique |

### Fixes applied

- Backend: `AdjRemarkCode`, `AdjTrackOnly`, `AdjOtherReference1`, `AdjReasonAmount`, audit fields on DTO + all controller projections.
- Frontend: new hidden columns for business fields.
- **Removed** 4 duplicate column definitions.

---

## 6. Find Disbursements

| Metric | Value |
|--------|------:|
| DTO fields | 18 |
| UI columns | 14 → **16** (audit batch/GUIDs already in UI) |

### Fixes applied

- Backend DTO expanded (audit, batch, GUID, `disbSrvGUID`).
- Frontend `columns[]` already included audit fields.
- **`disbursement.models.ts`** aligned with DTO.

---

## 7. Find Payers

| Metric | Value |
|--------|------:|
| DTO fields | 52 → **54** |
| Broken UI keys | 2 → **0** |

### Fixes applied

- Expanded `PayerListItemDto` + `PayersController` (EDI, export flags, computed `payNameWithInactiveCC`, `payCityStateZipCC`).
- **`PayCreatedUserGUID` / `PayLastUserGUID`** added to DTO + API (fixes broken UI columns).

---

## 8. Find Physicians

| Metric | Value |
|--------|------:|
| DTO fields | 28 → **34** |
| Broken UI keys | 6 → **0** |

### Fixes applied

- DTO + list projection: `PhyAddress2`, `PhyEMail`, `PhyFax`, `PhyFirstMiddleLastNameCC`, `PhyNameWithInactiveCC`, `PhyCityStateZipCC`.
- Frontend: removed duplicate column rows.
- `physician.models.ts` updated.

---

## 9. Find Claim Notes

| Layer | Notes |
|-------|--------|
| **API** | `GET /api/claims/notes` — note fields + small claim slice + optional `additionalColumns` |
| **UI** | Note columns + claim registry |

### Fixes applied

- Add Column source switched from `AVAILABLE_COLUMNS` to **`getAllColumns()`** (merged registry — same as Find Claims).
- **Added** `auditID`, `activityDate` to note column set.
- `NOTES_API_KEY_MAP` retained for alias keys.

### Remaining

Most merged claim keys still require **notes endpoint + additionalColumns** support to show data; picker is now consistent with Find Claims.

---

## Cross-screen summary (post-fix)

| Screen | Primary gap type | Status |
|--------|------------------|--------|
| Claims | Picker ⊂ grid columns | **Fixed** (merge) |
| Patients | 1 business field, 1 dupe | **Fixed** |
| Services | DTO ⊂ entity | **Partial** (financial CC on DTO) |
| Payments | Fake column + missing DTO | **Fixed** |
| Adjustments | Dupes + DTO gaps | **Fixed** |
| Disbursements | Model mismatch | **Fixed** |
| Payers | GUID + EDI DTO | **Fixed** |
| Physicians | Broken contact/CC fields | **Fixed** |
| Claim Notes | Wrong registry + note IDs | **Fixed** |

---

## Files touched (implementation)

### Frontend (`zebl-ui`)

- `src/app/claims/claim-list/claim-list-additional-columns.ts`
- `src/app/claims/claim-list/claim-list-entity-column-fields.ts`
- `src/app/claims/claim-list/claim-list.component.ts`
- `src/app/claims/claim-list/claim-column.utils.ts`
- `src/app/claim-notes/claim-note-list/claim-note-list.component.ts`
- `src/app/patients/patient-list-legacy/patient-list-legacy.component.ts`
- `src/app/payments/payment-list/payment-list.component.ts`
- `src/app/adjustments/adjustment-list/adjustment-list.component.ts`
- `src/app/disbursements/disbursement-list/disbursement-list.component.ts`
- `src/app/payers/payer-list/payer-list.component.ts`
- `src/app/physicians/physician-list/physician-list.component.ts`
- `src/app/core/services/*.models.ts` (payment, adjustment, disbursement, payer, physician, service)

### Backend (`Backend`)

- `ClaimsController.cs` — `PopulateAdditionalColumns`
- `*ListItemDto.cs` — Payment, Adjustment, Disbursement, Payer, Physician, Service
- `*Controller.cs` / `PaymentRepository` — projections

### Maintenance script

- `scripts/gen-claim-entity-columns.mjs` — regenerate entity field picker entries from base grid

---

## Recommended follow-ups (low risk)

1. Regenerate `claim-list-entity-column-fields.ts` with fixed category rules (`claFirstDateTRIG` → Dates not Financial).
2. Services: batch-add high-value list DTO fields (audit user names) or mark UI columns as `additionalColumns`-only in docs.
3. Claim Notes: document which merged keys the notes API actually hydrates.
4. Standardize audit naming: `createdDate`/`modifiedDate` vs `*DateTimeCreated` across all Find screens.
