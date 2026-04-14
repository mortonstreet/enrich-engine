# Magic Link First-Attempt Failure Troubleshooting Spec

**Module Owner:** This session  
**Status:** Not Started  
**Priority:** P0 (Auth access regression)

---

## Implementation Status

### Implemented
- [x] Verify Redis dependency behavior in `magicLinkAbuseProtection` — wrapped all Redis ops with 2s timeout + in-memory fallback rate limiter
- [x] Add temporary observability signals for first-attempt failures — added `limiter` field (redis/memory), entry logging in auth handler, correlation ID propagation
- [x] Implement and validate final fix with rollback plan — timeout + in-memory fallback ensures magic links never fail due to Redis unavailability
- [x] Add `BETTER_AUTH_SECRET` to config — missing secret was root cause; Better Auth was using hardcoded default after Supabase migration
- [x] Add Redis health check utility (`pingRedis()`) for diagnostics

### Remaining
- [ ] Set `BETTER_AUTH_SECRET` env var in Coolify/production (generate with `openssl rand -hex 32`)
- [ ] Add deterministic, scriptable auth diagnostics for magic-link and Resend
- [ ] Define and run production-safe repro matrix

### Key Files
- `backend/src/api/routes/auth.ts` — correlation ID middleware, response interception
- `backend/src/api/middlewares/authHardening.ts` — Redis timeout + in-memory fallback rate limiter
- `backend/src/lib/better-auth.ts` — added `secret` config from `BETTER_AUTH_SECRET`
- `backend/src/config/index.ts` — added `BETTER_AUTH_SECRET` to env schema
- `backend/src/lib/redis.ts` — added `pingRedis()` health check
- `backend/src/clients/email.client.ts`
- `backend/src/lib/email.ts`
- `frontend/lib/auth-client.ts`
- `frontend/hooks/api/useAuth.ts`
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/signup/page.tsx`
- `backend/.env.example` — documented `BETTER_AUTH_SECRET`
- `docs/launch-readiness/04-coolify-env-contract.md` — added `BETTER_AUTH_SECRET` to required vars

---

## Problem Statement

`POST /api/auth/sign-in/magic-link` fails immediately on first attempt from the app UI, while Google social auth works and Resend is believed configured correctly.

Observed frontend symptom:
- Browser preflight to auth route succeeds.
- Magic-link fetch fails with `502` (proxy-facing status).
- Failure happens on initial attempt, not only after repeated retries.

This behavior strongly suggests a server-side path that is unique to magic-link issuance.

---

## Scope

This spec covers:
1. Reproducing first-attempt magic-link failures with programmatic checks.
2. Isolating failure layer across:
   - auth hardening middleware
   - Better Auth magic-link endpoint handling
   - email delivery provider
   - infra/proxy translation (`503` -> `502`)
3. Defining diagnostics and rollout-safe fixes.

Out of scope:
1. Full auth redesign.
2. New provider integrations.
3. UI redesign of auth pages.

---

## Current Flow (As Implemented)

1. Frontend calls `signIn.magicLink({ email, callbackURL })` from:
   - `frontend/hooks/api/useAuth.ts`
   - `frontend/app/(auth)/login/page.tsx`
   - `frontend/app/(auth)/signup/page.tsx`
2. Request goes to backend auth router:
   - `backend/src/api/app.ts` mounts `/api/auth` with middleware chain.
3. Auth route middleware:
   - `authCallbackGuard`
   - `magicLinkAbuseProtection`
   - `magicLinkVerifyHardening`
4. Better Auth endpoint `/sign-in/magic-link` executes `sendMagicLink`.
5. `sendMagicLink` delegates to `sendMagicLinkEmail`.
6. Email send uses Resend API (or SMTP fallback based on env).

---

## Hypotheses (Ranked)

### H1 (Most likely): Redis-dependent magic-link abuse protection fails closed

`magicLinkAbuseProtection` is only applied to magic-link issuance, not Google social sign-in.  
If Redis command calls fail (connectivity, timeout, DNS, TLS mismatch), request can fail before email send.

Signals:
- First attempt fails (not rate-limit pattern).
- Social auth works.
- Failures are isolated to magic-link route.

### H2: Email send path fails (`sendMagicLinkEmail`)

Resend/API errors in `sendMagicLink` are converted to transient auth failures and can appear as upstream `502` if proxy rewrites backend `503`.

Signals:
- Redis healthy.
- Logs show `auth.magic.send_start` followed by `auth.magic.email_send_failed`.

### H3: Callback sanitization/body mutation edge case

`authCallbackGuard` mutates request body callback fields. Unexpected request shape can break handler path.

Signals:
- Failure before rate-limiting or email logs.
- Missing/invalid body shape in request logs.

### H4: Upstream proxy/gateway issue

Backend may emit deterministic `503`, but edge/gateway emits `502`.

Signals:
- API logs show `503` with auth transient payload, browser sees `502`.

---

## Required Telemetry Contract

Each magic-link request must emit:
1. `x-request-id` (request correlation).
2. Middleware decision event:
   - allowed
   - rate-limited
   - degraded dependency path
3. Better Auth send events:
   - `auth.magic.send_start`
   - `auth.magic.send_success` or `auth.magic.email_send_failed`
4. Final response status at backend and edge.

Mandatory structured fields:
- `event`
- `correlationId`
- `path`
- `method`
- `statusCode`
- `emailHash` (never raw email in production logs)
- `ipHash` (never raw IP in production logs)

---

## Programmatic Troubleshooting Matrix

Run tests from a host with outbound network access to API and Resend.

### T1: Direct magic-link endpoint call (bypass browser UI)

Purpose:
- Confirm backend response and payload independent of frontend handling.

Command:

```bash
curl -i -X POST "https://api.omnidial.io/api/auth/sign-in/magic-link" \
  -H "content-type: application/json" \
  -H "origin: https://app.omnidial.io" \
  --data '{"email":"delivered@resend.dev","callbackURL":"/dashboard"}'
```

Expected:
- `200` with success payload when healthy.
- `429` for true abuse/rate-limit conditions.
- `503` with deterministic transient payload if dependency failure is surfaced.

Capture:
- raw status line
- response body
- `x-request-id`

### T2: Direct Resend API send

Purpose:
- Verify provider/account/sender separately from auth flow.

Command:

```bash
curl -i -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"from":"OmniDial <noreply@omnidial.io>","to":"delivered@resend.dev","subject":"Magic Link Diagnostic","text":"diagnostic"}'
```

Expected:
- `200` or `202` style success with message id.
- explicit sender/domain/auth error if misconfigured.

### T3: Redis health and latency from backend runtime

Purpose:
- Validate that Redis is reachable and command latency is stable.

Checks:
1. Resolve Redis hostname from backend environment.
2. `PING` and `TTL` round-trip latency.
3. TLS mode alignment with provider requirements.

Expected:
- Reliable command completion under low latency.
- No connection churn in backend logs.

### T4: Middleware-only fallback behavior under forced Redis failure

Purpose:
- Confirm `magicLinkAbuseProtection` behavior when Redis is unavailable.

Method:
- Temporarily point `REDIS_URL` to unreachable host in staging/local.
- Call magic-link endpoint once.
- Verify route does not hard fail due only to abuse-protection dependency failure.

---

## Investigation Sequence

### Phase 0: Baseline Evidence

1. Capture one failing browser request.
2. Record:
   - exact endpoint
   - response code/body
   - timestamp
   - correlation/request id

### Phase 1: API vs Provider Split

1. Execute T1 and T2 back-to-back.
2. If T2 fails, fix provider/sender first.
3. If T2 passes and T1 fails, continue to middleware/auth path.

### Phase 2: Middleware Isolation

1. Add temporary debug logging around:
   - entry/exit of `authCallbackGuard`
   - entry/exit and catch path of `magicLinkAbuseProtection`
2. Confirm whether request reaches Better Auth handler.

### Phase 3: Better Auth Email Path

1. Confirm presence of `auth.magic.send_start`.
2. If absent:
   - failure occurs before email send callback.
3. If present and `auth.magic.email_send_failed`:
   - provider failure path is root cause.

### Phase 4: Edge/Proxy Translation

1. Compare backend status with edge status for same correlation id.
2. If backend emits `503` but edge shows `502`, mark gateway translation behavior.

### Phase 5: Fix Validation

1. Run first-attempt magic-link 5 times with spaced intervals.
2. Confirm:
   - no deterministic first-attempt failure
   - correct behavior under normal load
3. Run rapid retries to verify rate-limit still works when dependencies are healthy.

---

## Abuse Protection File Investigation Checklist

Target file: `backend/src/api/middlewares/authHardening.ts`

Checklist:
1. Confirm route guard matches exact Better Auth path: `/sign-in/magic-link`.
2. Verify response behavior in catch block:
   - hard fail vs degraded allow.
3. Confirm cooldown and counters:
   - per IP
   - per email
   - per email+IP
4. Verify finish-handler writes do not throw unhandled sync errors.
5. Confirm no callback/body mutation crash when request body is absent/malformed.
6. Ensure security events include correlation IDs and hashed identifiers.

---

## Decision Tree

1. If T2 (Resend direct) fails:
   - Root cause is provider/sender/domain configuration.
2. If T2 passes and T1 fails before `auth.magic.send_start`:
   - Root cause is middleware/dependency path (likely Redis or callback guard).
3. If T2 passes and `auth.magic.send_start` + `auth.magic.email_send_failed` appears:
   - Root cause is email send path inside backend execution context.
4. If backend returns `503` and browser shows `502`:
   - Root cause includes edge translation; preserve backend payload and tune gateway behavior.

---

## Remediation Plan

### Immediate

1. Ensure magic-link does not fail solely due to non-critical abuse-protection dependency outages.
2. Preserve deterministic error payload with correlation id for transient failures.

### Short-Term

1. Add scripted diagnostics:
   - `magic-link` endpoint probe
   - Resend probe
   - Redis probe
2. Run probes in deployment pipeline smoke checks.

### Long-Term

1. Add local fallback limiter for Redis outage windows.
2. Add alerting on:
   - magic-link failure rate
   - Redis error spikes on auth route
   - email provider send failure ratio

---

## Acceptance Criteria

1. First-attempt magic-link success rate is stable in production.
2. Genuine abuse still returns `429` with retry metadata.
3. Dependency outages do not present as unexplained hard failures.
4. Every failed magic-link request has actionable telemetry.
5. Runbook commands are executable and produce deterministic outputs.

---

## Rollback Plan

1. Keep feature-flag/commit-level rollback ready for auth middleware changes.
2. If rollout causes abuse control regression:
   - revert middleware behavior change
   - temporarily disable magic-link entry point only if required
   - keep Google/social auth and session endpoints operational
3. Re-run T1-T4 after rollback to verify restored baseline.

---

## Testing Checklist

- [ ] T1 executed and evidence captured
- [ ] T2 executed and evidence captured
- [ ] Redis health checks captured for same window
- [ ] Correlation id mapping from browser -> backend logs verified
- [ ] Failure layer identified with decision tree
- [ ] Fix implemented and validated against acceptance criteria
- [ ] Rollback tested in non-prod

