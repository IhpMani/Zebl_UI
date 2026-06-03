# Authorization & Ownership Standards (Phase 4)

Operational standard for backend engineers adding or changing tenant/facility-scoped APIs.

## Principles

1. **Never trust IDs from the client** — route/query/body IDs must be validated against `ICurrentContext` tenant/facility scope.
2. **Prefer centralized checks** — use `OwnershipGuardService` for object-level access before reads, mutations, exports, or replays.
3. **Return 404 for cross-scope access** — do not distinguish "exists elsewhere" vs "missing" in tenant-facing APIs (reduces enumeration).
4. **EF global filters are necessary but not sufficient** — every `Find`, raw SQL path, export stream, and worker replay must still enforce scope explicitly.
5. **Super-admin paths are explicit exceptions** — must use dedicated policies (`SuperAdminOnly`, feature flags) and must not be reachable from standard tenant sessions.

## Required patterns

### Object access by ID

```csharp
if (!await _ownership.CanAccessClaimAsync(claimId, cancellationToken))
    return NotFound();
```

Supported guard methods (extend here, do not duplicate ad-hoc queries in controllers):

| Resource | Guard method |
|----------|----------------|
| Patient | `CanAccessPatientAsync` |
| Claim | `CanAccessClaimAsync` |
| Payment | `CanAccessPaymentAsync` |
| Eligibility inquiry | `CanAccessEligibilityInquiryAsync` |
| Unmatched 271 | `CanAccessUnmatched271Async` |
| EDI report | `CanAccessEdiReportAsync` |
| Claim batch | `CanAccessClaimBatchAsync` |
| Physician | `CanAccessPhysicianAsync` |
| Service line | `CanAccessServiceLineAsync` |
| Custom field entity | `CanAccessCustomFieldEntityAsync` |
| ERA exception | `CanAccessEraExceptionAsync` |

### List/search endpoints

- Apply `TenantId` + `FacilityId` in the query predicate (or rely on global filters **plus** verify filters are not bypassed).
- Optional parent filters (`patientId`, `claimId`) require guard checks before executing the query.

### File download / export / replay

1. Guard ownership **before** opening streams (`OpenReadAsync`, `File(...)`, SFTP replay).
2. Storage keys must include tenant/facility segments (`{tenantId}/{facilityId}/...`).
3. Worker-triggered replays must validate scope in the orchestrator **and** controller.

### Raw SQL

Use `ScopedSqlExecutor.ExecuteScopedAsync` for tenant-facing mutations. SQL must include `TenantId` and `FacilityId` predicates unless operation is platform-global and policy-gated.

**Forbidden in tenant controllers:**

- `IgnoreQueryFilters()`
- `_db.Set<T>().Find(id)` without scope
- `FirstOrDefaultAsync(x => x.Id == id)` without tenant/facility predicate

## Approved query patterns

```csharp
// Preferred: explicit scope in query
await _db.Claims.AsNoTracking()
    .FirstOrDefaultAsync(c => c.ClaID == id && c.TenantId == tid && c.FacilityId == fid);

// Preferred: centralized guard then repository call
if (!await _ownership.CanAccessPaymentAsync(id, ct)) return NotFound();
var dto = await _paymentRepo.GetPaymentForEditAsync(id);
```

## CI / review guardrails

`Zebl.Tests/OwnershipStaticGuardrailTests.cs` fails the build when controllers reintroduce:

- `IgnoreQueryFilters`
- unscoped `_db.*.Find/FindAsync` (except documented metadata controllers)
- EDI export/content endpoints missing `CanAccessEdiReportAsync`

PR reviewers must verify:

- [ ] New ID-based routes call `OwnershipGuardService` or scoped predicates
- [ ] Export/download routes guard before streaming
- [ ] Raw SQL uses `ScopedSqlExecutor` or is platform-only
- [ ] Adversarial test added for cross-tenant/facility denial when risk is High

## Known accepted exceptions

| Area | Rationale | Compensating control |
|------|-----------|---------------------|
| `CustomFieldsController` definition CRUD | Global field metadata | Value read/write guarded by entity ownership |
| `SuperAdmin*` controllers | Cross-tenant operations by design | `SuperAdminOnly` policy + audit |
| `CodeLibraryController` / reference data | Shared catalogs | No PHI rows; read-only for tenants |
| `CityStateZipController` | Shared postal reference | No PHI |
