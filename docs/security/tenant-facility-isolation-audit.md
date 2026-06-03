# Deep Multi-Tenant / Facility Isolation Audit - HIPAA Risk Assessment

Date: 2026-06-02  
Scope: `c:\Zebl India\Backend` + `c:\Zebl India\Frontend\zebl-ui`  
Audit Type: Architecture + code-level isolation assessment (tenant, facility, PHI containment)

## Executive Summary

The current platform is **not HIPAA-isolation-ready** for strict multi-tenant and multi-facility operation without immediate hardening. The backend has strong pieces (JWT tenant validation, many EF query filters, scoped entities), but those controls are undermined by multiple architectural bypass paths:

- unfiltered EF contexts used by background workloads,
- globally writable program settings from tenant-authenticated routes,
- legacy PHI tables without tenant/facility ownership columns,
- debug/logging paths that can expose PHI,
- and frontend persistent state keys that are not tenant/facility/user namespaced.

Bottom line: this architecture can leak data across tenants/facilities under realistic failure, regression, or abuse scenarios.

## Production Readiness Verdict

**Verdict: NOT READY for HIPAA-grade multi-tenant isolation.**

- **Critical blockers present** in data-plane isolation and configuration isolation.
- **Blast radius is platform-wide** for some worker/configuration failures.
- **Controls rely too heavily on developer discipline** instead of hard guardrails.

---

## Architecture Overview

### Backend Isolation Model (Observed)

- Tenant is resolved via JWT + request context services (`JwtValidatedTenantContext` / `HeaderCurrentContext`).
- Facility is generally supplied via `X-Facility-Id` and validated in middleware.
- EF Core global filters are configured in `ZeblDbContext`.
- Additional write-path enforcement exists for entities implementing tenant interfaces.
- Workers/hosted services process eligibility and EDI outside normal request lifecycle.

### Frontend Isolation Model (Observed)

- Browser stores active tenant/facility in localStorage.
- Interceptor sends context headers (`X-Tenant-Key`, `X-Facility-Id`) on API calls.
- Multiple feature services persist workspace/eligibility/payment state in local/session storage.
- Context reset clears many in-memory states, but persistent key coverage is incomplete.

## Isolation Model Diagram

```mermaid
flowchart TD
    U[User + JWT] --> FE[Angular Client]
    FE --> H[Headers: X-Tenant-Key / X-Facility-Id]
    H --> MW[Facility + Session Middleware]
    U --> MW
    MW --> CTX[Current Context Services]
    CTX --> EF[ZeblDbContext Query Filters]
    EF --> DB[(SQL DB)]

    subgraph Bypass Paths
      W[Hosted Workers / DbContextFactory]
      IQF[IgnoreQueryFilters]
      DBG[/api/debug endpoints]
      LG[Verbose logs / exception details]
      ST[Browser local/session storage]
    end

    W --> DB
    IQF --> DB
    DBG --> FE
    DB --> LG
    FE --> ST
```

---

## Threat Model

Assumed adversaries and failure modes:

- Malicious authenticated tenant user attempting cross-tenant/facility access.
- Curious insider abusing debug/reporting endpoints.
- Support/admin operational mistakes.
- Regressions where middleware/filter assumptions break silently.
- Background job defects causing cross-tenant processing or deletion.
- Stale browser state exposure after context switching.

Primary assets:

- Patient PHI/PII, eligibility payloads, insurance identifiers, EDI/ERA artifacts, claim/payment data, operational metadata and logs.

---

## Top 10 Catastrophic Risks

1. **Unfiltered worker contexts** (`AddDbContextFactory<ZeblDbContext>`) can execute cross-tenant operations if query predicates are missed.
2. **Tenant routes writing global ProgramSettings** can alter behavior across all tenants.
3. **Legacy PHI entities without tenant/facility columns** (`Insured`, `Patient_Insured`, `Claim_Insured`) rely on fragile join discipline.
4. **`IgnoreQueryFilters()` in critical services** creates explicit bypass primitives in HL7 and EDI paths.
5. **Debug EDI endpoint scope exemption** (`/api/debug`) can expose sensitive payloads/metadata.
6. **Exception/logging PHI leakage** via raw error messages and payload logging.
7. **Header-derived facility context reliance** creates spoofing risk if middleware coverage regresses.
8. **Frontend storage keys not namespaced by tenant/facility/user** can show stale PHI across context switches.
9. **EDI storage partitioning tenant-only (not facility)** weakens containment and forensics.
10. **Inbound integration identified by numeric header** (`X-Integration-Id`) is weak trust binding.

---

## Database Isolation - Table-by-Table Matrix

Legend:  
Enforced = hard-guarded by filters and/or write rules in normal paths.  
Risk = isolation risk if exploited or regressed.

| Entity / Area | TenantId | FacilityId | Nullable? | Enforcement | Exploit/Breach Risk |
|---|---:|---:|---|---|---|
| Patient | Yes | Yes | No/No | EF query filter + write enforcement | Low-Med (if bypass path used) |
| Claim | Yes | Yes | No/No | EF query filter + write enforcement | Low-Med (if bypass path used) |
| Physician | Yes | Yes | No/No | EF query filter + write enforcement | Low-Med |
| Facility | Tenant-linked scope model present | N/A | N/A | Context validation + lookup | Medium (header/middleware trust chain) |
| ProgramSettings | Yes | Yes | **Nullable / Nullable** | Mixed; global read/write used in tenant routes | **Critical** |
| EligibilityRequest / EligibilityInquiry | Yes | Yes | No/No | EF query filter + unique scoped indexes | Medium |
| EligibilityResponse (domain + linked data) | Not consistently row-owned | Not consistently row-owned | N/A | Correlation-based ownership | **High** |
| EDI Reports | Yes | No | Tenant required; facility absent | EF tenant filter + file store conventions | High (cross-facility within tenant) |
| Payments / ClaimPayment / PaymentBatch | Yes | Yes | No/No | EF filters + scoped access patterns | Medium |
| ERA/835 processing artifacts | Mixed | Mixed | Mixed | Worker/repository dependent | High |
| AppUser / session markers | Tenant/facility nullable in some roles | Nullable | Yes | Middleware/session checks | Medium-High (mis-scope complexity) |
| Insurance tables (`Insured`, `Patient_Insured`, `Claim_Insured`) | **No** | **No** | N/A | Parent-join discipline only | **Critical** |
| Notes/documents | Partial evidence only | Partial | Unknown | Not consistently validated in this pass | Medium-High (unknowns) |
| Attachments/files | Mixed DB + filesystem | Mixed | Mixed | Storage-key conventions + worker logic | High |

### Key Structural Weaknesses

- Global rows are first-class in `ProgramSettings` and used in non-platform-only flows.
- Core insurance PHI entities are not tenant/facility-owned at the row level.
- Some PHI transport artifacts depend on process logic instead of schema constraints.

---

## EF Core Global Query Filters and Bypass Paths

### Positive Findings

- `ZeblDbContext` includes many scoped `HasQueryFilter(...)` declarations for claims/patients/physicians/payments/eligibility and related entities.

### Bypass Findings (Critical)

- `IgnoreQueryFilters()` used in:
  - `Zebl.Api\Services\Hl7ImportService.cs`
  - `Zebl.Api\Services\EdiOrphanReconciliationService.cs`
- Workers use `AddDbContextFactory<ZeblDbContext>` where constructor behavior disables scoped filter model in those contexts unless manually enforced.

### Raw SQL / Direct Query Risk Surface

- Raw SQL primitives found (including `SqlQueryRaw`, `ExecuteSqlInterpolated`).
- Even when parameterized, these bypass global filter guarantees unless scope predicates are manually included every time.

### Conclusion

Current model is **filter-assisted**, not **filter-safe**. High-risk bypasses already exist in production paths.

---

## HTTP Context / Tenant Resolution

### Findings

- Tenant resolution is stronger than average (JWT-first with mismatch checks).
- Facility context still relies on request-supplied facility identifiers and middleware enforcement order.
- Middleware excludes globally scoped route patterns (notably `/api/debug`), creating alternate trust behavior.

### Risks

- Tenant/facility spoofing is possible if route coverage regresses or a new endpoint bypasses expected middleware behavior.
- Null/optional context paths for super-admin and integration flows increase complexity and chance of future authorization mistakes.

---

## Background Workers / Hosted Services

High-risk area confirmed.

### Findings

- Hosted services include eligibility polling/processing/retention and EDI reconciliation/reporting.
- Worker data paths use unscoped context patterns and explicit filter bypasses.
- Platform-wide loops process multiple tenant/facility workloads in shared process scope.

### Exploit/Failure Modes

- Cross-tenant read/write if worker query predicate omitted.
- Mass reconciliation mistakes (wrong file deletion, orphan misclassification).
- Contamination from stale context assumptions in long-running jobs.

---

## Filesystem / EDI Isolation

### Findings

- EDI file storage uses tenant-level partitioning; facility-level partitioning absent.
- Local file gateway supports configurable paths and move/delete operations.
- Operational logs can include filesystem path details.

### Risks

- Cross-facility data co-mingling under the same tenant.
- Retention and stale file leakage risk if reconciliation is incorrect.
- Path misconfiguration can move PHI outside controlled directories.

---

## Frontend Data Leakage Risks

### Critical Findings

- `localStorage` / `sessionStorage` keys for workspace and eligibility are not consistently tenant/facility/user namespaced.
- Context reset does not comprehensively purge all persisted keys.
- PHI-adjacent payloads are logged in frontend console in several components/services.

### Leakage Scenarios

- Tenant switch or relogin on same browser profile resurrects stale patient workspace data.
- Eligibility modal/global subject state can expose prior-patient context after navigation.
- Console logs leak PHI through support captures, screenshots, and session recordings.

---

## Authorization and IDOR Findings

### Positive

- Auth and session middleware are present and central.

### High-Risk Gaps

- Endpoints that trust client-provided IDs or rely only on contextual headers remain vulnerable if ownership checks are inconsistent.
- Program settings endpoints exhibit effective cross-tenant control due to global write methods under tenant auth.
- Debug/reporting routes create nonstandard authorization behavior.

---

## Raw SQL / Reporting / Export Risk

- Raw SQL usage exists in API services/controllers.
- Any missing tenant/facility predicate in these paths can bypass EF filter protections.
- Export/report flows and EDI generation should be considered high-value exfiltration vectors.

Required hardening:

- central safe-query abstraction requiring tenant/facility parameters,
- mandatory predicate assertion tests,
- static checks to reject raw SQL in tenant-facing data paths without approved wrappers.

---

## Program Settings Isolation

This is currently one of the most dangerous architectural weaknesses.

- Global settings row model is valid for platform governance.
- But tenant-level controllers/services use global read/write methods in active paths.
- This enables one tenant to alter behavior affecting others.

Immediate requirement: strict split between `platform-global` endpoints and `tenant/facility-scoped` endpoints with separate policies and codepaths.

---

## Eligibility + EDI Pipeline Isolation

### Findings

- Good: scoped control number uniqueness appears present for eligibility inquiry correlation.
- Risk: processing still depends on worker-safe scoping discipline, and some linked artifacts are not row-owned with tenant/facility fields.
- Risk: reconciliation and orphan handling run at broad scope.

### Breach Modes

- Wrong-tenant response association under defect conditions.
- Facility mismatch in processing pipelines where facility partitioning is weak.
- Replay/quarantine processing contamination when ownership checks are not explicit.

---

## Audit Logging and PHI Exposure

### Findings

- Multiple backend/frontend code paths emit verbose logs containing payloads, IDs, or exception details.
- Some API error responses include raw exception strings and internals.

### HIPAA Impact

- Logging layer becomes a PHI side-channel.
- Incident response and support tooling can become unauthorized PHI distribution vectors.

---

## Caching / Memory Contamination Risks

- No single smoking-gun static global dictionary leak was identified in this pass.
- However, singleton services + root-provided frontend services + background workers introduce logical contamination risks when context keys are absent.
- Browser storage contamination is already concrete and high risk.

---

## HL7 Import Pipeline

### Findings

- Integration context checks exist but rely on header-based identifiers.
- HL7-related services include query-filter bypass usage in some resolution flows.

### Risk

- Wrong tenant/facility linkage under defects or bypass paths.
- Potential information disclosure via logging and exception propagation.

---

## Endpoint Findings (High-Risk)

- `ProgramSettingsController`: tenant-authenticated flows using global config access methods.
- `EdiDebugController`: debug parsing path with broad scope implications.
- HL7/EDI operational endpoints: sensitive context + payload handling, high logging risk.
- Report/export endpoints: require strict ownership checks and anti-enumeration controls.

---

## Worker Findings (High-Risk)

- `EligibilityProcessingHostedService`, `Eligibility271PollingHostedService`, `EligibilityRetentionHostedService`
- `EdiOrphanReconciliationService`
- Any service using `IDbContextFactory<ZeblDbContext>` without explicit scoped predicate guarantees

Common problem: isolation policy is not enforced as a hard runtime contract.

---

## Query Findings

- EF filters exist and are helpful.
- Existing intentional bypasses (`IgnoreQueryFilters`) invalidate any claim that EF filters alone guarantee isolation.
- Raw SQL paths must be treated as untrusted unless scope assertions are guaranteed.

---

## Detailed Exploit Scenarios

### 1) Cross-tenant configuration poisoning
1. Attacker with tenant admin rights updates claim/program settings.
2. Controller writes to global setting row.
3. Other tenants inherit altered behavior.
4. Claims/eligibility behavior changes across platform.

### 2) Worker cross-tenant read/write contamination
1. Background worker runs unscoped context loop.
2. A refactor misses one tenant/facility predicate.
3. Worker reads or updates records from wrong tenant.
4. PHI is processed, exported, or reconciled incorrectly.

### 3) Stale browser state leakage after tenant/facility switch
1. User opens patient workspace in Tenant A.
2. Switches context/logs in to Tenant B using same browser profile.
3. Persisted workspace/eligibility keys restore stale patient context.
4. Unauthorized PHI appears on screen before authorized fetch.

### 4) Debug endpoint PHI exfiltration
1. Authenticated user accesses debug parse endpoint.
2. Payload/segments/diagnostics are returned or logged.
3. Sensitive identifiers become available outside intended access boundaries.

### 5) Insurance table ownership confusion
1. Unscoped insurance-link tables queried in a bypass path.
2. Join conditions do not fully enforce ownership.
3. Wrong patient/claim insurance data is attached.
4. PHI integrity and confidentiality are compromised.

---

## Risk Scoring Matrix (Prioritized)

| ID | Issue | Severity | Exploitability | HIPAA Impact | Likelihood | Priority |
|---|---|---|---|---|---|---|
| R1 | Unfiltered worker context / scope bypass | Critical | High | Catastrophic | High | P0 |
| R2 | ProgramSettings global writes in tenant routes | Critical | High | High | High | P0 |
| R3 | Unscoped insurance PHI entities | Critical | Medium | Catastrophic | Medium | P0 |
| R4 | Debug endpoint PHI exposure surface | High | High | High | High | P0 |
| R5 | Backend/frontend PHI logging leakage | High | Medium | High | High | P1 |
| R6 | `IgnoreQueryFilters()` in sensitive services | High | Medium | High | Medium | P1 |
| R7 | Header-derived facility trust dependency | High | Medium | High | Medium | P1 |
| R8 | Frontend persistent key namespace gaps | High | Medium | High | Medium-High | P1 |
| R9 | Tenant-only EDI filesystem partitioning | Medium-High | Medium | Medium-High | Medium | P2 |
| R10 | Weak inbound integration identity binding | Medium | Medium | Medium | Medium | P2 |
| R11 | Reconciliation global delete blast radius | High | Low-Med | High | Medium | P1 |
| R12 | Raw SQL/reporting predicate drift risk | High | Medium | High | Medium | P1 |

---

## Recommended Remediations

### Immediate (0-7 days)

- Disable or hard-gate debug endpoints in production.
- Remove PHI-bearing console/error payload logs (backend + frontend).
- Stop tenant endpoints from writing global ProgramSettings rows.
- Add mandatory context namespace to all browser storage keys and purge on context reset.

### Short Term (1-4 weeks)

- Eliminate unscoped worker DbContext access for tenant data-plane operations.
- Ban `IgnoreQueryFilters()` outside audited, approved, test-covered administrative paths.
- Introduce middleware + endpoint policy tests for tenant/facility ownership checks.
- Add facility partitioning to EDI/file storage and reconciliation ownership checks.

### Medium Term (1-2 quarters)

- Migrate legacy PHI tables (`Insured`, `Patient_Insured`, `Claim_Insured`) to explicit tenant/facility ownership columns with constraints.
- Build static analysis and CI guardrails:
  - reject raw SQL without scope wrappers,
  - reject unscoped local/session storage key usage,
  - reject unsafe exception detail responses.
- Implement policy-as-code authorization checks for patient/claim ownership per endpoint.

---

## Immediate Remediation Checklist

- [ ] Disable `/api/debug` routes in production (or super-admin + feature-flag + full redaction).
- [ ] Replace ProgramSettings global save/read usage in tenant endpoints with scoped methods only.
- [ ] Add worker scope contract: every batch item carries explicit tenantId + facilityId and enforces per-item scoped context.
- [ ] Remove/replace all `IgnoreQueryFilters()` usages in HL7/EDI services unless formally approved and constrained.
- [ ] Remove PHI/sensitive `console.log` and raw exception message responses.
- [ ] Namespace browser storage keys as `{tenant}:{facility}:{user}:{feature}`.
- [ ] Purge all persisted PHI-adjacent keys during context switch/logout.
- [ ] Add integration tests for tenant/facility isolation on top 25 data endpoints.
- [ ] Add file-store ownership assertions before any delete/reconcile action.
- [ ] Start schema migration plan for unscoped insurance entities.

---

## Brutally Honest Final Assessment

The system demonstrates **intent** to isolate tenant and facility data, but key production pathways still allow those controls to be bypassed by design or by likely future mistakes. For HIPAA-grade confidence, isolation cannot depend on "developers remembering filters/headers." It needs hard, unavoidable guardrails in schema, worker contracts, authorization policy, and logging discipline.

Until critical items (R1-R4 at minimum) are remediated, this platform should be treated as **high risk for cross-tenant/facility PHI leakage under realistic adversarial or failure conditions**.

---

## Remediation Progress Tracking (2026-06-02)

### Implementation Plan (Hardening-Only, No Full Redesign)

#### Phase 1 - Critical Blockers (P0)

1. ProgramSettings isolation hard split  
   - Enforce scoped read/write (`TenantId` + `FacilityId`) for tenant endpoints.
   - Add separate platform-only routes and methods for global settings.
   - Add runtime guardrails for missing tenant/facility coordinates.

2. Worker hardening + fail-fast scope validation  
   - Validate tenant/facility scope in eligibility worker operations.
   - Add scoped worker logging context.
   - Add startup isolation validation hosted service to fail fast on unsafe config.

3. Remove dangerous query filter bypasses  
   - Remove all `IgnoreQueryFilters()` usage in HL7 and EDI worker paths.

4. Debug endpoint lockdown  
   - Require `SuperAdminOnly`.
   - Block by default in production and unless explicit feature flag is enabled.
   - Redact response details.

5. PHI logging containment  
   - Remove raw payload-like console output in critical backend/frontend paths.

#### Phase 2 - High Priority Hardening (P1)

6. Frontend persisted state namespacing  
   - Scope keying with tenant/facility prefix.
   - Purge persisted scoped keys on context reset.

7. Startup validation + safety checks  
   - Validate debug endpoint gate and local eligibility transport directories.
   - Validate ProgramSettings uniqueness at startup.

8. Raw SQL safety layer (next increment)  
   - Introduce approved wrapper + CI checks (not fully complete in this patch).

9. Filesystem isolation (next increment)  
   - Current patch adds reconciliation ownership check by tenant key parsing.
   - Facility-level partitioning is still pending.

#### Phase 3 - Structural Hardening (P2)

10. Legacy PHI table ownership columns (`Insured`, `Patient_Insured`, `Claim_Insured`) - pending migration.
11. Endpoint-level ownership authorization expansion - partially pending.
12. Security observability and anomaly detection - partially pending.

### Changes Implemented

#### Backend

- `Zebl.Api/Controllers/ProgramSettingsController.cs`
  - Tenant routes now use scoped settings methods only.
  - Added platform-only global routes:
    - `GET /api/program-settings/platform/{section}`
    - `PUT /api/program-settings/platform/{section}`
  - Removed verbose claim payload console logging.

- `Zebl.Infrastructure/Services/ProgramSettingsService.cs`
  - Added hard guardrails requiring positive tenant/facility for scoped methods.
  - Added `SaveScopedPatientSectionAsync(...)`.
  - Retained explicit global methods for platform-only usage.
  - Global patient write path now rejected.

- `Zebl.Infrastructure/Services/ClaimInitialStatusProvider.cs`
  - Claim initial status now reads scoped claim settings (`tenant + facility`) instead of global defaults.

- `Zebl.Api/Controllers/EdiDebugController.cs`
  - Policy tightened to `SuperAdminOnly`.
  - Endpoint disabled in production or when `Security:EnableDebugEndpoints` is false.
  - Debug response redacted to avoid PHI-bearing segment detail.

- `Zebl.Api/Services/Hl7ImportService.cs`
  - Removed `IgnoreQueryFilters()` usage.
  - Removed/replaced PHI-prone console output in critical paths.

- `Zebl.Api/Services/EdiOrphanReconciliationService.cs`
  - Removed `IgnoreQueryFilters()` usage.
  - Added tenant ownership guard before orphan file deletion.

- `Zebl.Api/Services/Eligibility/EligibilityInquiryOrchestrator.cs`
  - Added fail-fast tenant/facility scope validation in worker operations.
  - Added worker scope logging context.

- `Zebl.Api/Services/StartupIsolationValidationHostedService.cs` (new)
  - Startup fail-fast checks for:
    - production debug endpoint safety
    - local eligibility transport directory correctness
    - ProgramSettings scoped uniqueness

- `Zebl.Api/Program.cs`
  - Registered startup isolation validation hosted service.
  - Removed sensitive startup console output.

- `Zebl.Infrastructure/Repositories/ClaimRepository.cs`
  - Removed claim status console logs.

#### Frontend

- `src/app/features/patients/services/patient-workspace-persistence.service.ts`
  - Namespaced persisted keys with tenant/facility prefix.

- `src/app/features/patients/services/patient-workspace-session.service.ts`
  - Namespaced session snapshot keys with tenant/facility prefix (+ legacy fallback read).

- `src/app/features/patients/services/patient-eligibility-flow.service.ts`
  - Namespaced last-request persistence key with tenant/facility prefix.

- `src/app/core/services/context-reset.service.ts`
  - Added broad persisted-state key purge on context reset for workspace/eligibility scoped keys.

- `src/app/core/services/facility.service.ts`
  - Removed facility id console logging.

### Integration Tests Added / Updated

- Updated `Zebl.Tests/ProgramSettingsPersistenceTests.cs`:
  - Scoped methods reject missing tenant/facility.
  - Global patient settings write is rejected.
  - Existing scoped-vs-global coexistence and isolation tests continue passing.

### Verification Executed

- Command: `dotnet test c:\Zebl India\Backend\Zebl.Api\Zebl.Tests\Zebl.Tests.csproj --filter ProgramSettingsPersistenceTests`
- Result: Passed (`9/9` tests).

### Migration Plan (Next Steps)

1. Add `TenantId` + `FacilityId` columns to:
   - `Insured`
   - `Patient_Insured`
   - `Claim_Insured`
2. Backfill from canonical parent rows.
3. Add non-null constraints and composite indexes.
4. Add FK/consistency constraints for ownership integrity.
5. Cut over all reads/writes to strict scoped predicates.
6. Remove fallback/join-only assumptions.

### Before vs After Isolation Behavior

- Before:
  - Tenant endpoints could write global ProgramSettings.
  - Critical services used `IgnoreQueryFilters()`.
  - Debug endpoint accessible under broad auth path.
  - Worker scope safety relied mostly on discipline.
  - Frontend storage not tenant/facility namespaced.

- After:
  - Tenant program settings are scoped-only; global writes are platform-only.
  - `IgnoreQueryFilters()` removed from audited HL7/EDI paths.
  - Debug endpoint locked behind super-admin + feature flag + non-production gate.
  - Worker operations fail fast on invalid scope.
  - Frontend persisted keys are namespaced and reset purge improved.

### Risk Reductions Achieved

- Cross-tenant configuration poisoning risk: **reduced from Critical to Medium** (remaining risk: future misuse of platform routes).
- Query-filter bypass risk in audited paths: **reduced from High/Critical to Medium**.
- Debug PHI exposure path: **reduced from High to Low-Medium**.
- Worker scope contamination risk: **reduced from Critical to Medium-High** (structural DB ownership still pending).
- Frontend stale cross-context leakage: **reduced from High to Medium**.

### Remaining Known Risks

1. Legacy insurance PHI tables still lack schema-level tenant/facility ownership.
2. Raw SQL safety wrapper and static policy enforcement not fully implemented yet.
3. Facility-level filesystem partitioning for EDI artifacts still pending.
4. Full endpoint ownership checks (IDOR hardening) need expanded integration coverage.
5. Additional frontend modules still need storage/logging audit sweep beyond patched areas.

### Rollout Order

1. Deploy backend P0 changes behind maintenance window (required).
2. Enable `Security:EnableDebugEndpoints=false` in all non-dev deployments.
3. Deploy frontend namespacing + reset purge.
4. Run adversarial integration suite in staging:
   - cross-tenant access attempts
   - cross-facility switching
   - worker replay/quarantine cases
5. Observe logs/metrics for 1 release cycle.
6. Execute P2 schema migrations for legacy PHI tables.

### Updated Architecture Notes

- Program settings are now two explicit domains:
  - Tenant/facility scoped operational settings (default path)
  - Platform-global settings (super-admin path only)
- Worker model now enforces explicit scope assertions in processing flow.
- Debug tooling is treated as privileged and disabled-by-default outside development.
- Browser persistence is migrating to scoped keyspace to prevent context bleed.

---

## Remediation Progress Tracking (2026-06-02 - Phase 2 Structural Hardening)

### Scope Completed

This phase implemented targeted structural hardening for:

1. Legacy PHI row ownership (tenant/facility) on insurance linkage tables.
2. Facility-level EDI/eligibility local filesystem partitioning.
3. Adversarial regression tests to reduce isolation regressions.
4. Raw SQL risk inventory for scoped-wrapper follow-up.

### Migrations Added

- `Zebl.Infrastructure/Migrations/20260602164000_LegacyInsuranceOwnershipIsolation.cs`

Key migration behavior:

- Adds `TenantId` and `FacilityId` to:
  - `Insured`
  - `Patient_Insured`
  - `Claim_Insured`
- Deterministic backfill:
  - `Patient_Insured` from `Patient`
  - `Claim_Insured` from `Claim`
  - `Insured` from unique patient-insurance scope derivation
- Quarantine/report table:
  - `dbo.LegacyInsuranceOwnershipQuarantine`
- Fail-fast migration behavior:
  - throws and aborts if unresolved ownership rows remain after backfill
- Adds scoped indexes and composite scoped FKs for ownership consistency.

### Entity and Query Filter Changes

Updated entities now implement tenant/facility ownership interfaces:

- `Insured : ITenantEntity, ITenantFacilityEntity`
- `Patient_Insured : ITenantEntity, ITenantFacilityEntity`
- `Claim_Insured : ITenantEntity, ITenantFacilityEntity`

EF model updates in `ZeblDbContext`:

- Added required `TenantId`/`FacilityId` configuration for all three entities.
- Added scoped indexes for common joins.
- Added global query filters for all three entities.

### Write Path and Repository/Service Changes

- `PatientsController` now stamps tenant/facility on newly created `Insured` and `Patient_Insured` rows.
- `Hl7ImportService` now stamps tenant/facility on newly created `Claim_Insured`.
- `ClaimRepository` now stamps tenant/facility on secondary `Claim_Insured` creation.

Result: legacy insurance rows no longer rely on join-only trust in write paths.

### Facility-Level EDI Partitioning Changes

#### EDI File Store

- `IEdiReportFileStore.BuildStorageKey(...)` updated to include facility scope.
- Storage key format now:
  - `{tenant}/{facility}/{reportId}_{filename}`
- Legacy fallback segment `_legacy` retained only for historical backfill compatibility paths.

#### EDI Report Service

- `EdiReportService` now passes tenant+facility to storage key generation across:
  - generated outbound reports
  - inbound received reports
  - metadata-only inbound records

#### Eligibility Local Filesystem

- Added centralized path resolver:
  - `EligibilityScopedPathResolver`
- `LocalFileSystemEligibilityGateway` now resolves scoped directories as:
  - `{base}/{tenant}/{facility}/...`
  for upload/incoming/processed/quarantine.
- `Eligibility270SendRequest` now carries explicit `TenantId` + `FacilityId`.
- `EligibilityInquiryOrchestrator` now populates send request scope.

### Cross-Tenant / Isolation Regression Tests Added

Added:

- `Zebl.Tests/IsolationHardeningRegressionTests.cs`
  - verifies legacy insurance writes fail without explicit tenant/facility.
  - verifies EDI storage keys include facility partition.

Updated existing tests for EDI file-store signature changes:

- `EdiDuplicateConcurrencyTests`
- `EdiStressAndChaosTests`
- `ProgramSettingsPersistenceTests` (from previous phase retained)

Execution result (targeted suites):

- Passed: `15`
- Failed: `0`

### Raw SQL Safety Foundation (Inventory)

Identified high-risk raw SQL/direct execution points for wrapper migration:

- `PatientsController` (`ExecuteSqlInterpolatedAsync` paths)
- `ServiceLineRepository` (`ExecuteSqlInterpolatedAsync`)
- `PhysiciansController` (`SqlQueryRaw`)
- `InterfaceController` (`SqlQueryRaw`)
- bootstrapping/backfill ADO.NET paths in infrastructure utilities

Current phase outcome:

- Inventory completed and documented.
- Wrapper rollout remains pending as next hardening increment (P1/P2).

### Before vs After (Phase 2 Delta)

- Before:
  - Insurance linkage tables had no row-level tenant/facility ownership.
  - EDI file keys were tenant-only in primary path.
  - Local eligibility folders were not forced into tenant/facility partitions.
- After:
  - Insurance linkage rows are tenant/facility-owned with migration backfill + fail-fast quarantine.
  - EDI report keying includes facility partition.
  - Local eligibility file transport is tenant/facility-scoped in path resolution.

### Revised Risk Assessment (Post-Phase 2)

- Legacy insurance join-only isolation risk: **Critical -> Medium** (migration cleanup still required on unresolved rows).
- Cross-facility EDI file co-mingling risk: **High -> Medium**.
- Worker/file replay cross-scope contamination risk: **High -> Medium**.
- Residual overall platform isolation risk: **Medium-High** (remaining due to raw SQL wrapper gap + full auth ownership audit breadth).

### Remaining Known Risks

1. Raw SQL safety wrapper and static policy enforcement still pending.
2. Full endpoint-level IDOR/ownership hardening remains partial.
3. SFTP-side remote directory conventions should be aligned to tenant/facility layout with operational rollout playbook.
4. Legacy quarantine rows require operational remediation before applying migration in environments with ambiguous historical data.

---

## Remediation Progress Tracking (2026-06-02 - Phase 3 Authorization / IDOR Hardening)

### Phase Goal

Move object-level authorization from mostly implicit filtering to explicit reusable ownership checks, with stronger anti-enumeration behavior on high-risk endpoints.

### Authorization Guard Architecture Added

Added centralized backend guard:

- `Zebl.Api/Services/OwnershipGuardService.cs`

Guard capabilities:

- `CanAccessClaimAsync(...)`
- `CanAccessEligibilityInquiryAsync(...)`
- `CanAccessUnmatched271Async(...)`
- `CanAccessEdiReportAsync(...)`

Behavior:

- validates tenant/facility/object ownership using scoped context
- logs denied attempts as structured security warnings
- supports controller-level anti-enumeration responses (404 on denied object access)

### Endpoint Hardening Implemented

#### Eligibility operations (high-risk worker replay paths)

- `Zebl.Api/Controllers/EligibilityOperationsController.cs`
  - Added ownership guard checks before:
    - retry inquiry
    - reprocess 271
    - replay unmatched 271
  - Returns `404` for out-of-scope objects.

- `Zebl.Api/Services/Eligibility/EligibilityInquiryOrchestrator.cs`
  - Updated operations to require explicit scope parameters (`tenantId`, `facilityId`) for:
    - `RetryInquiryAsync`
    - `Reprocess271ForInquiryAsync`
    - `ReplayUnmatched271Async`
  - All object lookups now constrained by explicit scope predicates in those methods.

#### EDI report/download/apply/export endpoints

- `Zebl.Api/Controllers/EdiReportsController.cs`
  - Added ownership guard checks for ID-based operations:
    - get by id
    - review
    - send
    - content read
    - archive
    - mark-read
    - note update
    - delete
    - apply 835
    - export file
  - Out-of-scope object IDs now fail as `404` before content access/action.

#### Claims endpoint consistency

- `Zebl.Api/Controllers/ClaimsController.cs`
  - `UpdateClaim` now explicitly filters by:
    - `ClaID`
    - `TenantId`
    - `FacilityId`
  - Removes reliance on implicit filtering for this mutation endpoint.

### Raw SQL Security Enforcement (Foundation Implemented)

Added centralized SQL guardrail service:

- `Zebl.Api/Services/ScopedSqlExecutor.cs`

Enforcement:

- blocks execution when tenant/facility context missing
- by default requires `TenantId` and `FacilityId` predicates in SQL text
- structured operation logging for SQL execution traces

Applied to tenant-facing raw SQL in:

- `Zebl.Api/Controllers/PatientsController.cs`
  - replaced direct `ExecuteSqlInterpolatedAsync` calls in patient/claim/insured sync paths with scoped executor
  - operations without direct tenant/facility columns are explicitly marked and justified with `requireTenantFacilityPredicates: false` only where scoped claim IDs are pre-resolved

### Frontend Stale-Context / Direct URL Hardening

Implemented targeted client defenses:

- `workspace-route-reuse-strategy.ts`
  - route reuse keys now include context fingerprint (`tenantKey:facilityId`) to prevent reattaching old detached views after context change.

- `auth.interceptor.ts`
  - added handling for `428` context-precondition failures:
    - clears client caches
    - notifies user
    - redirects to dashboard for context re-selection.

- `local-storage-workspace.repository.ts`
  - workspace persistence key now scoped by tenant/facility.

- `claim-shell-cache.service.ts`
  - added `invalidateAll()`.

- `patient-workspace-query.service.ts`
  - added `invalidateAll()` across workspace slice caches.

- `era835-review-return-cache.service.ts`
  - added `clearAll()`.

- `context-reset.service.ts`
  - now clears additional ownership-sensitive caches:
    - claim shell cache
    - patient workspace query caches
    - ERA return cache

### Security Audit Logging Improvements

Structured ownership-denial logging now emitted by `OwnershipGuardService` with:

- resource type
- resource id
- tenant id
- facility id

No PHI payload logging added in these guard paths.

### Adversarial Tests Added

Added:

- `Zebl.Tests/OwnershipGuardServiceTests.cs`
  - cross-facility inquiry access denial
  - cross-tenant EDI report access denial

Retained and revalidated prior isolation suites:

- `ProgramSettingsPersistenceTests`
- `IsolationHardeningRegressionTests`

Targeted run result:

- Passed: 13
- Failed: 0

### Before vs After (Phase 3 Delta)

- Before:
  - several ID-driven operations relied on implicit filtering and service assumptions.
  - worker replay operations accepted IDs without explicit external ownership guard.
  - raw SQL enforcement depended on query-author discipline.
  - route reuse/workspace persistence could rehydrate stale context state.

- After:
  - central ownership guard enforces object-level access checks across high-risk controllers.
  - replay/reprocess worker operations are explicitly scoped.
  - SQL execution has centralized scoped guardrails in tenant mutation paths.
  - frontend route reuse/storage/cache reset hardening reduces stale-context exposure.

### Revised Risk Scores (Post-Phase 3 Increment)

- IDOR on eligibility replay/reprocess operations: **High -> Low-Medium**
- IDOR on EDI report content/export/apply operations: **High -> Medium**
- Implicit-filter mutation inconsistency (claims update): **Medium -> Low**
- Raw SQL predicate omission risk in patched patient flows: **High -> Medium**
- Frontend stale route/cache leakage risk: **Medium -> Low-Medium**

### Remaining Open Findings

1. Full endpoint-by-endpoint ownership guard adoption is not yet complete across every controller action.
2. EDI report model still relies on tenant-level row ownership plus linked receiver/connection checks; first-class report `FacilityId` remains a recommended hardening step.
3. Raw SQL wrapper adoption should expand to remaining SQL paths (`ServiceLineRepository`, selected diagnostic endpoints) with CI/static checks.
4. Super-admin/admin override paths need broader explicit audit tagging and feature-gated review across all operational tooling.
5. Attachment/document direct-download surfaces require a dedicated full sweep once attachment endpoints are fully inventoried in current branch.

### Production Readiness Reassessment

Status improved from **Not Ready** to **Conditionally Ready for controlled rollout** if:

- migration and quarantine remediation from prior phases are completed,
- remaining open findings (especially full endpoint sweep + raw SQL wrapper coverage) are scheduled with strict timelines,
- staging adversarial tests are made mandatory in release gates.

---

## Phase 4 — Full Ownership Guard Coverage Completion (2026-06-02)

### Deliverables

| Deliverable | Location |
|-------------|----------|
| Coverage matrix | `docs/security/ownership-coverage-matrix.md` |
| Authorization standards | `docs/security/authorization-standards.md` |
| Expanded guard service | `Zebl.Api/Services/OwnershipGuardService.cs` |
| CI static guardrails | `Zebl.Tests/OwnershipStaticGuardrailTests.cs` |
| Adversarial unit tests | `Zebl.Tests/OwnershipAuthorizationRegressionTests.cs` |

### Controller hardening completed (Phase 4)

- **PaymentsController** — all ID routes + entry service-lines + claim payments list.
- **ClaimsController** — scrub + evaluate-secondary.
- **EligibilityController** — inquiry by ID + patient history/snapshot.
- **EdiReportsController** — generate now requires claim ownership (export/content already guarded).
- **PhysiciansController** — GET/PUT scoped; duplicate NPI check scoped.
- **CustomFieldsController** — value read/write requires entity ownership.
- **DisbursementsController** — claim disbursements query scoped (fixed cross-facility leak).
- **AdjustmentsController** — claim existence validated before listing.
- **ServicesController** — removed unscoped `FindAsync` on service line mutations.
- **EraExceptionRepository** — list/get scoped via tenant EDI reports + facility claims.

### Guard service surface (Phase 4)

Added: `CanAccessPatientAsync`, `CanAccessPaymentAsync`, `CanAccessClaimBatchAsync`, `CanAccessPhysicianAsync`, `CanAccessServiceLineAsync`, `CanAccessCustomFieldEntityAsync`, `CanAccessEraExceptionAsync`, `CanAccessClaimRejectionAsync`, missing-context denial.

### Before vs After (Phase 4 Delta)

- **Before:** High-risk IDOR surfaces (payments, eligibility artifacts, physician update, disbursements by claim, custom field values) relied on implicit EF filtering or unscoped lookups.
- **After:** Central guard or explicit scoped predicates on these paths; CI tests fail on common regression patterns; operational matrix documents enforcement status per controller.

### Revised production readiness (post–Phase 4)

**Score: 7.5 / 10 — Conditionally ready for controlled production rollout**

Conditions unchanged:

- Complete DB migration/quarantine from Phase 2 in target environments.
- Run full test suite + staging adversarial scenarios before promote.
- Track backlog items in coverage matrix (EDI `FacilityId`, attachment sweep, HTTP-level integration tests).

### Remaining accepted risks

1. **EDI report row** — tenant-scoped; facility inferred via receiver/connection linkage (recommend first-class `FacilityId`).
2. **Custom field definitions** — global metadata; values guarded.
3. **Super-admin / debug** — intentional cross-tenant; policy + feature flag.
4. **Reference libraries** (code/city-state) — shared non-PHI data.
5. **HTTP-level adversarial suite** — unit/regression tests added; full WebApplicationFactory matrix still recommended for release gate.

---

## Phase 5 - Adversarial HTTP Security Validation (2026-06-02)

### What was added

- `Zebl.Tests/SecurityWebApplicationFactory.cs`:
  - full HTTP request pipeline harness via `WebApplicationFactory<Program>`
  - JWT auth + middleware + routing + authorization exercised end-to-end
  - seeded multi-tenant/multi-facility fixture data for attack simulation
- `Zebl.Tests/AdversarialHttpSecurityTests.cs`:
  - cross-tenant access attempts (`patient`, `claim`, `payment`, `eligibility`, `EDI`)
  - cross-facility attempts (same tenant, wrong facility)
  - guessed ID enumeration consistency checks
  - header spoofing (`X-Tenant-Key` mismatch)
  - missing facility context rejection
  - export abuse (`EDI export` direct URL)
  - stale session token rejection
  - replay abuse (`eligibility retry` wrong facility)
  - super-admin boundary denial for operational token
  - error response leakage assertions (no stack trace / SQL internals)
- `ScopedSqlExecutorEscapeTests`:
  - verifies unsafe SQL without tenant/facility predicates is blocked.

### Security observability hardening

- `OwnershipGuardService` denial logs now emit structured `SECURITY_EVENT ownership_denied`.
- `FacilityContextValidationMiddleware` now emits structured `SECURITY_EVENT` logs for:
  - tenant header spoofing mismatch
  - invalid/missing facility context
  - facility access denied
  - super-admin access denial

### Release gate artifact

- Added `docs/security/release-gate-checklist.md` as formal pre-production security gate.

### Adversarial validation outcome

- Ownership isolation behavior remained enforced under hostile HTTP conditions.
- Cross-tenant and cross-facility object access attempts returned non-success with no existence disclosure.
- Session replay with stale stamp rejected at middleware layer (`401`).
- Header spoofing rejected with tenant mismatch handling.
- Export endpoint denied cross-tenant direct URL access before file stream access.

### Residual risk after Phase 5

1. Attachment/document endpoints are still pending dedicated endpoint inventory on this branch.
2. EDI report facility is still inferred (tenant + linked artifacts); first-class `FacilityId` remains recommended.
3. Some lower-risk controller actions still rely on scoped query patterns rather than explicit guard invocation.
4. Security event alert thresholds/dashboards must be tuned per production traffic baseline.

### Production readiness reassessment (post-Phase 5)

**Score: 8.2 / 10 - Conditionally ready for controlled rollout with security gate enforcement**

Recommended rollout restrictions:

- enable release only after Phase 5 adversarial suite passes in CI for the exact build artifact;
- keep debug/tooling routes disabled in production;
- apply alerting on repeated `SECURITY_EVENT ownership_denied` and `header_spoofing_tenant_mismatch`.

