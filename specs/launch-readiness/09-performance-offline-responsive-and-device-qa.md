# OmniDial Performance, Offline, Responsive, and Device QA Spec (Session C)

**Document ID:** `launch-readiness/09`  
**Status:** Draft (decision-complete for Session C scope)  
**Scope:** Performance budgets, caching/offline behavior, responsive and device QA for launch  
**Deployment Baseline:** Coolify/Hetzner-first

---

## 1. Purpose

Define launch-performance expectations and client reliability behavior, including offline posture and cross-device QA standards for core user journeys.

This spec defines:
1. Frontend and API performance budgets.
2. Server/client/edge caching strategy with anti-stale safeguards.
3. Web-app offline baseline (PWA) and graceful degradation.
4. Device/browser/responsive regression matrix with dialer-specific scenarios.

---

## 2. Current Baseline (Code-Verified)

1. Frontend uses Next.js app router and React Query provider in `frontend/app/providers.tsx`.
2. Default query behavior currently sets `staleTime=30s`, `gcTime=5m`, retry=1.
3. Frontend currently imports Google fonts at runtime via `next/font/google` in `frontend/app/layout.tsx`.
4. No app-level service worker or web manifest exists under `frontend/public`.
5. Extension has a service worker (`extension/src/background/service-worker.ts`), but web app does not.
6. No codified performance budget or device QA matrix is currently tracked in CI.

---

## 3. Wave Split

## Wave 1 (Launch-Blocking)

1. Define and enforce measurable API + frontend performance SLO-like budgets.
2. Remove build/runtime fragility caused by internet-dependent font fetch for production builds.
3. Define cache invalidation and anti-stale contract for critical user flows.
4. Ship minimum responsive/device regression matrix for dialer-critical workflows.
5. Define graceful degradation behavior for offline and degraded network states.

## Wave 2 (Hardening)

1. Full PWA rollout with background sync and richer offline write queues.
2. Expanded automated browser/device coverage.
3. Deep performance profiling and long-tail optimization.

---

## 4. Performance Budgets (Wave 1 Targets)

## 4.1 Frontend Web Vitals Targets

For authenticated dashboard routes on median broadband:
1. LCP p75: `<= 2.5s`.
2. INP p75: `<= 200ms`.
3. CLS p75: `< 0.1`.
4. TTI (internal target): `<= 3.5s` for dialer dashboard initial load.

## 4.2 API Targets

1. Core authenticated business routes p95: `<= 450ms`.
2. Core authenticated business routes p99: `<= 900ms`.
3. Webhook acknowledgment (Twilio/Stripe/Slack) p95: `<= 250ms` for acceptance path.
4. Error response determinism: 100% responses include structured error payload fields.

## 4.3 Heavy Flow Targets

1. Power dialer next/previous transitions visible update: `<= 200ms` median.
2. Parallel dial session list/details query p95: `<= 500ms`.
3. Large lead-list load (1k row page API path): `<= 800ms` p95.

---

## 5. Caching Strategy and Anti-Stale Safeguards

## 5.1 Server-Side and API Caching

1. Cache only idempotent read endpoints with explicit TTL.
2. No cache for consent/suppression/legal-policy decision endpoints.
3. Billing guard, quota checks, and dial permission checks must be strongly fresh.
4. For aggregated analytics, allow stale-while-revalidate with visible timestamp.

## 5.2 Client-Side Caching (React Query)

1. Keep `staleTime` short for operationally sensitive data (dialer session, call state, billing status).
2. Use separate query keys for org-scoped resources.
3. On mutations affecting lead/call/session state, trigger targeted invalidation.
4. Show "last updated" timestamp for analytics and reports.

## 5.3 Anti-Stale Rules

1. Critical actions (dial start, session end, billing denial) must verify against live server state before commit.
2. UI must never use cached "allowed" state to skip server-side policy checks.
3. All race-prone actions must implement optimistic UI rollback on server conflict.

---

## 6. Offline and Degraded-Network Strategy

## 6.1 Wave 1 Baseline (Graceful Degradation)

1. Detect offline state globally and surface persistent banner.
2. Disable non-functional actions while offline:
- Dial start/end.
- Enrichment requests.
- CRM push actions.
- Billing-sensitive operations.
3. Preserve local draft state for:
- Notes.
- Script edits.
- Unsaved form entries.
4. Queue explicit user retries after reconnect instead of silent auto-replay.

## 6.2 PWA Baseline (Wave 1 Minimal)

1. Add `manifest.webmanifest` for installability and metadata.
2. Add minimal service worker for static asset shell cache only.
3. Do not cache authenticated API responses for offline replay in Wave 1.
4. Show deterministic "offline mode" page for routes requiring live API.

## 6.3 Wave 2 Offline Enhancements

1. Background sync queue for safe idempotent writes.
2. Offline-safe list browsing with signed cache envelopes.
3. Conflict-resolution UI for deferred mutations.

---

## 7. Font and Build Reliability Requirement

Current risk:
1. Runtime Google font fetch in `frontend/app/layout.tsx` can fail in restricted-network builds.

Wave 1 requirement:
1. Replace network-dependent font acquisition with local/self-hosted font assets.
2. Ensure production `frontend` build succeeds in air-gapped or restricted egress CI.
3. Validate no runtime dependency on `fonts.googleapis.com` for critical rendering.

---

## 8. Responsive and Interaction QA Matrix

## 8.1 Target Browser Matrix (Wave 1)

1. Chrome (stable, latest 2 major).
2. Edge (stable, latest 2 major).
3. Safari (current + previous major on macOS).
4. Firefox (stable, latest 2 major) for core dashboard and non-voice critical flows.

## 8.2 Device and Viewport Matrix

1. Desktop:
- 1366x768.
- 1440x900.
- 1920x1080.
2. Laptop high-DPI:
- 1512x982 equivalent.
3. Tablet:
- 768x1024 portrait.
- 1024x768 landscape.
4. Mobile check (read-only + basic nav):
- 390x844.

## 8.3 Dialer Regression Scenarios

1. Floating widget drag/minimize/restore behavior.
2. Keyboard shortcut behavior (`Enter`, arrows, `Cmd/Ctrl+L`, `Cmd/Ctrl+J`) in power dialer and floating widget.
3. Tab switches across dialer, inbound, and settings sections without state corruption.
4. Incoming call modal behavior when active tab is not inbound.
5. Reconnect behavior after transient network loss during active call UI session.

## 8.4 DnD and High-Volume UI Scenarios

1. CRM pipeline drag/drop across columns under large board sizes.
2. Lead list scrolling/filtering under large datasets.
3. No duplicate action firing on rapid keyboard navigation.

---

## 9. Test and Automation Requirements

## 9.1 Required Performance Tests (Wave 1)

1. Lighthouse CI budgets for key dashboard and marketing routes.
2. API load tests for core route families with p95/p99 reporting.
3. Synthetic dialer flow timing test for startup-to-call-ready latency.

## 9.2 Required QA Automation (Wave 1 Minimum)

1. Browser smoke tests for login, dashboard load, and dialer page load.
2. Critical interaction tests for hotkeys and floating widget behavior.
3. Responsive snapshot tests for core dashboard shells.
4. Offline/degraded network test cases:
- Hard offline.
- High latency.
- Packet loss simulation.

---

## 10. Release Gate Criteria (Session C / Spec 09)

1. Web-vitals and API targets meet Wave 1 thresholds in staging.
2. Font/network build fragility removed and validated in restricted CI.
3. Offline banner/degradation behavior verified for critical flows.
4. Device/browser matrix smoke tests pass.
5. Dialer hotkey and widget regression suite passes.
6. Cache invalidation checks prove no stale-permission bypass in critical workflows.

---

## 11. Dependencies and Cross-Spec Links

1. Charter and wave cut line: `specs/launch-readiness/00-launch-charter.md`.
2. Dialer state transitions and UX continuity behavior: `specs/launch-readiness/05-dialer-reliability-and-state-model.md`.
3. Extension and enrichment flow resilience: `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md`.
4. Performance and reliability observability metrics: `specs/launch-readiness/07-observability-admin-analytics-and-support.md`.
5. CI gates that enforce performance and QA budgets: `specs/launch-readiness/10-cicd-release-and-operations.md`.
6. Sequenced API/schema compatibility expectations for rollout safety: `specs/launch-readiness/11-api-and-schema-change-log.md`.
