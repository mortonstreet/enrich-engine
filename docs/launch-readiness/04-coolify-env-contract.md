# Launch Readiness 04: Coolify Environment Contract

This document defines the required environment separation for `dev`, `stage`, and `prod`.

## 1. Environment Separation Rules

1. Use separate Coolify projects/environments for `dev`, `stage`, and `prod`.
2. Never reuse Postgres/Redis credentials across environments.
3. Frontend/runtime clients must not receive backend-only secrets.
4. Secrets are injected by Coolify or a secret manager only; no git-committed credentials.

## 2. Required Backend Variables

Minimum required variables per environment:

- Runtime: `PORT`, `NODE_ENV`, `DEPLOY_ENV`
- Routing: `BACKEND_URL`, `FRONTEND_URL`, `CORS_ORIGIN`, `COOKIE_DOMAIN`
- Postgres: `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE`, `DB_SSL_REJECT_UNAUTHORIZED`
- Redis: `REDIS_URL` (or `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD`)
- Security: `JWT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_TOKEN`, `ENCRYPTION_KEY`, `WEBHOOK_API_KEY`
- Billing/providers: Stripe + OAuth + provider keys used by enabled features
- Observability: BetterStack, Axiom, Sentry

Use `backend/.env.example` as the source template.

## 3. Deploy Environment Mapping

| DEPLOY_ENV | Intended Usage     | Migration Command                     |
| ---------- | ------------------ | ------------------------------------- |
| `dev`      | Local/dev stacks   | `pnpm --filter @shared/db db:migrate` |
| `stage`    | Staging validation | `pnpm --filter @shared/db db:deploy`  |
| `prod`     | Production         | `pnpm --filter @shared/db db:deploy`  |

Migration command misuse is blocked by `shared/db/scripts/guard-migration-mode.mjs`.

## 4. Stage/Prod Predeploy Gate

Before app rollout in `stage` or `prod`, run:

```bash
pnpm --filter @shared/db db:predeploy
```

This verifies:

1. Migration status (`db:status`).
2. RLS coverage/classification (`db:check:rls`).
3. Migration safety gates (`db:check:migration-safety`).
4. Required DB extensions (`db:check:extensions`).
5. RLS claim contract assertions (`db:check:rls-claims`).

## 5. Change Management

When adding a new table:

1. Add migration SQL.
2. Add RLS classification in `shared/db/prisma/rls-classification-overrides.json` if outside the baseline RLS migration.
3. Add/adjust RLS policies (or `no-rls` enablement).
4. Re-run `pnpm --filter @shared/db db:check:rls`.

## 6. Frontend Build Variables (Critical for Auth)

`NEXT_PUBLIC_*` values are compiled into the frontend bundle at build time. Setting them only as runtime env vars in Coolify does not update auth/API endpoints after build.

Required frontend build variables:

- `NEXT_PUBLIC_API_URL` (for example, `https://api.example.com/api`)
- `NEXT_PUBLIC_APP_URL` (for example, `https://app.example.com`)

Rules:

1. Configure these as **Build Variables** in Coolify for the frontend service.
2. Do not use `localhost` values in production builds.
3. Redeploy the frontend after changing any `NEXT_PUBLIC_*` value.
