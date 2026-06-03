# Security Release Gate Checklist (Phase 5)

Use this checklist before production promotion. Release is blocked if any required item fails.

## 1) Adversarial HTTP Validation (Required)

- [ ] `AdversarialHttpSecurityTests` passed in CI (cross-tenant, cross-facility, spoofing, stale session, replay abuse, export abuse, leakage checks).
- [ ] `OwnershipStaticGuardrailTests` passed (no unscoped `Find`, no controller `IgnoreQueryFilters`, EDI guard checks).
- [ ] `ScopedSqlExecutorEscapeTests` passed (unsafe SQL blocked).
- [ ] No high-severity failing security tests in test report.

## 2) Data Isolation & Migration State (Required)

- [ ] Latest ownership/isolation migrations applied in target environment.
- [ ] Legacy quarantine tables are empty or dispositioned with approved remediation ticket.
- [ ] Tenant/facility key backfills verified for legacy insurance entities.
- [ ] EDI file storage keys confirmed scoped (`{tenant}/{facility}/...`).

## 3) Runtime Security Controls (Required)

- [ ] `/api/debug` disabled or feature-flag gated for production.
- [ ] Super-admin endpoints require `SuperAdminOnly`; operational tokens are denied.
- [ ] Facility context middleware enabled and rejecting tenant/header mismatch.
- [ ] Session stamp validation enabled (stale tokens rejected).
- [ ] CORS production config uses explicit origins (no wildcard).

## 4) Logging & Detection (Required)

- [ ] Structured `SECURITY_EVENT` logs visible in centralized logging.
- [ ] Ownership denials searchable by `ResourceType`, `TenantId`, `FacilityId`.
- [ ] Header spoof attempts and super-admin access denials alertable.
- [ ] Logs are PHI-safe (no raw payloads in denial/error events).

## 5) Operations & Recoverability (Required)

- [ ] Backup/restore drill completed for current release window.
- [ ] Retention and cleanup jobs validated (eligibility/EDI artifacts).
- [ ] Audit trail write-path healthy (`Login`, `SuperAdminImpersonate`, `SuperAdminExitImpersonation`).
- [ ] On-call runbook updated with security-event triage queries.

## 6) Deployment Decision

- **Go** only if all required boxes are checked.
- If any required check fails: **No-Go**, open blocker ticket, assign owner, rerun gate.
