# BroadBill Claims Feature — Phase 6

## Routes

| URL | Component | Notes |
|-----|-----------|-------|
| `/claims/operations` | `ClaimsOperationsPageComponent` | Command center grid + KPIs |
| `/claims/{id}/workspace` | `ClaimsWorkspacePageComponent` | Operational claim workspace |
| `/claims/{id}` | Legacy `ClaimDetailsComponent` | Preserved classic editor |
| `/claims/find-claim` | Legacy list | Full AG grid |

## Workspace layout

Single-page operational shell (not tabbed):

- Header → Lifecycle → Financial summary + flow → Service lines
- Adjustments + Payments (deferred load)
- ERA / EDI → Timeline
- Workflow sidebar (contextual actions)

## Load sequence

1. **Immediate:** header, financial summary, lifecycle, timeline, ERA summary (one cached `getClaimById` via `ClaimShellCacheService`)
2. **Deferred:** service lines, adjustments, payments (`ensureFinancialPanelsLoaded()` when grids mount)

## Query layer

| Service | Role |
|---------|------|
| `ClaimWorkspaceQueryService` | Project `Claim` API → DTOs |
| `ClaimsOperationsQueryService` | Paged list + KPI metrics |
| `ClaimShellCacheService` | 30s TTL dedupe |

## DTOs

No full `Claim` entity in templates — only slice DTOs (`ClaimWorkspaceHeaderDto`, `ClaimServiceLineRowDto`, etc.).

## Status model

`utils/claim-status.util.ts` — maps status text → `ClaimStatusCategory` for badges and workflow actions.

## Next steps

- Dedicated projection APIs per slice (avoid full claim graph)
- CDK virtual scroll on operations grid
- ERA panel wired to `edi-reports` claim-level review
- Saved filter views on operations page
