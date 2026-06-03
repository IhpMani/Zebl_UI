# Ownership Coverage Matrix (Phase 4)

Last updated: 2026-06-02. Legend: **Y** = enforced, **P** = partial/scoped query (no guard call), **N** = gap/accepted exception, **—** = not applicable.

| Controller | Endpoint (summary) | Resource | Ownership enforced? | Guard service? | Raw SQL | Export/download | Integration tested? | Risk | Remaining gaps |
|------------|-------------------|----------|---------------------|----------------|----------------|-------------------|---------------------|------|----------------|
| **EdiReports** | GET list | EDI reports | P | — | — | — | P | Med | List filtered in service by tenant |
| **EdiReports** | GET `{id}` | EDI report | Y | Y | — | — | Y | High | — |
| **EdiReports** | GET `{id}/content` | EDI file | Y | Y | — | Y | Y | **Critical** | — |
| **EdiReports** | GET `{id}/export` | EDI file | Y | Y | — | Y | Y | **Critical** | — |
| **EdiReports** | GET `{id}/review` | 835 ERA | Y | Y | — | — | P | High | — |
| **EdiReports** | POST `{id}/apply` | 835 replay | Y | Y | — | — | P | **Critical** | — |
| **EdiReports** | POST send/archive/delete | EDI report | Y | Y | — | — | P | High | — |
| **EdiReports** | POST generate | Claim+EDI | Y | Y | — | — | P | High | Claim guard added Phase 4 |
| **EdiReports** | POST download (SFTP) | Inbound files | P | — | — | Y | P | **Critical** | Connection must belong to tenant (repo-scoped) |
| **Eligibility** | GET `{id}` | Inquiry | Y | Y | — | — | Y | High | — |
| **Eligibility** | GET patient history/snapshot | Patient | Y | Y | — | — | Y | High | — |
| **EligibilityOperations** | replay/reprocess/worker | Inquiry/271 | Y | Y | — | — | P | **Critical** | Prior Phase 3 + guard |
| **Claims** | GET `{claId}` | Claim | P | — | — | — | P | High | Explicit tenant/facility in query |
| **Claims** | PUT `{claId}` | Claim | P | — | — | — | P | High | Scoped query on load |
| **Claims** | POST scrub | Claim | Y | Y | — | — | P | High | Phase 4 |
| **Claims** | POST evaluate-secondary | Claim | Y | Y | — | — | P | Med | Phase 4 |
| **Claims** | GET/POST rejections | Rejection | P | — | — | — | P | Med | Repository scoped |
| **Claims** | GET batches `{id}` | Batch | P | — | — | — | P | Med | Service passes tenant/facility |
| **Payments** | GET/PUT/DELETE `{id}` | Payment | Y | Y | — | — | Y | **Critical** | Phase 4 |
| **Payments** | GET entry service-lines | Claim/Patient | Y | Y | — | — | Y | High | Phase 4 |
| **Payments** | GET claims `{claId}` | Claim | Y | Y | — | — | P | High | Phase 4 |
| **Services** | GET claims `{claId}` | Claim | P | — | — | — | P | Med | Scoped AnyAsync |
| **Services** | PUT/DELETE service line | Service line | P | — | — | — | P | Med | Replaced Find with scoped query Phase 4 |
| **Patients** | GET `{id}` | Patient | P | — | P* | — | P | High | Scoped query; raw SQL via ScopedSqlExecutor |
| **Physicians** | GET/PUT `{id}` | Physician | Y/P | P | P** | — | Y | Med | Scoped query Phase 4; approx count SQL |
| **Disbursements** | GET claims `{claId}` | Claim | Y | P | — | — | P | High | Tenant/facility on claim+payment Phase 4 |
| **Adjustments** | GET claims `{claId}` | Claim | Y | P | — | — | P | Med | Claim existence check Phase 4 |
| **CustomFields** | POST value / GET values | PHI entity | Y | Y | — | — | Y | Med | Definitions global (accepted) |
| **Era** | GET/POST exceptions | ERA exception | Y | P | — | — | P | High | Repository scoped Phase 4 |
| **ProgramSettings** | tenant routes | Settings | Y | P | — | — | Y | High | Phase 1 |
| **EdiDebug** | debug | EDI | Y | — | — | — | P | **Critical** | Super-admin + flag Phase 1 |
| **SuperAdmin*** | cross-tenant | Platform | N*** | — | — | — | P | **Critical** | By design; policy gated |
| **Hl7Import** | import | Patient/Claim | P | — | — | — | P | High | Inbound facility context |
| **Receiver/Connection/Payer** | CRUD | Config | P | — | — | — | Y | Med | Repository tenant scoped |
| **Auth/Users/Facilities** | session | User | P | — | — | — | Y | Med | Membership checks |

\* Patients list/mutations use `ScopedSqlExecutor` on selected raw SQL paths.  
\*\* `PhysiciansController.GetApproxPhysicianCountAsync` uses platform catalog SQL (no PHI).  
\*\*\* Super-admin endpoints intentionally cross tenant with explicit authorization.

## Phase 4 test coverage

| Suite | Purpose |
|-------|---------|
| `OwnershipGuardServiceTests` | Guard denies cross-tenant/facility/missing context |
| `OwnershipAuthorizationRegressionTests` | Payment, patient, physician, custom-field entity denial |
| `OwnershipStaticGuardrailTests` | CI pattern scan for `IgnoreQueryFilters`, unscoped `Find`, EDI export guard |
| `IsolationHardeningRegressionTests` | Legacy insurance + EDI storage key regression |
| `ProgramSettingsPersistenceTests` | Tenant settings isolation |

## Priority backlog (post–Phase 4)

1. Add `FacilityId` column to `EdiReport` for first-class facility partition (today: tenant + linked receiver/connection).
2. Extend `ScopedSqlExecutor` adoption to `ServiceLineRepository` and remaining diagnostic SQL.
3. Tenant-scope `CustomFieldDefinition` if per-tenant field catalogs are required.
4. Dedicated attachment/document inventory + guard sweep when attachment APIs land on this branch.
5. Expand WebApplicationFactory adversarial tests for HTTP-level 404/403 (header spoofing, stale routes).
