# OmniDial CI/CD, Release, and Operations Spec (Session C)

**Document ID:** `launch-readiness/10`  
**Status:** Draft (decision-complete for Session C scope)  
**Scope:** CI quality gates, release promotion model, rollback strategy, incident runbooks, launch sign-off  
**Deployment Baseline:** Coolify/Hetzner-first

---

## 1. Purpose

Define the minimum production-ready engineering operations framework for safe and repeatable releases.

This spec defines:
1. Required GitHub Actions workflows and merge gates.
2. Environment promotion strategy (dev/stage/prod).
3. Rollout, rollback, and migration safety controls.
4. Incident runbooks for critical service categories.
5. Production launch readiness checklist and sign-off template.

---

## 2. Current Baseline (Code-Verified)

1. `.github` currently contains only Dependabot configuration.
2. Workspace uses `pnpm`, `nx`, and separate `backend`, `frontend`, `extension`, `shared/*` packages.
3. Root scripts provide `tsc`, `lint`, and `build` orchestration.
4. No required CI checks currently block merges.
5. No formal release promotion or rollback process is codified.

---

## 3. Wave Split

## Wave 1 (Launch-Blocking)

1. Add required CI workflows for typecheck/lint/build/security/migration safety.
2. Enforce branch protection with required status checks.
3. Define release promotion path and manual approval gates.
4. Define rollback procedures and incident response runbooks for critical outages.
5. Ship launch checklist and sign-off process with named owners.

## Wave 2 (Hardening)

1. Add deeper test automation (integration/e2e/perf).
2. Add progressive delivery automation and canary analysis.
3. Expand disaster-recovery drills and game-day program.

---

## 4. Required GitHub Actions Workflows

All workflows below are required on pull requests to protected branches.

## 4.1 `ci-validate.yml` (Core Quality)

Triggers:
1. `pull_request`.
2. `push` to `main` and release branches.

Jobs:
1. Install dependencies (`pnpm install --frozen-lockfile`).
2. Type checks:
- `pnpm tsc`.
3. Tests (workspace baseline):
- `pnpm -r test --if-present`.
4. Lint:
- `pnpm lint`.
5. Build:
- `pnpm build`.
6. Validate extension type safety:
- `pnpm --filter extension tsc`.

Gate result:
1. Any failure blocks merge.

## 4.2 `ci-security.yml` (Security and Dependency Risk)

Jobs:
1. Dependency audit (high/critical threshold).
2. Secret scanning on diff.
3. Optional SAST static scan for TS/JS baseline rules.

Gate result:
1. High/critical unresolved findings block merge unless approved exception attached.

## 4.3 `ci-test-matrix.yml` (Expanded Test Matrix)

Jobs:
1. API unit/integration tests (when present).
2. Frontend component/integration tests (when present).
3. Route-level smoke tests for critical auth/billing/dialer paths.

Gate result:
1. Any failing declared test job blocks merge.

## 4.4 `ci-migrations.yml` (Schema/Migration Safety)

Jobs:
1. Detect migration changes under `shared/db/prisma/migrations`.
2. Validate Prisma schema formatting/generation.
3. Execute dry-run migration check against ephemeral DB.
4. Ensure backward-compatible migration rules:
- Additive-first.
- No destructive drop without explicit two-phase plan.

Gate result:
1. Failed migration checks block merge.

## 4.5 `ci-performance-smoke.yml` (Wave 1 Minimum)

Jobs:
1. Build and run minimal performance smoke for key frontend route(s).
2. Run lightweight API latency smoke checks on core endpoints.

Gate result:
1. Severe regression threshold breaches block merge.

## 4.6 `release-deploy.yml` (Promotion Pipeline)

Triggers:
1. Manual dispatch.
2. Tag-based release.

Jobs:
1. Build immutable artifacts.
2. Deploy to stage.
3. Run post-deploy smoke suite.
4. Manual approval.
5. Deploy to prod.
6. Post-prod health + rollback guard check.

---

## 5. Branch Protection and Merge Policy

Required settings:
1. Protected `main` branch.
2. Required checks:
- `ci-validate`.
- `ci-test-matrix`.
- `ci-security`.
- `ci-migrations`.
- `ci-performance-smoke`.
3. Require up-to-date branch before merge.
4. Disallow direct pushes to `main`.
5. At least one code owner approval for backend and frontend changes.
6. Required explicit approval from security owner when auth/billing/compliance files change.

---

## 6. Release Promotion Model (Dev -> Stage -> Prod)

## 6.1 Environment Roles

1. `dev`: rapid integration/testing.
2. `stage`: production-like validation with smoke/regression suite.
3. `prod`: customer-facing environment.

## 6.2 Promotion Rules

1. All prod deploys must originate from artifact already validated in stage.
2. No environment-specific rebuild between stage and prod.
3. Migrations run in stage before prod promotion.
4. Prod promotion requires manual approval from:
- Engineering owner.
- Product owner.
- On-call lead (or delegate).

## 6.3 Rollout Strategy

1. Prefer phased deployment (single instance then full pool).
2. Monitor key health metrics for 15-30 minutes before full rollout completion.
3. Auto-halt rollout on P0 trigger conditions.

---

## 7. Rollback and Migration Safety

## 7.1 Rollback Principles

1. Fast rollback path must exist for app layer independent of DB rollback.
2. Database changes follow expand-migrate-contract pattern.
3. Destructive schema changes require delayed cleanup release, never same release as reader/writer cutover.

## 7.2 Rollback Triggers

Immediate rollback when:
1. API 5xx spikes above P0 threshold.
2. Login/session failures prevent user access.
3. Billing guard or call permission behavior is incorrect.
4. Twilio webhook processing fails persistently.

## 7.3 Required Rollback Procedure

1. Freeze deploy pipeline.
2. Revert to previous known-good artifact.
3. Run health checks:
- `/api/health`.
- Auth session check.
- Dialer token endpoint.
- Billing usage endpoint.
4. If migration introduces incompatibility, apply pre-tested fallback or compatibility patch release.

---

## 8. Incident Runbooks (Wave 1 Required)

Each runbook must include:
1. Detection signal.
2. Immediate containment steps.
3. Customer impact assessment.
4. Recovery actions.
5. Verification checks.
6. Post-incident follow-up template.

## 8.1 Auth Incident Runbook

Scope:
1. Magic-link delivery failure.
2. Session creation/validation outage.
3. Wrong-org session context behavior.

Primary checks:
1. Better-auth service health and database connectivity.
2. Email provider health for magic links.
3. Session cookie/CORS behavior in production domains.

## 8.2 Billing Incident Runbook

Scope:
1. Incorrect call allows/denies.
2. Usage sync failures (Redis/Postgres drift).
3. Stripe webhook processing lag/failure.

Primary checks:
1. `canMakeCall` decision metrics.
2. Redis and DB health.
3. Stripe webhook queue and signature validation.

## 8.3 Dialer Incident Runbook

Scope:
1. Call setup failures.
2. Session state inconsistencies.
3. Parallel/power dialer progression failures.

Primary checks:
1. Twilio capability token generation.
2. Dialer route health.
3. Active session data consistency.

## 8.4 Webhook Incident Runbook

Scope:
1. Twilio/Stripe/Slack webhook failures.
2. Signature validation failure spikes.
3. Replay/idempotency drift.

Primary checks:
1. Raw body capture correctness.
2. Signature secret validity.
3. Duplicate-event suppression behavior.

## 8.5 Enrichment Incident Runbook

Scope:
1. Vendor API outage/latency spikes.
2. Enrichment queue backlog.
3. CRM push partial failures.

Primary checks:
1. Provider-level error rates.
2. Retry and backoff behavior.
3. Fallback provider routing.

---

## 9. Operational Ownership and Escalation

1. Define on-call rotation and backup owner.
2. Document service owners for:
- Auth.
- Billing.
- Dialer/webhooks.
- Enrichment.
3. P0 incidents require engineering lead and product lead notification within 10 minutes.
4. All P0/P1 incidents require incident record and postmortem.

---

## 10. Production Readiness Checklist (Launch Gate)

All items required for GA sign-off:
1. Required CI workflows enabled and enforced in branch protection.
2. All critical runbooks published and linked in on-call docs.
3. Stage environment matches production topology and env policy.
4. Rollback tested in stage with at least one drill.
5. Migration checks validated on representative dataset snapshot.
6. Alerting for auth/billing/dialer/webhooks/enrichment verified.
7. P0/P1 escalation contacts and rotation published.
8. Launch review meeting completed with explicit go/no-go record.

---

## 11. Launch Sign-Off Template

Use this template for final launch approval:

1. `Release ID`:
2. `Date (UTC)`:
3. `Build artifact SHA`:
4. `Migration set`:
5. `CI checks passed` (`yes/no`):
6. `Stage validation completed` (`yes/no`):
7. `Rollback plan validated` (`yes/no`):
8. `Open P0 issues`:
9. `Open P1 issues and approved mitigations`:
10. `Approvers`:
- Engineering Owner:
- Product Owner:
- Security/Compliance Owner:
- On-Call Owner:
11. `Decision`: `GO` or `NO-GO`.

---

## 12. Dependencies and Cross-Spec Links

1. Charter and launch-governance policy: `specs/launch-readiness/00-launch-charter.md`.
2. Observability signals and alert thresholds: `specs/launch-readiness/07-observability-admin-analytics-and-support.md`.
3. Legal/compliance-critical controls and incident implications: `specs/launch-readiness/08-legal-and-consent-controls-us.md`.
4. Performance/offline/device QA gates integrated into CI: `specs/launch-readiness/09-performance-offline-responsive-and-device-qa.md`.
5. Service behavior validated by release gates: `specs/launch-readiness/01-tenant-security-and-authz.md` through `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md`.
6. Consolidated interface/schema rollout ordering and compatibility notes: `specs/launch-readiness/11-api-and-schema-change-log.md`.
