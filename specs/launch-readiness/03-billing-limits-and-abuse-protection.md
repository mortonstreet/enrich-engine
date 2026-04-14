# Billing, Limits, and Abuse Protection Spec (Session A)

**Document ID:** `launch-readiness/03`  
**Status:** Draft (Wave 1 launch blocker)  
**Primary Risks Addressed:** Fail-open billing guard, quota bypass, webhook replay, abusive automation

---

## 1. Scope

This spec defines:
1. Billing account state machine and call permission behavior.
2. Fail-closed billing guard policy with narrowly scoped emergency override.
3. Launch tier limits for dialing, enrichment, API key use, and extension actions.
4. Abuse controls and replay protection for billing-relevant flows.

---

## 2. Current Risk Summary

Observed in `backend/src/services/usageGuard.service.ts`:
1. Guard currently catches internal errors and allows calls (`fail open`).
2. This behavior can permit paid usage bypass during Redis/DB errors.

Wave 1 requires fail-closed default for all non-superadmin call permission decisions.

---

## 3. Billing State Machine

## 3.1 States

1. `active`
2. `grace_period`
3. `suspended`
4. `canceled`
5. `no_subscription` (derived, not persisted state)
6. `unknown_error` (derived guard outcome)

## 3.2 Call Permission Rules

| State | Manual Dial | Power Dial | Parallel Dial | API-triggered Call | Behavior |
| --- | --- | --- | --- | --- | --- |
| `active` | allow | allow | allow | allow | Normal quota enforcement |
| `grace_period` | allow | allow | allow with stricter thresholds | allow | Warn user and monitor abuse |
| `suspended` | deny | deny | deny | deny | Hard block |
| `canceled` | deny | deny | deny | deny | Hard block |
| `no_subscription` | deny | deny | deny | deny | Hard block |
| `unknown_error` | deny | deny | deny | deny | Fail-closed safety |

---

## 4. Guard Decision Algorithm (Fail-Closed)

## 4.1 Required Behavior

1. Superadmin bypass remains explicit.
2. For non-superadmin users:
- If guard cannot confidently evaluate entitlement, return deny.
3. Guard failures return structured error:
- `code: BILLING_GUARD_UNAVAILABLE`
- `retryable: true`
- `httpStatus: 503`
- `correlationId`

## 4.2 Removal of Fail-Open Path

Replace current behavior:
1. Remove "allow on exception" fallback in `usageGuard.service.ts`.
2. Any Redis/DB/error-path ambiguity resolves to deny.

---

## 5. Emergency Override (Narrowly Scoped)

## 5.1 Principles

1. Override exists for incident mitigation only.
2. Must never be a silent global bypass.

## 5.2 Required Controls

1. Scoped override object fields:
- `organizationId`
- `optional userId`
- `reason`
- `incidentId`
- `approvedBy`
- `expiresAt` (max 120 minutes)
2. Every override decision must emit an audit event.
3. Expired overrides are ignored automatically.

## 5.3 Disallowed

1. Permanent overrides.
2. Unattributed overrides with no approver/reason.
3. Global env bypass with no TTL and no audit.

---

## 6. Launch Tier Limits (Wave 1 Defaults)

These limits are launch defaults and may be tuned in Wave 2 after usage telemetry.

| Capability | Starter | Pro | Enforcement Surface |
| --- | --- | --- | --- |
| Included minutes / cycle | 500 | 1000 | Existing usage cycle config |
| Daily call attempts / user | 150 | 300 | Guard + daily counter |
| Parallel lines / active session | 2 | 5 | Session start + dial checks |
| Active API keys / org | 5 | 20 | API key create guard |
| API key request rate / key | 120/min | 300/min | API key middleware rate limit |
| Enrichment requests / org / day | 500 | 2000 | Enrichment quota guard |
| Extension enrich actions / user / day | 200 | 1000 | Extension endpoint guard |
| CRM push actions / org / day | 1000 | 5000 | CRM/extension quota guard |

---

## 7. Quota and Limit Response Contract

When blocked by limits, APIs must return:
1. HTTP `402`, `403`, or `429` as applicable.
2. Standardized payload:
- `code`
- `retryable`
- `userMessage`
- `correlationId`
- `limit`
- `used`
- `resetAt` (if known)
3. Standard headers:
- `X-Quota-Limit`
- `X-Quota-Remaining`
- `X-Quota-Reset`

---

## 8. Abuse Controls

## 8.1 Dialing Abuse Detection

1. Trigger anomaly events for:
- Rapid spikes in attempts/user/min
- Repeated blocked calls after suspension
- Cross-IP bursts for same user/org
2. Auto-actions:
- Temporary throttle increase
- Soft lock on high-risk actor
- Alert to admin analytics stream

## 8.2 API Key Abuse Detection

1. Detect unusual endpoint spread or sudden request spikes.
2. Auto-revoke optional policy for severe abuse with owner notification.

## 8.3 Extension Abuse Detection

1. Detect automation-like enrich bursts and CRM push floods.
2. Enforce per-user and per-org daily caps with progressive backoff.

---

## 9. Webhook Replay Protection (Billing-Relevant)

Applies to Stripe billing webhooks (`backend/src/api/routes/webhooks/stripe.ts`):

1. Keep signature verification mandatory.
2. Add idempotency/replay store keyed by Stripe `event.id`.
3. If event already processed:
- return `200` without reapplying side effects.
4. Persist processing outcome and timestamp for audit/debug.

Suggested schema:
1. `webhook_event_receipt`
- `provider`
- `eventId`
- `processedAt`
- `status`
- `hash`
- unique index on `(provider, eventId)`

---

## 10. State Sync Requirements

When subscription state changes via webhook:
1. Persist subscription state in Postgres.
2. Sync Redis org status and `can_call` flags immediately.
3. Avoid stale `active` cache allowing post-suspension calling.

---

## 11. Implementation Targets (Wave 1)

Primary files:
1. `backend/src/services/usageGuard.service.ts`
2. `backend/src/services/usageTracking.service.ts`
3. `backend/src/api/routes/webhooks/stripe.ts`
4. `backend/src/api/controllers/dialer.controller.ts`
5. `backend/src/services/parallelDialer.service.ts`
6. `backend/src/api/routes/enrichment.ts`
7. `backend/src/api/routes/extension.ts`

Required outcomes:
1. No fail-open billing path in production.
2. Unified quota response payload + headers.
3. Tier limits enforced at decision points.
4. Replay-safe Stripe webhook handling.

---

## 12. Test Requirements

1. Guard state matrix tests for all states in Section 3.
2. Redis outage + DB outage guard behavior (must deny for non-superadmin).
3. Emergency override tests:
- valid scoped override allows
- expired/invalid override denies
4. Tier limit tests:
- dialing
- enrichment
- API key traffic
- extension actions
5. Stripe webhook replay tests:
- first event applies
- duplicate event is idempotent no-op

---

## 13. Definition of Done (Wave 1)

1. Billing entitlement checks are fail-closed and tested.
2. Emergency override is scoped, TTL-bound, and fully audited.
3. Tier limits and abuse controls are enforceable and observable.
4. Webhook replay cannot duplicate billing side effects.

---

## 14. Dependencies and Cross-Spec Links

1. Charter and Wave cut line: `specs/launch-readiness/00-launch-charter.md`.
2. Org-scoped authorization requirements for guarded resources: `specs/launch-readiness/01-tenant-security-and-authz.md`.
3. Auth/session invariants and lockout behavior feeding guard context: `specs/launch-readiness/02-auth-magic-link-and-session-hardening.md`.
4. Enrichment, extension, and API key quota contract alignment: `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md`.
5. Observability metrics and alert thresholds for guard failures: `specs/launch-readiness/07-observability-admin-analytics-and-support.md`.
6. Consolidated schema/API changes and rollout sequence: `specs/launch-readiness/11-api-and-schema-change-log.md`.
