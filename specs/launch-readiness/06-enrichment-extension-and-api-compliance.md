# OmniDial Enrichment, Extension, and API Compliance Spec (Session B)

**Document ID:** `launch-readiness/06`  
**Status:** Draft (Wave 1 launch blocker + Wave 2 hardening split)  
**Scope:** Extension and enrichment flow contracts, vendor API compliance, caching policy, CRM push reliability  
**Primary Risks Addressed:** Org-context spoofing, vendor throttling failures, stale enrichment cache, partial CRM sync failures

---

## 1. Purpose

Define launch contracts for enrichment and extension operations that are safe, tenant-isolated, rate-limit compliant, and operationally predictable.

This spec covers:
1. 1-click and bulk enrichment/extension flow contracts.
2. Vendor API limit compliance, retry/backoff, and circuit breaker behavior.
3. Enrichment cache policy and invalidation rules.
4. CRM push safety, retries, and partial-failure behavior.

---

## 2. Current Baseline (Code-Verified)

1. Extension routes are defined in `backend/src/api/routes/extension.ts` and controllers in `backend/src/api/controllers/extension.controller.ts`.
2. Enrichment routes are defined in `backend/src/api/routes/enrichment.ts`.
3. Extension flow service exists in `backend/src/services/extension.service.ts`.
4. Enrichment orchestration exists in `backend/src/services/enrichment.service.ts`.
5. Cache repository is implemented in `backend/src/repositories/enrichmentCache.repository.ts` with current default TTL = 90 days.
6. Extension client currently sends `organizationId` in query/body (`extension/src/lib/api.ts`).
7. Shared request schemas currently include client-provided `organizationId` in:
- `shared/types/src/requests/extension.ts`
- `shared/types/src/requests/enrichment.ts`
- `shared/types/src/requests/crmSync.ts`
8. Some enrichment vendor mutation/read paths currently act by ID alone and require strict org-scoping alignment with Spec `01`.

---

## 3. Wave Split

## Wave 1 (Launch-Blocking)

1. Server-authoritative organization context for all extension/enrichment/CRM routes.
2. Deterministic 1-click and bulk flow contracts with standardized errors.
3. Vendor rate-limit/backoff/circuit-breaker baseline.
4. CRM push idempotency and retry safety.
5. Cache validity/invalidation rules and stale-data safeguards.

## Wave 2 (Hardening)

1. Adaptive vendor routing based on quality/latency/cost scoring.
2. Predictive prefetch and advanced cache warming.
3. Expanded bulk orchestration analytics and auto-remediation.

---

## 4. Organization Context and Authorization Contract

## 4.1 Source of Truth

1. `organizationId` must come from authenticated active org context on the server.
2. Client-supplied `organizationId` is treated as advisory and ignored for authorization.
3. Validation/parsing must enforce server precedence (`organizationId` injected last or overwrite after parse).

## 4.2 Route Family Rules

| Route Family | Required Org Source | Required Scope |
| --- | --- | --- |
| `/api/extension/*` | Session `activeOrganizationId` | Lead/client/campaign reads and writes scoped to org |
| `/api/enrichment/vendors/*` | Session `activeOrganizationId` | Vendor connection mutation by `id + org` |
| `/api/enrichment/leads/*` | Session `activeOrganizationId` | Lead enrichment/contact reads by `leadId + org` |
| `/api/extension/push-to-crm` | Session `activeOrganizationId` | CRM push target lead and integration both scoped to org |

## 4.3 Required API Behavior

1. Cross-org resource lookup returns `404` or `403` without disclosing existence.
2. Unauthorized vendor connection IDs must never return connection metadata.
3. Mutations must verify membership/role before external provider side effects.

---

## 5. 1-Click Extension Flow Contract

## 5.1 Canonical 1-Click Flow

1. `GET /api/extension/session`
2. `GET /api/extension/check-lead`
3. `POST /api/extension/enrich`
4. Optional `POST /api/extension/push-to-crm`

Behavior:
1. Flow is idempotent for repeated user clicks within short window.
2. Existing lead with usable phone/email returns success without forced re-enrichment unless explicit refresh requested.
3. Result must always include machine-parseable outcome fields:
- `success`
- `leadId`
- `enrichedBy`
- `errorCode` (when failed)
- `correlationId`

## 5.2 1-Click Idempotency

1. Generate idempotency key from:
- org
- normalized LinkedIn URL
- action type (`enrich` or `push_to_crm`)
- 5-minute bucket
2. Duplicate key returns previous terminal response.
3. In-progress duplicate returns `409` with `retryAfterMs`.

---

## 6. Bulk Enrichment Flow Contract

## 6.1 Input and Execution Rules

1. Bulk enrich request max batch size remains bounded (currently 100).
2. Execution uses per-org concurrency cap to avoid vendor/API bursts.
3. Partial success is expected and must not fail whole batch.

## 6.2 Response Contract

Bulk response must include:
1. `totalRequested`
2. `totalEnriched`
3. `totalFailed`
4. `totalCreditsUsed`
5. `results[]` with per-lead error codes and retryability
6. `correlationId`

## 6.3 Retry Semantics

1. Retry only failed leads with retryable errors.
2. Successful leads are excluded from retry batches by default.
3. Bulk retries must preserve original idempotency lineage metadata.

---

## 7. Vendor API Limit Compliance

## 7.1 Provider Policy Registry

Each vendor must define:
1. requests per second (RPS) limit.
2. burst limit.
3. daily credit ceiling (org and global).
4. retryable status/error classes.

## 7.2 Backoff Strategy

1. Exponential backoff with jitter for retryable failures (`429`, transient `5xx`, timeout).
2. Default retry schedule: `250ms`, `750ms`, `2s` (max 3 attempts) for interactive paths.
3. Bulk/async paths may use longer retry windows with queue-based scheduling.

## 7.3 Circuit Breaker Contract

State machine:
1. `closed` (normal)
2. `open` (requests blocked, fallback provider used)
3. `half_open` (limited probes)

Open triggers:
1. consecutive hard failures above threshold.
2. sustained rate-limit failures above threshold.

Half-open recovery:
1. limited trial requests.
2. return to closed only after success quorum.

## 7.4 Fallback Routing

1. If primary provider is open-circuit, route to next eligible provider by priority.
2. If no providers available, return structured retryable error and avoid silent success.
3. Provider failover events must be logged and exposed in admin analytics (Spec `07`).

---

## 8. Cache Policy and Invalidation Rules

## 8.1 Cache Identity

1. LinkedIn key: canonical normalized profile URL.
2. Fallback identity key: deterministic hash of identity fields.
3. Cache entries remain provider-specific to avoid provenance ambiguity.

## 8.2 TTL Policy

Wave 1 defaults:
1. Phone/email enrichment: 30 days.
2. Company/title/profile metadata: 90 days.
3. Negative lookup cache (no data found): 24 hours.

## 8.3 Invalidation Triggers

1. Explicit `forceRefresh=true`.
2. Manual lead field override by user (invalidate affected fields).
3. Vendor disconnect or credential rotation for that provider.
4. Compliance/legal deletion request for lead.

## 8.4 Anti-Stale Safeguards

1. Every cache-sourced response includes `cacheHit` and `cachedAt`.
2. Stale-but-usable cache may be returned only with `stale=true` flag for non-blocking fields.
3. Sensitive fields (phone/email used for dialing/CRM push) require freshness checks before critical actions.

---

## 9. CRM Push Safety and Partial-Failure Behavior

## 9.1 Idempotent Push Contract

1. Idempotency key: `(orgId, leadId, provider, payloadHash)`.
2. Duplicate push attempts must not create duplicate external records when prior success exists.
3. If external id is known, perform update/upsert path instead of create.

## 9.2 Retry Policy

1. Retryable provider failures retried with bounded backoff.
2. Permanent validation errors return non-retryable failure immediately.
3. Retry attempts include correlation and attempt counters for support triage.

## 9.3 Partial-Failure Handling

For bulk CRM push:
1. Return per-lead statuses (`success|failed|retrying`).
2. Persist failed subset for selective retry.
3. Do not roll back already successful external syncs.

## 9.4 Audit Requirements

Each push attempt must record:
1. actor user ID.
2. organization ID.
3. provider.
4. action (`create|update|skip_duplicate|failed`).
5. correlationId and external record reference when available.

---

## 10. API and Error Contract Standardization

## 10.1 Required Error Taxonomy

Minimum codes for these surfaces:
1. `ENRICHMENT_VENDOR_RATE_LIMITED`
2. `ENRICHMENT_VENDOR_UNAVAILABLE`
3. `ENRICHMENT_NOT_AUTHORIZED`
4. `ENRICHMENT_INVALID_INPUT`
5. `EXTENSION_CONTEXT_INVALID`
6. `CRM_PUSH_DUPLICATE`
7. `CRM_PUSH_PROVIDER_ERROR`

Each error response includes:
1. `code`
2. `retryable`
3. `userMessage`
4. `correlationId`

## 10.2 Quota and Usage Headers

For enrichment and CRM push endpoints, return:
1. `X-Quota-Limit`
2. `X-Quota-Remaining`
3. `X-Quota-Reset`

Contract aligns with Spec `03`.

---

## 11. Implementation Targets

Primary files:
1. `backend/src/api/routes/enrichment.ts`
2. `backend/src/api/routes/extension.ts`
3. `backend/src/api/controllers/extension.controller.ts`
4. `backend/src/services/enrichment.service.ts`
5. `backend/src/services/extension.service.ts`
6. `backend/src/services/crm.service.ts`
7. `backend/src/repositories/enrichmentCache.repository.ts`
8. `shared/types/src/requests/extension.ts`
9. `shared/types/src/requests/enrichment.ts`
10. `shared/types/src/requests/crmSync.ts`
11. `extension/src/lib/api.ts`

---

## 12. Test Requirements

1. Cross-org authorization tests for all extension/enrichment/CRM mutation routes.
2. 1-click idempotency tests for duplicate clicks/retries.
3. Bulk enrichment partial-failure and retry subset tests.
4. Vendor throttling simulation tests (`429` and transient `5xx`) with backoff/circuit-breaker behavior.
5. Cache hit/stale/invalidation tests for force refresh and manual field overrides.
6. CRM push duplicate/create/update path tests and retry behavior.
7. Structured error payload and quota header contract tests.

---

## 13. Definition of Done (Wave 1)

1. Server-side org context is authoritative across extension/enrichment/CRM flows.
2. Vendor API compliance controls (rate limit, backoff, circuit breaker) are enforced and observable.
3. Cache policy is deterministic, documented, and test-covered.
4. CRM push operations are idempotent with safe partial-failure handling.
5. API errors and quota responses follow standardized launch contract.

---

## 14. Dependencies and Cross-Spec Links

1. Charter and wave sequencing baseline: `specs/launch-readiness/00-launch-charter.md`.
2. Tenant authz model for scoped lookup and mutation paths: `specs/launch-readiness/01-tenant-security-and-authz.md`.
3. Shared quota/limit headers and billing enforcement behaviors: `specs/launch-readiness/03-billing-limits-and-abuse-protection.md`.
4. Dialer and legal compliance policies for enriched data used in calling: `specs/launch-readiness/05-dialer-reliability-and-state-model.md` and `specs/launch-readiness/08-legal-and-consent-controls-us.md`.
5. Support and vendor outage observability surfaces: `specs/launch-readiness/07-observability-admin-analytics-and-support.md`.
6. Consolidated API/type/schema change ledger: `specs/launch-readiness/11-api-and-schema-change-log.md`.
