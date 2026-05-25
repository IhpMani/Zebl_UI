# Patient workspace — data parity checklist

Use this when validating MVP readiness. Compare **legacy** `/patients/:patId` (GetPatientById) vs **modern** `/patients/:patId/workspace/overview` (projection APIs).

## Sample patients to test

Pick at least 3: one with balance, one with multiple claims, one inactive or no payer.

## Fields to compare

| Field | Legacy source | Workspace source |
|-------|---------------|------------------|
| Patient name | Patient detail | `GET .../header` |
| Account # / MRN | Patient detail | `GET .../header` |
| Patient balance | Detail / triggers | `GET .../financial-summary` |
| Insurance balance | Detail / triggers | `GET .../financial-summary` |
| Total balance | `patTotalBalanceCC` | Header + financial |
| Primary payer | Insurance on detail | Header + `insurance-summary` |
| Open / total claims | Manual count | Header `openClaimsCount` / `totalClaimsCount` |
| Last DOS | Claims on detail | Header `lastDos` |
| Recent claims (top N) | Claims list | `claims-preview` |
| Recent payments | Payments list | `payments-preview` |

## Lookup directory

| Check | API |
|-------|-----|
| Search by name | `GET /api/patients/lookup?searchText=` |
| Search by MRN | Same |
| Status filter Active/Inactive/All | `active=true/false/omit` |
| Payer column populated | Lookup projection (not legacy list) |

## Sign-off

- [ ] Balances match within $0.01 for sample patients
- [ ] Payer name matches primary insurance
- [ ] Claim counts plausible vs legacy
- [ ] No silent empty grids on API failure (errors visible + retry)

Record tester, date, and facility ID when complete.
