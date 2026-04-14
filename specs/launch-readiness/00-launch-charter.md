# OmniDial Launch Charter (Sessions A-D)

**Document ID:** `launch-readiness/00`  
**Status:** In Progress (Wave 1 execution active; Session D alignment complete)  
**Scope:** Wave 1 launch blockers + Wave 2 hardening boundaries across launch-readiness specs `00`-`11`  
**Deployment Baseline:** Coolify/Hetzner-first  
**Last Updated:** February 12, 2026

---

## 0. Implementation Status

### Completed

- [x] Session A specs authored: `launch-readiness/00` through `launch-readiness/03`.
- [x] Session B specs authored: `launch-readiness/04` through `launch-readiness/06`.
- [x] Session C specs authored: `launch-readiness/07` through `launch-readiness/10`.
- [x] Session D consolidation authored: `launch-readiness/11`.
- [x] P0/P1 launch severity policy and change-control policy are defined.

### Remaining Launch Blockers

- [ ] Wave 1 implementation complete and verified for specs `01` through `10`.
- [ ] API/schema changes are implemented in planned sequence per `launch-readiness/11`.
- [ ] Wave 1 exit evidence is captured and sign-off record is complete.

---

## 1. GA Mission

Launch OmniDial as a secure, reliable, multi-tenant paid product for US customers, with strict tenant isolation and predictable billing enforcement.

This charter defines the launch bar and Wave boundaries for the full launch-readiness deliverable set:

- `00-launch-charter.md`
- `01-tenant-security-and-authz.md`
- `02-auth-magic-link-and-session-hardening.md`
- `03-billing-limits-and-abuse-protection.md`
- `04-data-platform-rls-supabase-and-self-host.md`
- `05-dialer-reliability-and-state-model.md`
- `06-enrichment-extension-and-api-compliance.md`
- `07-observability-admin-analytics-and-support.md`
- `08-legal-and-consent-controls-us.md`
- `09-performance-offline-responsive-and-device-qa.md`
- `10-cicd-release-and-operations.md`
- `11-api-and-schema-change-log.md`

---

## 2. GA Goals

1. Prevent cross-tenant data access and mutation on all user-facing ID-based operations.
2. Make authentication/session flows resilient against abuse, replay, callback tampering, and org-context drift.
3. Enforce paid usage controls safely (fail-closed), with explicit and auditable emergency override.
4. Ship a clearly defined Wave 1 blocker set and defer non-blocking hardening to Wave 2.

---

## 3. GA Non-Goals

1. No major platform rewrite (no architecture reset before GA).
2. No net-new expensive/experimental AI features in GA scope.
3. No expansion of feature surface that increases operational risk without launch value.
4. No cross-region or multi-cloud redesign for GA.

---

## 4. AI Feature Scope Boundary

1. Experimental/high-cost AI features are excluded from GA by default.
2. Any non-core AI capabilities must be:
   - Admin-gated only.
   - Disabled by default for paid tenants.
   - Protected by hard usage limits and explicit cost controls.
3. GA includes only business-critical AI already in core flows and required for current value delivery.

---

## 5. Wave Model

### 5.1 Wave 1 (Launch Blockers)

1. Tenant security/authz fixes for known cross-org risk paths.
2. Magic-link and session hardening for signup/login/invite/org switching.
3. Billing guard fail-closed behavior and abuse controls baseline.
4. Decision-complete specs and execution criteria for these areas.

### 5.2 Wave 2 (Post-GA Hardening)

1. Broader offline/performance/device QA programs.
2. Expanded analytics and operational depth.
3. Additional runbooks and automation beyond minimum launch needs.

---

## 6. Launch-Blocking Severity Definitions

### 6.1 P0 (Launch Stopper)

A defect is `P0` if any of the following is true:

1. Cross-tenant unauthorized read/write is possible in production.
2. Billing controls can be bypassed due to guard failure or dependency outage.
3. Auth/session flow can be abused for account takeover or unauthorized org access.
4. Legal/compliance-critical protections required for launch are absent or broken.

`P0` policy:

1. Must be fixed before GA.
2. No accepted workaround for launch.
3. Requires explicit re-test and sign-off.

### 6.2 P1 (Conditional Blocker)

A defect is `P1` if it materially increases risk to launch quality but has a bounded workaround.

`P1` policy:

1. Must be fixed before GA unless exception is approved by product + engineering + security.
2. Exception requires:
   - Documented mitigation.
   - Owner.
   - Deadline.
   - Rollback/containment plan.

---

## 7. Wave 1 Exit Criteria

Wave 1 is complete only when:

1. All Wave 1 launch-blocking controls in specs `01` through `10` are implemented and verified.
2. Route/resource authorization is org-scoped consistently, with cross-tenant tests passing.
3. Auth/session, billing, webhook integrity, and legal consent controls are deterministic and fail-closed where required.
4. CI/CD minimum gates, runbooks, and operational alerts are active.
5. API/schema rollout evidence matches the sequence and compatibility rules in `launch-readiness/11`.

---

## 8. Governance and Change Control

1. Any scope increase that touches GA-critical auth/billing behavior requires a spec delta in `specs/launch-readiness`.
2. Any proposal that weakens tenant isolation or billing enforcement requires explicit security sign-off.
3. Feature additions that increase cost/reliability risk are deferred to Wave 2 unless they remove a Wave 1 blocker.

---

## 9. Dependencies and Cross-Spec Links

1. `specs/launch-readiness/01-tenant-security-and-authz.md` defines mandatory authorization model and required code patterns.
2. `specs/launch-readiness/02-auth-magic-link-and-session-hardening.md` defines session and magic-link controls.
3. `specs/launch-readiness/03-billing-limits-and-abuse-protection.md` defines call permission state machine and fail-closed billing posture.
4. `specs/launch-readiness/04-data-platform-rls-supabase-and-self-host.md` defines data platform, RLS posture, migrations, and backup/restore baseline.
5. `specs/launch-readiness/05-dialer-reliability-and-state-model.md` defines canonical dialer and webhook reliability behavior.
6. `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md` defines enrichment/extension and CRM push API contracts.
7. `specs/launch-readiness/07-observability-admin-analytics-and-support.md` defines telemetry, admin analytics, and support workflows.
8. `specs/launch-readiness/08-legal-and-consent-controls-us.md` defines US consent, suppression, legal text, and retention controls.
9. `specs/launch-readiness/09-performance-offline-responsive-and-device-qa.md` defines performance budgets and offline/device QA launch gates.
10. `specs/launch-readiness/10-cicd-release-and-operations.md` defines CI/CD gates, release policy, and incident operations.
11. `specs/launch-readiness/11-api-and-schema-change-log.md` defines consolidated API/schema deltas, compatibility notes, and rollout sequencing.

---

## 10. Wave 1 Gate Checklist (Execution)

| Gate | Owner Role | Required Evidence | Status |
| --- | --- | --- | --- |
| Tenant authz hardening (`launch-readiness/01`) | Backend engineering + security reviewer | Route-family authz test results and scoped-query audit | Open |
| Auth/session hardening (`launch-readiness/02`) | Backend/frontend engineering + security reviewer | Magic-link, invite, callback, and org-switch test matrix | Open |
| Billing fail-closed and limits (`launch-readiness/03`) | Backend engineering + billing owner | Guard outage tests, override audit events, quota contract checks | Open |
| Data platform and migration safety (`launch-readiness/04`) | Platform engineering + DBA owner | RLS claim checks, migration dry-run evidence, backup/restore drill records | Open |
| Dialer reliability + webhook integrity (`launch-readiness/05`) | Backend/frontend engineering + telephony owner | State transition test matrix, Twilio replay/idempotency test evidence | Open |
| Enrichment/extension API compliance (`launch-readiness/06`) | Backend engineering + integrations owner | Vendor throttling tests, idempotency checks, org-scope test results | Open |
| Observability and support readiness (`launch-readiness/07`) | Platform engineering + support owner | SLO dashboard links, alert routing test evidence, support intake validation | Open |
| Legal and consent controls (`launch-readiness/08`) | Compliance owner + backend engineering | Consent/DNC enforcement tests, legal acceptance evidence, retention/legal-hold checks | Open |
| Performance/offline/device QA gates (`launch-readiness/09`) | Frontend engineering + QA owner | Budget reports, restricted-network build proof, responsive/device smoke results | Open |
| CI/CD and incident operations (`launch-readiness/10`) | Engineering productivity + on-call lead | Required GitHub Actions enabled, rollback drill evidence, runbooks published | Open |
| API/schema sequencing compliance (`launch-readiness/11`) | Tech lead + platform engineering | Release-batch mapping and migration compatibility checklist | Open |
| Regression confidence | QA owner | No open P0; P1 exceptions documented per charter policy | Open |
| Launch approval | Product + engineering + security | Signed record in Section 11 | Open |

## 11. Sign-Off Record (Wave 1)

| Function | Approver | Date | Decision | Notes |
| --- | --- | --- | --- | --- |
| Product | TBD | TBD | Pending |  |
| Engineering | TBD | TBD | Pending |  |
| Security | TBD | TBD | Pending |  |

---

## 12. Spec Sequencing Reference

1. `specs/launch-readiness/01-tenant-security-and-authz.md` and `specs/launch-readiness/02-auth-magic-link-and-session-hardening.md` establish security/session foundations.
2. `specs/launch-readiness/03-billing-limits-and-abuse-protection.md`, `specs/launch-readiness/05-dialer-reliability-and-state-model.md`, and `specs/launch-readiness/08-legal-and-consent-controls-us.md` are core launch-control enforcement layers.
3. `specs/launch-readiness/04-data-platform-rls-supabase-and-self-host.md` and `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md` define shared data/API contracts that must remain backward-compatible during rollout.
4. `specs/launch-readiness/07-observability-admin-analytics-and-support.md`, `specs/launch-readiness/09-performance-offline-responsive-and-device-qa.md`, and `specs/launch-readiness/10-cicd-release-and-operations.md` define operational gates and release confidence requirements.
5. `specs/launch-readiness/11-api-and-schema-change-log.md` is the canonical implementation sequence and compatibility ledger for all specs.
