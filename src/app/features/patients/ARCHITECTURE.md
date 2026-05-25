# BroadBill Patients Feature — Architecture

## Folder structure

```
features/patients/
  models/              # Projection DTOs only (no EF entities in UI)
  services/
    patient-workspace-state.service.ts
    patient-shell-cache.service.ts
    patient-workspace-persistence.service.ts
    queries/           # API orchestration + DTO mapping
  workspace/
    patient-workspace-page.component.*
    components/
    tabs/              # One component per tab (lazy-loaded via routing)
  patients-feature.module.ts
  patients-feature-routing.module.ts
```

## Rules enforced

1. **Container / presentation** — Page + tabs are thin; queries live in `services/queries/`.
2. **Central state** — `PatientWorkspaceStateService` owns tab lifecycle, selection, per-slice load status.
3. **No mega DTO** — Separate DTOs per widget/tab; no `PatientWorkspaceDto` aggregate.
4. **Lazy tabs** — Claims/Payments fetch on first open; stub tabs mark loaded without API.
5. **Deep links** — `/patients/{patId}/workspace/{tab}`.
6. **Legacy preserved** — `/patients/:patId` still uses `PatientDetailsComponent`.
7. **OnPush** — Workspace tabs/header use `ChangeDetectionStrategy.OnPush` + async pipes.

## Load sequence (Phase 3)

1. **Step 1 — Header** (`getHeaderSummary`) — shell cache + open-claims count; paints first.
2. **Step 2 — Overview widgets in parallel** (independent subscriptions, partial failure safe):
   - `financial`, `claimsPreview`, `insuranceSummary`, `recentPayments`, `aging`
3. **Step 3 — Lazy tabs** — Claims (server page 50), Payments on first open.

Switching patients cancels in-flight subscriptions via `loadGeneration`.

## DTOs

| DTO | Use |
|-----|-----|
| `PatientWorkspaceHeaderDto` | Sticky header |
| `PatientBalanceSummaryDto` | Balance metrics (derived) |
| `PatientFinancialSummaryDto` | Overview financial card |
| `PatientRecentClaimDto` | Overview claims table |
| `PatientRecentPaymentDto` | Overview payments table |
| `PatientInsuranceSummaryDto` | Overview sidebar |
| `PatientAgingSummaryDto` | Aging (placeholder until API) |
| `PatientClaimRowDto` | Claims tab grid |
| `PatientPaymentRowDto` | Payments tab grid |

Workspace slices call focused backend projections (`PatientWorkspaceApiService`):
`GET /api/patients/{id}/header`, `financial-summary`, `claims-preview`, `payments-preview`, `insurance-summary`.
Legacy `GET /api/patients/{id}` is for patient-details only.

## Query services

| Service | Responsibility |
|---------|----------------|
| `PatientLookupQueryService` | Debounced search (`searchDebounced`), capped page size |
| `PatientWorkspaceQueryService` | Header, overview slices, open-claims count |
| `PatientClaimsQueryService` | Server-paged claims tab |
| `PatientPaymentsQueryService` | Payments tab + recent preview |

## Persistence

`PatientWorkspacePersistenceService` — last tab per patient + recent patient list in `localStorage`.

## Performance notes (Angular)

- No full patient graph in component state; observables + slim DTOs only.
- Skeleton widgets per slice (not blocking full-page spinner).
- Claims tab: server-side paging (50 rows); add CDK virtual scroll when dependency is added.
- Lookup: 280ms debounce + `switchMap` cancellation.

## Backend follow-up

Projection endpoints with `AsNoTracking()` + indexed filters (`PatID`, `ClaPatFID`, `PmtPatFID`, etc.) will further reduce payload size vs. current `getPatientById` shell fetch.

## Phase 5 — Design system

Canonical tokens: `Frontend/zebl-ui/src/shared/styles/broadbill-theme.css`, `_design-tokens.scss`, `BroadBillTheme.cs`.

- Four surfaces: workspace, section, overlay, sidebar
- Strict spacing scale (4/8/12/16/24/32)
- Centralized `.bb-grid`, `.bb-status-badge`, `.bb-btn`, `.bb-input`
- Navy sidebar rail + operational blue accents

## Phase 4 — Interaction & workflow UX

| Capability | Implementation |
|------------|----------------|
| Command center lookup | `PatientLookupPanelComponent` + `PatientCommandCenterService` (global overlay) |
| Keyboard shortcuts | `BroadbillKeyboardService` — Ctrl+K/P, Ctrl+1–3, Ctrl+Shift+C, Esc |
| Slide-over panels | `WorkspaceSlideoverService` — claim/payment quick review (no blocking modals) |
| Toasts | `OperationalToastService` — lightweight non-blocking notifications |
| Status badges | `OperationalStatusBadgeComponent` — claim RTS/denied/paid/etc. |
| Contextual actions | `PatientContextualActionsService` — RTS, collections, ERA, payment entry |
| Workspace memory | `PatientWorkspaceSessionService` — tab, selection, claims page, expanded row |
| Recent patients/searches | `PatientWorkspacePersistenceService` |
| Multi-patient tabs | Existing app `WorkspaceService` + route reuse strategy |
| Smart empty states | `OperationalEmptyStateComponent` on claims/payments/overview |

| Entry | Behavior |
|-------|----------|
| **Find Patients** (sidebar floating panel) | Navigate to `/patients` — full directory |
| **Patient Lookup** (topbar, Ctrl+P) | Command-center overlay only |
| `/patients/lookup` deep link | Opens overlay, redirects to home (not directory) |

## Next phases

- **Phase 5–7** — Replace stub tabs; shared FinancialGrid / ClaimGrid widgets; hover payer preview
- **Phase 8** — API projection endpoints; CDK virtualization; payer/physician metadata cache
- **Phase 9** — Full command palette (actions beyond patient search)
