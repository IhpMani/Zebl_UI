# Claim Classification (`ClaClassification`) — data flow report

## Summary

List Library entries (`Awaiting ins`, `Billers WL`, `Selfpay`, etc.) are stored on **`Claim.ClaClassification`** (varchar 30). The primary runtime bug was **not** Add Columns metadata — it was the claims list API **replacing null classification with the facility physician name**, which made the Claim Classification column look like Facility data and hid real list values.

## Data flow (verified)

| Stage | Behavior |
|-------|----------|
| List Library | `GET /api/lists/values?type=Claim Classification` → claim details dropdown (`claim-details.component.ts`) |
| Claim edit/save | Form `ClaClassification` → `PUT /api/claims/{id}` with `claClassification` → `claim.ClaClassification` truncated to 30 chars (`ClaimsController` ~2435) |
| DB | `Claim.ClaClassification` column (migration `InitialClean`) |
| List API | `ClaimListItemDto.ClaClassification` on every row; **no longer** coalesced with `facilityName` |
| `additionalColumns` | `claClassification` from entity; `facilityName` from `ClaFacilityPhyFID` physician name (separate keys) |
| Frontend normalize | `normalizeClaimListRow` passes API camelCase through |
| Grid cell | `getCellValue` → `getClaimListCellValue(claim, 'claClassification')` — root DTO preferred over `additionalColumns` |
| Prefs | `migrateLegacyColumnKey` does **not** map `claClassification` → `facilityName` |

## Root cause fixed

**Before** (`ClaimsController.cs`):

```csharp
ClaClassification = c.ClaClassification ?? facilityName,
```

When classification was unset, the API returned the **facility physician name** as `claClassification`. Users could not distinguish Facility vs Claim Classification, and filters/search on classification were misleading.

**After:**

- `ClaClassification` is only the DB value (trimmed; null if blank).
- `facilityName` remains only under `additionalColumns` / Facility column.
- `searchText` also matches `ClaClassification` (e.g. `Billers WL`).
- Column filter sends `classificationList` (comma-separated, same pattern as `statusList`).

## Frontend binding

- Column key: **`claClassification`** (not `classification`, `facilityClassification`, or `facilityName`).
- `CLAIM_API_KEY_MAP` has no alias for `claClassification`.
- `CLAIM_ROOT_SCALAR_KEYS` ensures list DTO wins over stale `additionalColumns` values.

## Manual verification (test claim)

1. Open a claim → set **Claim Classification** = `Billers WL` → Save.
2. DB: `SELECT ClaClassification FROM Claim WHERE ClaID = ?` → `Billers WL`.
3. API: `GET /api/claims?page=1&pageSize=25` → row `claClassification: "Billers WL"`.
4. Find Claims → Add/show **Claim Classification** column → cell shows `Billers WL`.
5. Column filter → select `Billers WL` → request includes `classificationList=Billers WL`.
6. Header search with `Billers` → `searchText` matches classification.

## Claim save blocked by billing provider validation

Claim `PUT` validates `ClaBillingPhyFID` with `BillingProviderOperationalRules` **after** mapping `ClaClassification` in the same request. If validation fails, the transaction rolls back — **classification is not persisted** even when the client payload is correct.

Requirements for billing provider:

| Check | Field |
|-------|--------|
| Non-Person entity | `PhyType` = `Non-Person` |
| Billing classification | `PhyPrimaryCodeType` = `BI` or blank |
| Address | `PhyAddress1`, `PhyCity`, `PhyState`, `PhyZip` |
| NPI | `PhyNPI` |
| Tax ID | `PhyPrimaryIDCode` |
| Not placeholder | `IsSystemPlaceholder` = false |

The dropdown only filters `Non-Person` + `BI`/blank — it does **not** require address/NPI/tax ID, so orgs like **IHP MI EMERGENCY MEDICINE PLLC** can appear but fail server validation (commonly missing **Tax ID** or **address**).

**UX fixes:** detailed API `Details` + server log; inline readiness panel on Claim Details; pre-save client check; link to `/physicians?phyId={id}`.

### Classification code mapping bug (fixed)

Claim save validator used **literal** `PhyPrimaryCodeType == "BI"` only. Legacy/import rows and a prior save path could store:

| Stored value | Validator before fix | After fix |
|--------------|----------------------|-----------|
| `BI` | pass | pass |
| blank + Non-Person | pass | pass |
| `Billing` (UI label) | **fail** | pass (resolved → BI) |
| `Bi` (2-char truncate of "Billing") | **fail** | pass (normalized → BI) |
| `RE` / `FA` | fail | fail |

`PhysiciansController` now uses `PhysicianTaxonomy.NormalizeStoredClassification()` instead of `NormalizeString(..., 2)` so new saves persist `BI`.

**Not a claClassification bug:** failed claim save rolls back the transaction; classification is not wiped by normalization — the PUT never commits.

### Stale ClaBillingPhyFID on save (fixed)

`buildClaimUpdatePayload` used:

```ts
claBillingPhyFID: partial.claBillingPhyFID ?? this.claim.billingPhysician?.phyID ?? 0
```

When the form control was unset (`null`/`undefined`) after a dropdown change, the payload **reverted to the stale HL7 placeholder** on `claim.billingPhysician` even if the user had picked IHP in the UI.

Also `patchClaimForm` only read `billingPhysician.phyID`, not root `claBillingPhyFID` from the API.

**Fix:** form-only physician FKs in payload; `normalizeClaimDetail` on GET; `compareWith` on selects; FK hint under billing dropdown; `console.debug` save trace.

## Save pipeline bug (fixed)

`saveAndClose()` / `save()` correctly read the form:

```ts
const claClassification = this.claimForm.get('ClaClassification')?.value ?? null;
```

But `buildClaimUpdatePayload()` **ignored** `partial.claClassification` and sent stale `this.claim.claClassification` (usually `null` until after reload). Same for `claStatus`.

**Fix:** use `partial.claStatus` and `partial.claClassification` in the returned PUT body.

## Files changed

- `Zebl.Api/Controllers/ClaimsController.cs` — DTO projection, `PopulateAdditionalColumns`, `classificationList`, `searchText`
- `src/app/claims/claim-details/claim-details.component.ts` — `buildClaimUpdatePayload` uses form values from `partial`
- `src/app/claims/shared/claim-column.utils.ts` — `CLAIM_ROOT_SCALAR_KEYS`
- `src/app/claims/claim-list/claim-list.component.ts` — `classificationList` filter
- `src/app/core/services/claim-api.service.ts` — query param
- `src/app/claims/shared/claim-column.utils.spec.ts` — binding tests
