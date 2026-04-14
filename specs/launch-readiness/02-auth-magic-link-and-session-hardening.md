# Auth, Magic Link, and Session Hardening Spec (Session A)

**Document ID:** `launch-readiness/02`  
**Status:** Draft (Wave 1 launch blocker)  
**Primary Risks Addressed:** Magic-link abuse, replay, org-context drift, callback poisoning, silent auth failures

---

## 1. Scope

This spec covers:
1. Magic-link login/signup/invite/onboarding flow hardening.
2. Anti-abuse controls for link issuance and consumption.
3. Session/org switching invariants.
4. Cookie, CORS, and callback safety baselines.
5. User-facing and telemetry behavior for high-risk edge cases.

---

## 2. Current Flow Summary (Observed)

1. Backend auth uses Better Auth (`backend/src/lib/better-auth.ts`) with magic-link plugin.
2. Auth endpoint is mounted at `/api/auth` with middleware rate limiting + lockout wrapper (`backend/src/api/app.ts`).
3. Frontend builds callback URLs from query params in:
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/signup/page.tsx`
4. Invitation acceptance and org activation happen in:
- `frontend/app/(auth)/accept-invitation/[id]/page.tsx`
5. Session includes `activeOrganizationId` and updates user `lastActiveOrganizationId` via DB hooks (`backend/src/lib/better-auth.ts`).

---

## 3. Target Security Invariants

1. Every authenticated request has one authoritative org context, derived from server session.
2. Callback URL targets are allowlisted and normalized; no untrusted redirect targets are accepted.
3. Magic links are one-time, short-lived, replay-safe, and abuse-limited by IP + email + user.
4. Invitation acceptance enforces email and org consistency server-side, not only client-side.
5. Session `activeOrganizationId` is always a current membership org (unless superadmin behavior is explicitly invoked).

---

## 4. Magic Link Flow Contract

## 4.1 Requesting a Magic Link

1. Normalize email (`lowercase`, trim).
2. Validate callback against allowlisted frontend origins and known path patterns.
3. Apply throttles:
- Per IP
- Per email
- Per `email + IP` combination
4. Apply resend cooldown to prevent rapid repeated sends.
5. Return generic success response to reduce account enumeration risk.

## 4.2 Consuming a Magic Link

1. Token must be single-use and expire at TTL.
2. On replay, return deterministic consumed-token error and deny session creation.
3. Record security event with correlation ID.
4. If token context includes invitation, enforce invitation/email coherence before org activation.

## 4.3 Invitation + Magic Link Combined Flow

1. Invited email mismatch blocks acceptance with explicit UX.
2. Consumed/expired invitation returns deterministic status and recovery action.
3. On successful accept, server sets active org to invitation org and confirms membership.

---

## 5. Anti-Abuse Controls (Wave 1)

## 5.1 Throttle Policy

Launch defaults:
1. Magic-link request per IP: `5 / 5 min`.
2. Magic-link request per email: `3 / 10 min`.
3. Magic-link request per email+IP: `3 / 10 min`.
4. Cooldown after send (same email): `60 sec`.

## 5.2 Lockout Policy

1. Soft lock (`15 min`) after repeated abusive attempts from same fingerprint.
2. Hard lock (`30 min`) after repeated soft-lock violations.
3. Lockout response must include retry-after and correlation ID.

## 5.3 Replay Handling

1. Replayed magic link yields `AUTH_TOKEN_CONSUMED`.
2. Expired link yields `AUTH_TOKEN_EXPIRED`.
3. Invalid signature yields `AUTH_TOKEN_INVALID`.
4. All replay/invalid attempts are telemetry events with actor fingerprint.

---

## 6. Session and Org Switching Hardening

## 6.1 Org Context Invariants

1. `activeOrganizationId` must be server-controlled and membership-validated.
2. On session create:
- If last active org is missing/invalid, select first valid membership org.
3. On org switch:
- Reject if user is not member of requested org.
- Update both session and user `lastActiveOrganizationId` only after validation.

## 6.2 Request Validation Invariants

1. For routes that inject orgId from session and parse request payload, server value must override client value.
2. Disallow client-only org IDs for privileged mutations.

## 6.3 Cookie/CORS Baseline

1. Keep `httpOnly`, `secure` (prod), and strict cookie domain policy.
2. Keep explicit trusted origins list in production; avoid wildcard in prod.
3. Require extension origin allowlist in production for extension traffic.
4. Enforce credentials mode and CSRF-safe auth routes.

---

## 7. Callback and Redirect Safety

1. Allow only relative callback paths from approved route set:
- `/dashboard`
- `/onboarding`
- `/accept-invitation/:id`
2. Reject absolute or protocol-relative callback inputs from user query params.
3. If callback is invalid, fallback to safe default (`/dashboard`) and log event.
4. Preserve invitation context only when invitation ID is valid and not expired.

---

## 8. Edge Case Matrix

| Scenario | Expected Behavior | User Message | Telemetry |
| --- | --- | --- | --- |
| Expired magic link | Deny sign-in | Link expired, request a new one | `auth.magic.expired` |
| Consumed magic link replay | Deny sign-in | Link already used | `auth.magic.replay` |
| Invalid/tampered token | Deny sign-in | Invalid link | `auth.magic.invalid` |
| Expired invitation | Deny acceptance | Invitation expired | `auth.invite.expired` |
| Already accepted invitation | Idempotent deny + redirect option | Already a member | `auth.invite.already_used` |
| Logged-in user email != invited email | Deny accept until account switched | Sign in with invited email | `auth.invite.email_mismatch` |
| Callback target not allowlisted | Replace with safe route | Redirected safely | `auth.callback.rejected` |
| Missing active org after auth | Recover to valid org or onboarding | Workspace selection required | `auth.session.org_recovered` |
| Silent provider/network failure | No ambiguous success state | Try again with correlation ID | `auth.failure.transient` |

---

## 9. Error Taxonomy (Auth Session Surface)

All auth/session errors should expose:
1. `code`
2. `retryable`
3. `userMessage`
4. `correlationId`

Initial codes:
1. `AUTH_TOKEN_EXPIRED`
2. `AUTH_TOKEN_CONSUMED`
3. `AUTH_TOKEN_INVALID`
4. `AUTH_RATE_LIMITED`
5. `AUTH_LOCKED`
6. `AUTH_INVITE_EMAIL_MISMATCH`
7. `AUTH_INVITE_INVALID`
8. `AUTH_CALLBACK_REJECTED`
9. `AUTH_ACTIVE_ORG_INVALID`

---

## 10. Implementation Targets (Wave 1)

Primary files:
1. `backend/src/lib/better-auth.ts`
2. `backend/src/api/app.ts`
3. `backend/src/api/middlewares/rateLimiterMiddleware.ts`
4. `backend/src/api/middlewares/accountLockout.ts`
5. `frontend/app/(auth)/login/page.tsx`
6. `frontend/app/(auth)/signup/page.tsx`
7. `frontend/app/(auth)/accept-invitation/[id]/page.tsx`

Required outcomes:
1. Server-side callback validation guard.
2. Per-email + per-IP throttles and cooldown for magic-link issuance.
3. Deterministic error mapping for all edge cases in Section 8.
4. Session org validation + recovery behavior on create/update.

---

## 11. Test Requirements

1. Magic-link lifecycle:
- valid
- expired
- replayed
- invalid token
2. Invite lifecycle:
- valid
- expired
- consumed
- wrong-email acceptance attempt
3. Callback safety:
- allowlisted path
- poisoned callback payload
4. Session org switching:
- valid membership switch
- invalid org switch
- stale last-active org recovery
5. Auth outage behavior:
- Redis/DB dependency degradation responses remain deterministic and safe.

---

## 12. Definition of Done (Wave 1)

1. No critical auth/session edge case remains ambiguous or silent.
2. Magic link abuse limits are enforced and observable.
3. Org context is server-authoritative across auth/session lifecycle.
4. All Section 11 tests are automated and passing.

---

## 13. Dependencies and Cross-Spec Links

1. Charter and launch severity policy: `specs/launch-readiness/00-launch-charter.md`.
2. Tenant authz model enforced after session resolution: `specs/launch-readiness/01-tenant-security-and-authz.md`.
3. Billing guard and quota errors that use shared error contract patterns: `specs/launch-readiness/03-billing-limits-and-abuse-protection.md`.
4. CI and incident response requirements for auth outages: `specs/launch-readiness/10-cicd-release-and-operations.md`.
5. Consolidated error taxonomy and rollout sequencing: `specs/launch-readiness/11-api-and-schema-change-log.md`.
