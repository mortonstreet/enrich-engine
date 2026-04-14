# OmniDial API and Schema Change Log (Session D)

**Document ID:** `launch-readiness/11`  
**Status:** Draft (consolidated change ledger for launch execution)  
**Scope:** Canonical API/interface/schema deltas, compatibility policy, and rollout sequencing across specs `01`-`10`  
**Deployment Baseline:** Coolify/Hetzner-first  
**Last Updated:** February 12, 2026

---

## 1. Purpose

Provide one source of truth for:
1. Consolidated API and interface contract changes.
2. Required schema/data-model changes.
3. Backward compatibility expectations.
4. Implementation and migration sequencing across Wave 1 and Wave 2.

---

## 2. Scope and Rules

1. This file is authoritative for rollout ordering when specs disagree on sequence.
2. API/schema work must map back to spec requirements in `specs/launch-readiness/01-*` through `specs/launch-readiness/10-*`.
3. All Wave 1 changes follow additive-first migration rules; destructive cleanup is deferred.
4. Security/compliance controls fail closed when dependency state is unknown.

---

## 3. Consolidated API Contract Changes

| Area | Change | Type | Wave | Source Specs |
| --- | --- | --- | --- | --- |
| Tenant authz | Mandatory org-scoped helper usage for all user-facing ID lookups/mutations (`id + activeOrganizationId`) | Behavioral hardening (non-breaking if client contract unchanged) | Wave 1 | `01`, `06` |
| Session/auth | Auth callbacks must be allowlisted and normalized; magic-link replay/expiry returns deterministic error codes | Behavioral hardening | Wave 1 | `02` |
| Billing guard | `canMakeCall` and related entitlement checks fail closed on internal errors; structured `BILLING_GUARD_UNAVAILABLE` response | Behavioral hardening | Wave 1 | `03` |
| Quota limits | Standard quota headers on enforced endpoints: `X-Quota-Limit`, `X-Quota-Remaining`, `X-Quota-Reset` | Additive response metadata | Wave 1 | `03`, `06` |
| Error envelope | Standardized error payload for auth/billing/dialer/enrichment/compliance surfaces: `code`, `retryable`, `userMessage`, `correlationId` | Additive contract normalization | Wave 1 | `02`, `03`, `05`, `06`, `08` |
| Webhooks | Stripe and Twilio handlers require replay-safe processing and idempotency metadata; duplicate events return success/no side effects | Behavioral hardening | Wave 1 | `03`, `05` |
| Dialer lifecycle | Canonical call/session state transitions and terminal-state precedence; invalid transitions mapped to typed errors | Behavioral hardening | Wave 1 | `05` |
| Compliance API | Add `/api/compliance/*` consent/suppression endpoints and dialer policy-check preflight endpoint | Net-new API (additive) | Wave 1 | `08` |
| Legal acceptance | Add legal artifact acceptance endpoints and re-acceptance signaling fields | Net-new API (additive) | Wave 1 | `08` |
| Support intake | Add `/api/support/tickets` create/list/update surface with auditable transitions | Net-new API (additive) | Wave 1 | `07` |
| Admin analytics | Add/standardize telemetry and analytics events for billing, dialer, abuse, and compliance indicators | Additive telemetry contract | Wave 1 | `07`, `08` |
| Offline/perf | No breaking API versions; add release-gate metrics and deterministic degraded-mode behavior | Operational contract | Wave 1/Wave 2 | `09`, `10` |

---

## 4. Consolidated Schema and Data-Model Changes

| Entity / Change | Purpose | Migration Strategy | Wave | Source Specs |
| --- | --- | --- | --- | --- |
| `webhook_event_receipt` (provider + event key uniqueness) | Stripe/Twilio replay protection and idempotency audit | Add table + unique index; dual-write before strict dedupe enforcement | Wave 1 | `03`, `05` |
| Org-scoped index/constraint pass (`id + organizationId` and org join paths) | Enforce tenant-safe lookup performance and correctness | Additive indexes/FKs; no destructive drops in same release | Wave 1 | `01`, `04` |
| `support_ticket` and status-transition audit model | In-app support intake + admin triage lifecycle | Add table(s) and API read/write paths; backfill not required | Wave 1 | `07` |
| `lead_consent_status` | Runtime consent verdict source for calling/recording | Add table + strict org scoping | Wave 1 | `08` |
| `consent_event` immutable ledger | Compliance audit trail | Append-only table | Wave 1 | `08` |
| `suppression_entry` and `suppression_event` | DNC/suppression enforcement + evidence | Additive tables + enforcement reads at dial entry points | Wave 1 | `08` |
| Legal document version + acceptance record model | Versioned legal text acceptance evidence | Additive tables; preserve historical acceptance rows | Wave 1 | `08` |
| Org-level legal hold metadata | Retention/deletion hold enforcement | Additive table/columns; purge jobs must respect hold state | Wave 1 | `08` |
| Enrichment idempotency/cache metadata adjustments | 1-click/bulk retry and cache provenance | Add columns/table as needed; maintain backward-compatible reads | Wave 1 | `06` |
| Dialer session reconciliation metadata | Recovery and stale-state reconciliation | Additive columns for sync/version timestamps | Wave 1/Wave 2 | `05`, `09` |

---

## 5. Shared Types and Interface Deltas

1. Add mandatory org-scoped repository/service helper signatures for ID-based resources.
2. Standardize shared error envelope fields across all high-risk surfaces.
3. Introduce typed quota metadata contract and limit-exceeded payload shape.
4. Introduce typed webhook receipt metadata (`provider`, `eventKey`, `processStatus`, timestamps).
5. Introduce typed compliance verdict contract for dial preflight and recording eligibility.
6. Enforce typed admin-only feature flag contract for experimental/beta capability gating.
7. Preserve client request compatibility during transition where `organizationId` may still be present, but server auth context remains authoritative.

---

## 6. Backward Compatibility Policy

1. Additive-first schema policy is mandatory for Wave 1.
2. Existing clients remain supported while server transitions to authoritative org-context resolution.
3. Client-supplied `organizationId` fields may be accepted temporarily but must not authorize access; server value wins.
4. New error fields and quota headers are additive and should be ignored safely by old clients.
5. Any truly breaking API behavior change requires explicit versioning or controlled rollout gate with release approval.
6. Destructive schema cleanup (column/table drops, strict NOT NULL hardening after backfill) is deferred to post-GA releases.

---

## 7. Implementation and Migration Sequencing

## 7.1 Wave 1 Execution Order

1. **Foundation contracts:** shared error envelope, correlation IDs, org-scoped helper interfaces, and migration guardrails.
2. **Security/auth first:** implement specs `01` and `02` (org authz + magic-link/session hardening).
3. **Billing gate next:** implement spec `03` fail-closed guard and quota response normalization.
4. **Data and webhook durability:** implement required schema/index/idempotency changes from specs `04` and `05`.
5. **Extension/enrichment alignment:** implement spec `06` org-source-of-truth and idempotency contracts.
6. **Compliance controls:** implement spec `08` consent/suppression/legal acceptance and retention hold controls.
7. **Observability and support visibility:** implement spec `07` dashboards, alerting, support intake.
8. **Release enforcement:** implement specs `09` and `10` gates for performance/device QA and CI/CD promotion.

## 7.2 Suggested Release Batches

1. **Release A:** `01` + `02` + foundational shared types.
2. **Release B:** `03` + Stripe webhook receipt and billing quota headers.
3. **Release C:** `05` + Twilio webhook receipt + dialer state enforcement.
4. **Release D:** `06` + `08` API/schema rollouts (enrichment + compliance/legal controls).
5. **Release E:** `07` + `09` + `10` operational gates and monitoring hardening.

## 7.3 Post-GA (Wave 2) Sequencing

1. Perform destructive schema cleanup only after at least one stable release cycle with migration evidence.
2. Expand offline/PWA and advanced analytics after Wave 1 SLO stability.
3. Expand device/performance automation and runbook depth incrementally.

---

## 8. Cross-Spec Traceability Index

1. Charter and wave boundaries: `specs/launch-readiness/00-launch-charter.md`.
2. Security/authz and session foundations: `specs/launch-readiness/01-tenant-security-and-authz.md`, `specs/launch-readiness/02-auth-magic-link-and-session-hardening.md`.
3. Billing, dialer, enrichment API contracts: `specs/launch-readiness/03-billing-limits-and-abuse-protection.md`, `specs/launch-readiness/05-dialer-reliability-and-state-model.md`, `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md`.
4. Data platform and migration controls: `specs/launch-readiness/04-data-platform-rls-supabase-and-self-host.md`.
5. Observability, legal, performance, and release operations: `specs/launch-readiness/07-observability-admin-analytics-and-support.md`, `specs/launch-readiness/08-legal-and-consent-controls-us.md`, `specs/launch-readiness/09-performance-offline-responsive-and-device-qa.md`, `specs/launch-readiness/10-cicd-release-and-operations.md`.

---

## 9. Definition of Done for This Change Log

1. Every API/schema/interface delta in specs `01`-`10` is represented in Sections 3-5.
2. Backward compatibility rules are explicit and implementable.
3. Wave 1 and release-batch sequencing is unambiguous.
4. All launch-readiness specs cross-link back to this file for execution alignment.
