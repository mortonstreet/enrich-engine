# Launch Readiness 04: Data Platform Runbook

Operational runbook for data platform/RLS/Supabase compatibility in Wave 1.

## 1. Topology Baseline (Wave 1)

1. Ingress: Coolify-managed proxy + TLS only.
2. Frontend: Next.js service on Coolify.
3. Backend API: Express service on Coolify, horizontally scalable.
4. Postgres: managed Postgres with PITR.
5. Redis: managed Redis with auth + TLS.
6. Storage: private S3-compatible bucket for exports/backups.

## 2. RLS and Tenant Isolation Controls

1. App-layer org authorization remains primary.
2. RLS remains defense-in-depth for Data API and service-role boundaries.
3. JWT claim contract for RLS:
   - required: `sub`, `org_id`, `role`
   - fallback: `app_metadata.org_id`
   - missing `org_id` must fail closed
4. New tables are blocked until RLS classification is documented and validated.

Validation commands:

```bash
pnpm --filter @shared/db db:check:rls
pnpm --filter @shared/db db:check:rls-claims
```

## 3. Migration Promotion Flow

1. `dev` only: `pnpm --filter @shared/db db:migrate`
2. `stage/prod` only: `pnpm --filter @shared/db db:deploy`
3. Required predeploy gate for `stage/prod`:

```bash
pnpm --filter @shared/db db:predeploy
```

If any check fails, block rollout.

## 4. Supabase Exit / Fallback Procedure

Trigger examples:

1. Sustained reliability incidents.
2. Provider limits affecting critical throughput.
3. Cost thresholds exceeded.

Execution sequence:

1. Freeze schema changes.
2. Take logical backup + WAL checkpoint at source.
3. Restore to Hetzner target Postgres.
4. Run migration parity check:

```bash
DEPLOY_ENV=stage pnpm --filter @shared/db db:predeploy
```

5. Switch `DATABASE_URL` and `DB_*` vars in staged rollout (`stage` then `prod`).
6. Run smoke validation before full traffic cutover.

Rollback window: first 60 minutes after cutover.

## 5. Backup, Restore, and DR Targets

1. RPO: <= 15 minutes.
2. RTO: <= 60 minutes.
3. Retention baseline:
   - daily: 14 days
   - weekly: 8 weeks
   - monthly: 6 months
4. Encrypt backups at rest with managed key rotation.

Restore drills:

1. Monthly stage restore from fresh production backup.
2. Quarterly point-in-time restore game day.
3. Validate row counts, billing integrity, call/webhook continuity.

## 6. Secrets and Rotation Ownership

Classes:

1. Platform: DB, Redis, JWT, cookie, webhooks.
2. Providers: Stripe, Twilio, Slack, CRM OAuth, enrichment APIs.
3. Internal encryption keys.

Rotation cadence:

1. High-risk auth/webhook/provider secrets: every 90 days.
2. DB/Redis credentials: every 180 days.
3. Immediate rotation on compromise suspicion.

Ownership minimum:

1. Assign primary + backup operator for each secret class.
2. Record rotation date, owner, incident/ticket reference.

## 7. Alerting Baseline

P0:

1. No valid backup point in last 24h.
2. DB connectivity outage > 2 minutes.

P1:

1. Migration failure in stage/prod (freeze release).

Required telemetry:

1. DB connection saturation.
2. Slow query/lock contention.
3. Replica lag (if enabled).
4. Backup success/failure and latest restorable point.
5. Redis timeout/error rate.
