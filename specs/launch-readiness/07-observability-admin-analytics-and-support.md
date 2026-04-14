# OmniDial Observability, Admin Analytics, and Support Spec (Session C)

**Document ID:** `launch-readiness/07`  
**Status:** Draft (decision-complete for Session C scope)  
**Scope:** Observability, support workflow, and launch alerting posture  
**Deployment Baseline:** Coolify/Hetzner-first

---

## 1. Purpose

Define launch-grade telemetry, admin analytics, and support workflows so production incidents are detected quickly, triaged consistently, and resolved with tenant-aware evidence.

This spec covers:
1. Structured logs, correlation IDs, and tenant/user tracing.
2. Admin analytics requirements for errors, billing, dialer health, and abuse signals.
3. In-app user feedback and support intake workflow.
4. Alert thresholds, escalation paths, and on-call response rules.

---

## 2. Current Baseline (Code-Verified)

1. Backend request logging exists with request ID generation in `backend/src/api/middlewares/requestLogger.ts`.
2. Async-local request context exists in `backend/src/lib/context.ts` and is injected into logs by `backend/src/lib/logger.ts`.
3. Backend error handling writes to structured logs, Sentry, and admin error log persistence in `backend/src/api/middlewares/errorHandler.ts` and `backend/src/services/errorLog.service.ts`.
4. Admin error triage endpoints already exist under `/api/admin/error-logs*` in `backend/src/api/routes/admin.ts`.
5. Admin log surfaces for calls/recordings/transcriptions/activity already exist under `/api/admin/logs/*` in `backend/src/api/routes/admin.ts`.
6. Alerting policy, SLO definitions, and support ticket intake are not yet codified for GA.

---

## 3. Wave Split

## Wave 1 (Launch-Blocking)

1. Enforce a mandatory log field contract for all backend events.
2. Define and instrument core SLIs/SLOs with a documented error-budget policy.
3. Implement actionable alert routes and escalation runbooks.
4. Ship support intake flow from in-app UI to admin triage queue.
5. Expose admin analytics dashboards for errors, billing state, dialer health, and abuse indicators.

## Wave 2 (Hardening)

1. Expand long-horizon analytics (cohort and trend segmentation).
2. Add automated anomaly detection and predictive alerting.
3. Add deeper per-feature observability for non-critical surfaces.

---

## 4. Logging and Correlation Contract

## 4.1 Mandatory Fields for Every Backend Log Event

All logs emitted via `logger.*` must include:
1. `timestamp` (ISO 8601 UTC).
2. `level` (`debug|info|warn|error`).
3. `message`.
4. `requestId` (required for request lifecycle logs).
5. `organizationId` when resolvable from session/resource context.
6. `userId` when authenticated.
7. `route` (normalized route pattern when request-scoped).
8. `eventType` (stable machine-readable key, e.g. `dialer.call.started`).
9. `correlationId` for cross-service workflows and webhooks.

## 4.2 Correlation Rules

1. `x-request-id` is source of truth for request scope.
2. Twilio/Stripe/Slack webhook handlers must bind `correlationId` to provider event IDs and local event IDs.
3. Async jobs and retries must preserve upstream correlation in downstream logs.
4. Frontend-initiated API calls must pass request IDs where available; backend still generates one if missing.

## 4.3 Redaction Rules

Sensitive data must never appear in plain logs:
1. Secrets/tokens/API keys/session cookies.
2. Full payment details.
3. Full transcript content in non-debug channels.
4. Full phone numbers in high-volume info logs.

Log only masked forms where needed:
1. Phone: `+1*******1234`.
2. Email: `j***@domain.com`.

---

## 5. SLI/SLO Framework

## 5.1 Core SLIs (Wave 1)

1. API availability: successful responses for non-4xx requests.
2. API latency: p50/p95/p99 by route group.
3. Auth success rate: magic link + session validation success/failure.
4. Billing guard reliability: `canMakeCall` outcome consistency and dependency failures.
5. Dialer setup success: Twilio capability token + call initiation + webhook completion chain.
6. Webhook processing reliability: accepted, validated, deduplicated, processed.

## 5.2 Wave 1 SLO Targets (30-day Window)

1. API availability (excluding planned maintenance): `>= 99.9%`.
2. Core API p95 latency (authenticated business routes): `<= 450ms`.
3. Twilio webhook processing success: `>= 99.95%`.
4. Billing guard decision availability: `>= 99.99%`.
5. P0 alert acknowledgment (first human response): `<= 10 minutes`.

## 5.3 Error Budget Policy

1. Budget breach on any launch SLO triggers release freeze for non-critical feature changes.
2. Budget burn rate > 2x planned over 6 hours triggers incident review and mitigation task force.
3. Two consecutive monthly breaches escalate to architectural hardening work in next sprint plan.

---

## 6. Admin Analytics Requirements

## 6.1 Analytics Surfaces

The admin UI must expose panels for:
1. Error analytics (existing error-log pipeline with enhanced slicing).
2. Billing and quota events (`accountStatus`, cap hits, guard denials, fallback behavior).
3. Dialer health (sessions started/active/failed, call completion funnel, abandoned call rates).
4. Abuse and security signals (rate-limit hits, auth anomalies, suspicious API key usage).

## 6.2 Minimum Dashboard Dimensions

Each analytics panel must filter by:
1. Time range.
2. Organization.
3. User (where relevant).
4. Route/product/category.
5. Status (`open|acknowledged|resolved` for triage-capable streams).

## 6.3 Mandatory Metrics and Events

1. `api.error.count` and `api.error.rate` by route.
2. `billing.guard.denied.count` by reason.
3. `billing.guard.error.count` (must trend to zero after fail-closed rollout).
4. `dialer.call.start.count`, `dialer.call.connected.count`, `dialer.call.completed.count`.
5. `webhook.twilio.validation.failed.count`.
6. `webhook.twilio.duplicate.count`.
7. `rate_limit.exceeded.count` by endpoint family.
8. `support.ticket.created.count` and SLA breach counters.

---

## 7. In-App Feedback and Support Workflow

## 7.1 Intake Requirements (Wave 1)

Authenticated app users must have an in-app support entry point with:
1. Category (`bug|billing|dialer|enrichment|account|other`).
2. Severity self-report (`low|medium|high|blocking`).
3. Free-text description.
4. Auto-captured diagnostics:
- `requestId` (latest active context if available).
- Browser/device metadata.
- Active organization and user IDs.
- Recent failing API route and status (if present).

## 7.2 Backend and Data Contract

1. Add `support_ticket` persistence model (tenant-scoped, auditable).
2. Add `/api/support/tickets` create/list/update endpoints.
3. Ticket lifecycle states: `new -> triaged -> in_progress -> waiting_on_customer -> resolved -> closed`.
4. Every status transition must record actor, timestamp, and note.

## 7.3 Admin Triage UX

1. Add admin queue with filters by status/severity/category/organization/age.
2. SLA timers must be visible per ticket.
3. Link tickets to related error logs by `requestId`/`correlationId`.
4. Allow escalation linkage to incident IDs from Spec `10`.

---

## 8. Alerting and Escalation Policy

## 8.1 Alert Severity

1. `P0`: customer-impacting outage, cross-tenant/security event, or legal/compliance risk.
2. `P1`: major degradation without total outage.
3. `P2`: partial issue with workaround.
4. `P3`: informational trend alert.

## 8.2 Initial Alert Thresholds (Wave 1)

1. API 5xx rate > 2% for 5 minutes on any critical route family.
2. Auth failure rate > 10% for 10 minutes with traffic above baseline.
3. Billing guard internal error count > 0 in 5-minute window (page immediately until fail-closed proven stable).
4. Twilio webhook signature validation failures > 5/minute for 10 minutes.
5. Parallel abandoned-call threshold breach against legal policy from Spec `08`.
6. Queue backlog for webhook processing > 5 minutes equivalent lag.

## 8.3 Escalation Path

1. P0:
- Primary on-call engineer page immediately.
- Secondary on-call page at +5 minutes if unacked.
- Engineering lead + product owner page at +10 minutes.
2. P1:
- Primary on-call page.
- Team channel escalation at +15 minutes.
3. P2/P3:
- Create ticket with owner and due date, no paging by default.

---

## 9. Operational Readiness Checklist (Session C / Spec 07)

1. Log field contract documented and linted in code review checklist.
2. Correlation IDs verified across request lifecycle and webhook handlers.
3. SLO dashboards visible to engineering and support.
4. Alert thresholds configured with tested paging flow.
5. In-app support intake functional with ticket persistence.
6. Admin triage board supports status transitions and SLA views.
7. Runbook links embedded in admin and incident tooling.

---

## 10. Dependencies and Cross-Spec Links

1. Charter and wave policy baseline: `specs/launch-readiness/00-launch-charter.md`.
2. Billing limits and guard metrics: `specs/launch-readiness/03-billing-limits-and-abuse-protection.md`.
3. Dialer reliability and webhook health signals: `specs/launch-readiness/05-dialer-reliability-and-state-model.md`.
4. Enrichment/extension vendor outage and retry visibility: `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md`.
5. Legal/consent policy alerts and compliance telemetry: `specs/launch-readiness/08-legal-and-consent-controls-us.md`.
6. CI/CD and incident execution requirements: `specs/launch-readiness/10-cicd-release-and-operations.md`.
7. Consolidated API/schema and sequencing ledger: `specs/launch-readiness/11-api-and-schema-change-log.md`.
