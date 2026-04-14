# OmniDial Reliability and State Model Spec (Session B)

**Document ID:** `launch-readiness/05`  
**Status:** Draft (Wave 1 launch blocker + Wave 2 hardening split)  
**Scope:** Manual/power/parallel dialer state model, webhook reliability, hotkey behavior, compliance controls  
**Primary Risks Addressed:** State drift, duplicate/out-of-order webhook side effects, unreliable call lifecycle handling, parallel dialing compliance exposure

---

## 1. Purpose

Define one canonical dialer behavior model across backend, frontend, and Twilio webhooks so call state is deterministic, resilient, and compliant at launch.

This spec covers:
1. Canonical state machines for manual, power, and parallel dialing.
2. Hotkey and floating/minimized widget behavior contract.
3. Twilio webhook reliability contract (signature, idempotency, ordering, reconciliation).
4. Parallel dialing compliance thresholds, controls, and reporting.

---

## 2. Current Baseline (Code-Verified)

1. Frontend call state currently uses `idle|initiated|ringing|in-progress|completed|failed` in `frontend/components/providers/DialerProvider.tsx`.
2. Floating widget and keyboard shortcuts are implemented in `frontend/components/dialer/FloatingDialerWidget.tsx`.
3. Manual/power/parallel surfaces live in `frontend/app/dashboard/dialer/page.tsx` with context persistence for selection/session.
4. Twilio webhook handling is centralized in `backend/src/api/routes/webhooks/twilio.ts`.
5. Parallel dialer session and attempt lifecycle is implemented in `backend/src/services/parallelDialer.service.ts` with repositories in:
- `backend/src/repositories/parallelDialSession.repository.ts`
- `backend/src/repositories/parallelDialAttempt.repository.ts`
6. Idempotency/replay-safe persistence for Twilio webhook events is not yet standardized.

---

## 3. Canonical State Model

## 3.1 Unified Call State (All Dialer Modes)

| State | Meaning | Allowed Next States |
| --- | --- | --- |
| `idle` | No active call leg | `initiated` |
| `initiated` | Outbound call request accepted, not yet ringing | `ringing`, `failed` |
| `ringing` | Remote leg ringing | `in-progress`, `failed`, `completed` |
| `in-progress` | Two-way media active | `completed`, `failed` |
| `completed` | Normal terminal state | `idle` |
| `failed` | Terminal failure or blocked state | `idle` |

Rules:
1. Terminal states (`completed|failed`) must auto-resolve to `idle` only after local side effects finish (disposition UI, metrics emit, widget update).
2. `ringing -> completed` without `in-progress` is valid (no-answer/hangup edge case).
3. Multiple webhook events must never regress terminal state to non-terminal state.

## 3.2 Mode-Specific Session State

### Manual Dialer Session
1. `ready`
2. `dialing`
3. `active_call`
4. `post_call`
5. `ready`

### Power Dialer Session
1. `queue_ready`
2. `countdown`
3. `dialing`
4. `active_call`
5. `post_call_disposition`
6. `advance_next` (or `queue_complete`)

### Parallel Dialer Session
1. `active`
2. `paused`
3. `ending`
4. `ended`

Parallel attempt state (per lead leg):
1. `dialing`
2. `ringing`
3. `connected`
4. `abandoned` or `voicemail` or `failed`

---

## 4. State Invariants and Ownership

1. Backend is source-of-truth for persisted call/session state.
2. Frontend context is an eventually consistent projection and must reconcile from backend on reconnect/reload.
3. UI must never infer authorization or entitlement from local state.
4. Parallel session operations (`get/pause/resume/end/join`) must be org-scoped per Spec `01`.
5. Ending a session is idempotent; duplicate end requests return current ended state.

---

## 5. Hotkey Behavior Contract

## 5.1 Global Safety Rules

1. Hotkeys are ignored when focus is in editable fields (`input`, `textarea`, `select`, contentEditable).
2. Hotkeys are disabled when auth/session is invalid.
3. Hotkey actions must be no-op safe when the required context is missing.

## 5.2 Canonical Actions

| Shortcut | Scope | Action |
| --- | --- | --- |
| `Enter` | Active call UI | End current call |
| `Cmd/Ctrl + L` | Power/floating with lead context | Open LinkedIn profile |
| `Cmd/Ctrl + J` | Power/floating with lead context | Open lead website |
| `+`, `=`, `ArrowUp`, `ArrowRight` | Power/floating with campaign context | Next lead |
| `-`, `ArrowDown`, `ArrowLeft` | Power/floating with campaign context | Previous lead |

Rules:
1. Keydown handlers must be registered once and cleaned on unmount.
2. Duplicate handler registration across tabs/components is forbidden.
3. Hotkeys must not trigger while call termination mutation is in-flight.

---

## 6. Floating/Minimized Dialer and Tab Continuity

## 6.1 Behavior Contract

1. Active call remains controllable when leaving `/dashboard/dialer` via floating widget.
2. Widget position and minimized state persist for the browser session.
3. Returning to dialer tab must rehydrate live state without forcing call teardown.
4. Sidebar/tab navigation must not reinitialize Twilio device if already registered.

## 6.2 Persistence Keys (Current + Required)

Current keys include:
1. `floating-dialer-position`
2. `floating-dialer-minimized`

Required additions:
1. `dialer-session-version` for incompatible client state resets after releases.
2. `dialer-last-sync-at` for stale-state detection and auto-reconcile.

## 6.3 Reconnect Rules

1. On app visibility regain or network reconnect, client fetches latest call/session snapshot.
2. If local and server states conflict, server state wins.
3. If Twilio device token expires during active session, refresh must not drop UI into `idle` unless call truly ended.

---

## 7. Twilio Webhook Reliability Contract

## 7.1 Security and Authenticity

1. Twilio signature verification is mandatory in production for all Twilio webhook routes.
2. Missing/invalid signature returns `403`.
3. Signature verification failures emit structured security events with correlation ID.

## 7.2 Idempotency and Replay Handling

Introduce persistent receipt table (example `webhook_event_receipt`) for Twilio:
1. `provider` (`twilio`)
2. `eventKey` (deterministic key from route + `CallSid`/`RecordingSid`/`ConferenceSid` + status/event)
3. `firstSeenAt`
4. `lastSeenAt`
5. `processStatus` (`applied|duplicate|error`)
6. unique index on `(provider, eventKey)`

Rules:
1. Duplicate event must return success response without reapplying side effects.
2. Event processing must be atomic with receipt write.
3. Handler retries must be safe under concurrent delivery.

## 7.3 Ordering and State Precedence

1. Out-of-order events are expected and must be tolerated.
2. Terminal state precedence:
- `completed|failed|missed` cannot be overwritten by `ringing`.
3. Recording updates can arrive after call completion and must still attach safely.
4. Parallel attempt updates must preserve `wasConnected` and `wasAbandoned` invariants.

## 7.4 Timeout and Reconciliation Jobs

Required periodic jobs:
1. Reconcile stale calls stuck in non-terminal states beyond threshold.
2. Reconcile orphaned parallel attempts without end timestamps.
3. Reconcile missing recordings where Twilio indicates completed recording.

Wave 1 cadence:
1. Every 2 minutes for active call/session reconciliation.
2. Every 15 minutes for recording reconciliation.

---

## 8. Parallel Dialing Compliance Controls

## 8.1 Launch Threshold Policy

1. Abandonment rate target: <= 3.0% over rolling 30-minute and daily windows.
2. Soft warning threshold: 2.5%.
3. Hard control threshold: 3.0%:
- Block new parallel batch starts.
- Force line count reduction.
- Emit compliance alert and admin notification.

## 8.2 Runtime Controls

1. Dynamic line cap reduction under elevated abandonment.
2. Pause/resume gating based on current compliance status.
3. Mandatory abandoned-call callback messaging path for abandoned legs.
4. Compliance events must be tenant-scoped and auditable.

## 8.3 Reporting Contract

Abandoned call report must include:
1. org, session, rep, lead identifiers.
2. `answeredAt`, `endedAt`, `abandonedAfterMs`.
3. rolling abandonment ratio at event time.
4. control action taken (`warn|throttle|block`).

---

## 9. Error Taxonomy and API Contract (Dialer Surfaces)

All dialer APIs/webhook-invoked service errors must map to structured codes:
1. `DIALER_INVALID_STATE`
2. `DIALER_SESSION_NOT_FOUND`
3. `DIALER_WEBHOOK_REPLAY`
4. `DIALER_WEBHOOK_SIGNATURE_INVALID`
5. `DIALER_COMPLIANCE_BLOCKED`

Payload requirements:
1. `code`
2. `retryable`
3. `userMessage`
4. `correlationId`

---

## 10. Implementation Targets

Primary files:
1. `frontend/components/providers/DialerProvider.tsx`
2. `frontend/app/dashboard/dialer/page.tsx`
3. `frontend/components/dialer/FloatingDialerWidget.tsx`
4. `frontend/components/dialer/PowerDialerControls.tsx`
5. `backend/src/api/routes/webhooks/twilio.ts`
6. `backend/src/services/dialer.service.ts`
7. `backend/src/services/parallelDialer.service.ts`
8. `backend/src/repositories/parallelDialSession.repository.ts`
9. `backend/src/repositories/parallelDialAttempt.repository.ts`

---

## 11. Test Requirements

1. State transition tests for manual/power/parallel normal and edge transitions.
2. Reconnect/tab-switch tests with active call and minimized widget continuity.
3. Hotkey behavior tests for focus-safe suppression and context gating.
4. Twilio webhook replay/idempotency tests (duplicate delivery no duplicate side effects).
5. Out-of-order webhook event tests with precedence enforcement.
6. Reconciliation job tests for stale sessions/attempts and delayed recordings.
7. Parallel compliance tests for warning, throttling, and hard-block behavior.

---

## 12. Definition of Done (Wave 1)

1. Canonical state machine is documented and enforced in backend + frontend.
2. Twilio webhook processing is signature-validated, idempotent, and ordering-safe.
3. Floating/minimized dialer behavior is stable across tab and navigation transitions.
4. Parallel dialing abandonment controls and reporting are active and test-covered.
5. Dialer error taxonomy is standardized and observable across API surfaces.

---

## 13. Dependencies and Cross-Spec Links

1. Charter and wave policy: `specs/launch-readiness/00-launch-charter.md`.
2. Org-scoped authorization constraints for dialer session operations: `specs/launch-readiness/01-tenant-security-and-authz.md`.
3. Billing and quota guard behavior for call-allow decisions: `specs/launch-readiness/03-billing-limits-and-abuse-protection.md`.
4. Legal consent and suppression controls applied pre-dial and pre-record: `specs/launch-readiness/08-legal-and-consent-controls-us.md`.
5. Observability SLOs and webhook/dialer analytics: `specs/launch-readiness/07-observability-admin-analytics-and-support.md`.
6. Consolidated API/schema sequencing and compatibility notes: `specs/launch-readiness/11-api-and-schema-change-log.md`.
