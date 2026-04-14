# OmniDial Data Platform, RLS, Supabase, and Self-Host Spec (Session B)

**Document ID:** `launch-readiness/04`  
**Status:** Draft (Wave 1 launch blocker + Wave 2 hardening split)  
**Deployment Baseline:** Coolify/Hetzner-first  
**Primary Risks Addressed:** Data-plane misconfiguration, weak tenant isolation assumptions, migration/backup gaps, secret sprawl

---

## 1. Purpose

Define the launch production data platform contract for:
1. Coolify/Hetzner-first deployment topology.
2. Supabase compatibility and fallback/exit path.
3. RLS posture and JWT claim requirements.
4. Migration, backup, restore, and disaster-recovery runbooks.
5. Secrets and key management baseline.

This spec is decision-complete for launch-readiness execution and explicitly avoids a platform rewrite.

---

## 2. Current Baseline (Code-Verified)

1. Backend data access is mixed Kysely + Prisma in `backend/src/lib/db.ts`.
2. Supabase pooler compatibility is already coded by rewriting pooler hosts to session mode (`:5432`) in `backend/src/lib/db.ts`.
3. Prisma migration source-of-truth exists in `shared/db/prisma/migrations` with deploy script `pnpm --filter @shared/db db:deploy`.
4. RLS migration already exists in `shared/db/prisma/migrations/20260207000000_add_row_level_security/migration.sql`, including helper claim functions and per-table policies.
5. Current backend runtime connects as a privileged DB role that can bypass RLS; app-layer authz remains mandatory.

---

## 3. Production Topology (Coolify/Hetzner-First)

## 3.1 Wave 1 Target Topology

| Layer | Primary Choice | Launch Requirement |
| --- | --- | --- |
| Ingress | Coolify managed reverse proxy + TLS | HTTPS only, HSTS, request size/time limits |
| Frontend | Next.js service on Coolify | Health checks + zero-downtime deploy |
| Backend API | Express service on Coolify | Horizontal scaling ready, sticky session not required |
| Postgres | Managed Postgres (primary + replica) on Hetzner or equivalent | PITR-capable backups, TLS-in-transit, restricted network |
| Redis | Managed Redis with auth + TLS | Rate limiting, caching, queue reliability |
| Object Storage | S3-compatible bucket (for exported artifacts/backups) | Private-by-default, lifecycle retention |

## 3.2 Network and Access Controls

1. Backend must only connect to Postgres/Redis on private network paths.
2. Postgres must deny public access except explicitly allowlisted bastion/admin paths.
3. DB/admin credentials must never be present in frontend or extension runtime.
4. Coolify project-level environment separation is required: `dev`, `stage`, `prod`.

## 3.3 Wave 2 Hardening

1. Read replica routing for analytics-heavy queries.
2. Backup copy validation across storage classes/regions.
3. Automated chaos drills for DB failover and Redis outage scenarios.

---

## 4. Tenant Isolation and RLS Posture

## 4.1 Defense-in-Depth Model

1. App-layer org authorization from `activeOrganizationId` is always the primary control (Spec `01`).
2. DB-layer RLS is required as defense-in-depth for direct Data API access paths and future service-role boundaries.
3. Any conflict between app-layer and DB-layer assumptions must fail closed.

## 4.2 Required JWT Claim Contract for RLS

For any Supabase Data API usage with `authenticated` role, claims must include:
1. `sub` (user id).
2. `org_id` (active org context).
3. `role` (app role).
4. Optional `app_metadata.org_id` fallback only for backward compatibility.

If `org_id` is absent, RLS access must resolve to deny.

## 4.3 RLS Policy Requirements

1. Every tenant table must have explicit `SELECT/INSERT/UPDATE` policy scoped to org.
2. `anon` access is denied on all tenant tables.
3. Physical `DELETE` remains denied for tenant tables unless explicitly approved (soft-delete-first posture).
4. Join-scoped tables must inherit org ownership via parent relation policies.
5. New tables are blocked from production until RLS classification is documented:
`direct-org`, `nullable-org`, `join-org`, `user-scoped`, `no-rls`.

## 4.4 Backend Privileged Role Constraints

1. The backend privileged role may bypass RLS, so it is never a substitute for endpoint authz.
2. Any new direct SQL helper must include explicit org filter for tenant-owned reads/writes.
3. Privileged role usage in scripts/ops jobs must be audited with operator ID and purpose.

---

## 5. Supabase Compatibility and Fallback Path

## 5.1 Supported Runtime Modes

1. **Mode A (Default):** Self-hosted/managed Postgres on Hetzner with Coolify-hosted app services.
2. **Mode B:** Supabase-hosted Postgres + pooler + optional Data API paths.

Both modes must keep:
1. Identical Prisma schema/migrations.
2. Same API contracts and authz behavior.
3. No client-visible behavior differences for billing/dialer/enrichment flows.

## 5.2 Compatibility Requirements

1. Connection pooling limits must remain within provider constraints (already partially enforced in `backend/src/lib/db.ts`).
2. Interactive transaction paths must use session-mode compatible connections.
3. DB extensions required by schema must be validated in CI pre-deploy checks.
4. Auth/session tables managed by Better Auth must remain migration-compatible across both modes.

## 5.3 Fallback / Exit Procedure

If Supabase reliability, limits, or costs breach thresholds:
1. Freeze schema changes.
2. Take logical backup + WAL checkpoint.
3. Restore into Hetzner target Postgres.
4. Run migration parity check.
5. Switch `DATABASE_URL` + `DB_*` envs through staged rollout.
6. Validate via smoke tests before full traffic cutover.

Rollback trigger window: first 60 minutes after cutover.

---

## 6. Migration and Versioning Requirements

## 6.1 Source of Truth

1. Prisma migrations in `shared/db/prisma/migrations` are authoritative.
2. Ad-hoc production SQL is forbidden unless:
- Incident mitigation requires emergency action.
- SQL patch is back-ported into tracked migration immediately.

## 6.2 Promotion Flow

1. `dev`: `db:migrate` allowed.
2. `stage/prod`: `db:deploy` only.
3. Every deployment must run migration status check before app rollout.
4. Backward-compatible migration principle is mandatory for Wave 1:
- Additive schema first.
- App reads tolerate old/new columns during transition.
- Destructive drops deferred to later release window.

## 6.3 Required Safety Gates

1. Migration dry-run against production-like snapshot.
2. Lock-time estimation for each migration.
3. Index creation strategy for large tables (`CONCURRENTLY` where needed).
4. Automatic abort on failed migration with no app promotion.

---

## 7. Backup, Restore, and DR Runbooks

## 7.1 Launch Targets

1. **RPO:** <= 15 minutes.
2. **RTO:** <= 60 minutes for full API service restoration.

## 7.2 Backup Policy

1. Continuous WAL archiving (or provider-equivalent PITR).
2. Daily full base backup.
3. Retention:
- Daily: 14 days.
- Weekly: 8 weeks.
- Monthly: 6 months.
4. Backup encryption at rest with managed key rotation.

## 7.3 Restore Requirements

1. Monthly restore drill in stage from fresh production backup.
2. Quarterly game-day for point-in-time restore.
3. Restore validation checklist:
- Row counts for critical tables.
- Billing/subscription integrity.
- Recent call + webhook audit continuity.
- Extension/enrichment data integrity.

## 7.4 Incident Runbook Minimums

1. DB primary unavailable.
2. Corrupt migration applied.
3. Accidental destructive write.
4. Redis outage with billing guard + rate limiter impact.

---

## 8. Secrets and Key Management Baseline

## 8.1 Secret Classes

1. Platform secrets: DB, Redis, JWT, cookie, webhook verification.
2. Provider secrets: Stripe, Twilio, Slack, CRM OAuth, enrichment vendor keys.
3. Internal keys: encryption keys used for stored provider credentials.

## 8.2 Storage and Access Policy

1. Secrets must be injected through Coolify environment config or secret manager, never committed to git.
2. Principle of least privilege per service (frontend cannot access backend-only secrets).
3. Read access to production secrets limited to named operators with audit logs.
4. Emergency break-glass secret access must generate incident-linked audit trail.

## 8.3 Rotation Baseline

1. High-risk secrets (JWT/webhook/provider auth): rotate every 90 days or immediately on suspicion.
2. DB and Redis credentials: rotate every 180 days or during infra ownership changes.
3. Rotations must support zero-downtime overlap windows where possible.

---

## 9. Operational Metrics and Alerts (Data Platform)

Minimum required telemetry:
1. DB connection saturation.
2. Slow query rate and lock contention.
3. Replication lag (if replica enabled).
4. Backup success/failure and age of latest restorable snapshot.
5. Redis error/timeout rate.
6. Migration execution success/failure by release.

Alerting:
1. No valid backup point in last 24h = P0.
2. DB connectivity failure > 2 minutes = P0.
3. Migration failed in stage/prod = P1 with release freeze.

---

## 10. Implementation Targets

Primary files and systems:
1. `backend/src/lib/db.ts`
2. `backend/src/config/index.ts`
3. `shared/db/prisma/schema.prisma`
4. `shared/db/prisma/migrations/*`
5. Coolify environment configuration for `dev/stage/prod`
6. Ops runbooks under `docs/` or `specs/launch-readiness/10-*` linkage

---

## 11. Test Requirements

1. RLS claim tests: missing/wrong `org_id` must deny Data API access.
2. Authz penetration tests remain mandatory for backend privileged role paths (Spec `01`).
3. Migration smoke test on production-like snapshot each release.
4. Backup restore drill with documented timing vs RPO/RTO targets.
5. Secret rotation rehearsal in stage with no downtime.

---

## 12. Definition of Done (Wave 1)

1. Coolify/Hetzner topology is documented, provisioned, and validated.
2. Supabase compatibility and cutover fallback procedure are tested once in stage.
3. RLS claim contract is enforced and validated for Data API paths.
4. Migration safety gates are active for stage/prod promotion.
5. Backup + restore runbooks are executable and drill evidence is recorded.
6. Secret inventory and rotation ownership are explicitly assigned.

---

## 13. Dependencies and Cross-Spec Links

1. Charter and release wave boundaries: `specs/launch-readiness/00-launch-charter.md`.
2. Tenant authz app-layer requirements paired with DB-layer controls: `specs/launch-readiness/01-tenant-security-and-authz.md`.
3. Billing and webhook durability requirements for storage and replay records: `specs/launch-readiness/03-billing-limits-and-abuse-protection.md`.
4. CI migration safety and rollback gates: `specs/launch-readiness/10-cicd-release-and-operations.md`.
5. Canonical migration/interface sequencing reference: `specs/launch-readiness/11-api-and-schema-change-log.md`.
