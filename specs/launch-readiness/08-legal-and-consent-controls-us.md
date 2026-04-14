# OmniDial Legal and Consent Controls (US) Spec (Session C)

**Document ID:** `launch-readiness/08`  
**Status:** Draft (decision-complete for Session C scope)  
**Scope:** US TCPA/state recording consent, DNC controls, legal text governance, retention/deletion/legal hold  
**Deployment Baseline:** Coolify/Hetzner-first

---

## 1. Purpose

Establish minimum legal and compliance controls required for US GA launch, with enforceable behavior in product workflows, auditable evidence, and operational guardrails.

This spec defines:
1. Calling and recording consent controls.
2. DNC/suppression lifecycle and enforcement.
3. Legal text/versioning requirements across web app and extension.
4. Data retention, deletion, and legal hold policy.

Note: This is a product-control spec, not legal advice.

---

## 2. Compliance Baseline and Scope

## 2.1 Jurisdictional Baseline

1. US TCPA controls are launch-blocking.
2. State-level call recording consent differences are launch-blocking.
3. Launch scope is US calling workflows (as represented in current product positioning).

## 2.2 Out of Scope for Wave 1

1. Non-US telephony compliance frameworks.
2. Vertical-specific regulatory programs beyond baseline telemarketing/call recording controls.
3. Automated legal decisioning beyond deterministic rule configuration.

---

## 3. Wave Split

## Wave 1 (Launch-Blocking)

1. Enforce consent state checks before dialing and recording.
2. Enforce org-level and lead-level suppression checks before call attempts.
3. Persist auditable consent/DNC events with actor and timestamp.
4. Version legal disclosures and collect acceptance references in app + extension.
5. Publish retention/deletion/legal hold operating rules and implementation contracts.

## Wave 2 (Hardening)

1. Expanded compliance automation and proactive anomaly warnings.
2. Advanced consent policy simulation and policy-diff tooling.
3. Jurisdiction expansion framework.

---

## 4. Consent Model (Calling and Recording)

## 4.1 Data Model Requirements

Add tenant-scoped compliance models:
1. `lead_consent_status`:
- `leadId`, `organizationId`, `callingConsentStatus`, `recordingConsentStatus`, `jurisdiction`.
- `source` (`web_form|verbal|import|manual_admin|api|unknown`).
- `capturedAt`, `expiresAt` (nullable), `capturedByUserId` (nullable), `evidenceRef`.
2. `consent_event` immutable ledger:
- `id`, `organizationId`, `leadId`, `callId` (nullable), `eventType`, `oldValue`, `newValue`, `actorType`, `actorId`, `requestId`, `createdAt`.

## 4.2 Consent States

Standardized states:
1. `unknown`.
2. `granted`.
3. `revoked`.
4. `denied`.
5. `expired`.

## 4.3 Enforcement Rules

1. Call initiation must check `callingConsentStatus` and suppression status before dialing.
2. Recording enablement must check `recordingConsentStatus` at call start.
3. If recording consent is missing/denied, recording must be disabled by default.
4. Manual override is admin-only, requires reason, and produces audit event.
5. Any policy evaluation failure must fail closed for call recording and outbound dialing.

---

## 5. TCPA and State Recording Launch Controls

## 5.1 Required Runtime Checks

Before outbound call start:
1. Verify lead is not suppressed.
2. Verify lead has callable consent status (`granted`).
3. Verify allowed contact window (org timezone policy + lead timezone when available).

Before recording:
1. Verify recording consent allows recording in applicable jurisdiction.
2. If two-party consent rule applies and explicit consent absent, disable recording and show UI warning.

## 5.2 Required UX Behaviors

1. Dialer UI must display a consent badge for selected lead.
2. Blocked calls must show deterministic reason code:
- `CONSENT_MISSING`
- `CONSENT_REVOKED`
- `DNC_SUPPRESSED`
- `QUIET_HOURS_RESTRICTED`
3. Recording toggle must display policy state and why recording is unavailable.

---

## 6. DNC and Suppression Workflows

## 6.1 Suppression List Model

Add canonical suppression entities:
1. `suppression_entry`:
- `organizationId`, `phoneE164`, `email` (nullable), `scope` (`org|global`), `reason`, `source`, `addedBy`, `createdAt`, `expiresAt` (nullable).
2. `suppression_event` immutable audit trail for create/update/remove actions.

## 6.2 Ingestion Sources

Suppression must be creatable from:
1. Manual lead action in app.
2. Call disposition flow (e.g., explicit do-not-call request).
3. CSV import/API ingest.
4. Admin enforcement actions.

## 6.3 Enforcement Points

Suppression checks are mandatory at:
1. Manual dial action.
2. Power dialer next-lead fetch/advance.
3. Parallel dial batch generation.
4. Extension click-to-call and enrich-to-call actions.
5. Campaign auto-dial scheduling jobs.

---

## 7. Legal Text and Versioning (App + Extension)

## 7.1 Versioned Legal Artifacts

Maintain versioned artifacts for:
1. Terms of Service.
2. Privacy Policy.
3. Calling/recording consent notice.
4. Extension privacy notice and consent disclosure.

Each legal artifact must include:
1. `documentType`.
2. `version`.
3. `effectiveAt`.
4. `hash` of published content.
5. `location` (URL/path).

## 7.2 Acceptance Tracking

Store acceptance records by user/session:
1. `userId`.
2. `organizationId`.
3. `documentType` + `version`.
4. `acceptedAt`.
5. `source` (`web_app|extension|api`).
6. `ipAddress` and `userAgent` (privacy-safe retention rules apply).

## 7.3 Existing Surface Alignment

Current static legal pages:
1. `frontend/app/terms/page.tsx`.
2. `frontend/app/privacy/page.tsx`.
3. `extension/PRIVACY_POLICY.md`.

Wave 1 must move from static-only text to version-linked acceptance records.

---

## 8. Data Retention, Deletion, and Legal Hold

## 8.1 Baseline Retention Policy (Default)

1. Call metadata: 24 months.
2. Call recordings/transcripts: 12 months default, configurable lower by org policy.
3. Consent and suppression audit events: minimum 24 months.
4. Security/error logs with identifiers: 90 days hot, 12 months cold archive.
5. Support tickets: 24 months.

## 8.2 Deletion Policy

1. User/org data deletion requests must create a deletion job record with status tracking.
2. Hard delete of legal/audit artifacts is disallowed while legal hold is active.
3. Deletion flow must preserve immutable compliance evidence where legally required.

## 8.3 Legal Hold Controls

1. Admin-only legal hold flag at org scope.
2. Hold reason, requester, and start/end timestamps required.
3. Hold suspends retention purges for affected records until lifted.
4. All hold create/update/release actions must be logged in audit trail.

---

## 9. Auditing and Evidence Requirements

Each compliance-critical action must produce immutable events:
1. Consent capture/update/revocation.
2. Suppression add/remove.
3. Dial attempt blocked by policy.
4. Recording disabled by policy.
5. Legal document acceptance.
6. Legal hold lifecycle actions.

Audit entries must include:
1. `organizationId`.
2. `actorId` or system actor.
3. `targetId` (lead/call/user).
4. `reasonCode`.
5. `requestId`/`correlationId`.
6. UTC timestamp.

---

## 10. Required API/Interface Changes (Wave 1)

1. Add compliance read/write endpoints under `/api/compliance/*` for consent and suppression operations.
2. Add policy-check endpoint for dialer preflight (used by web dialer and extension).
3. Extend call start contracts to include evaluated compliance verdict metadata.
4. Add standardized compliance error payload:
- `code`, `retryable`, `userMessage`, `correlationId`, `policyContext`.
5. Add legal acceptance endpoints and response fields indicating required document re-acceptance.

---

## 11. Testing and Verification Matrix

1. Outbound dial blocked when consent is missing/revoked.
2. Recording auto-disabled under two-party-consent rules without explicit consent.
3. DNC suppression blocks manual, power, and parallel dial workflows.
4. Extension call initiation respects same policy checks as core web app.
5. Consent and suppression events create immutable audit rows.
6. Legal text version bump forces fresh acceptance capture.
7. Deletion workflow respects active legal hold.

---

## 12. Operational Readiness Checklist (Session C / Spec 08)

1. Consent model implemented and enforced in call/recording paths.
2. Suppression checks active for all outbound dial entry points.
3. Legal artifact versioning and acceptance capture enabled.
4. Retention jobs and legal hold controls documented and tested.
5. Compliance audit exports available for incident/legal review.
6. Monitoring alerts configured for compliance policy-evaluation failures.

---

## 13. Dependencies and Cross-Spec Links

1. Charter and launch severity policy: `specs/launch-readiness/00-launch-charter.md`.
2. Dialer state transitions where compliance checks must run: `specs/launch-readiness/05-dialer-reliability-and-state-model.md`.
3. Extension/enrichment flows that initiate dial or data actions: `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md`.
4. Compliance telemetry and alerting: `specs/launch-readiness/07-observability-admin-analytics-and-support.md`.
5. Incident response and operational runbooks: `specs/launch-readiness/10-cicd-release-and-operations.md`.
6. Canonical API/schema change sequencing and migration dependencies: `specs/launch-readiness/11-api-and-schema-change-log.md`.
