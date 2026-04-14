# Chrome Extension LinkedIn Multi-Select + Bulk Enrich

Status: implemented  
Owner: extension + backend  
Date: 2026-02-14

## 1) Goal

Ship a production-safe LinkedIn multi-select workflow in the extension that lets users:
1. Select multiple LinkedIn profiles from list/search pages.
2. Build a persistent selection cart in the side panel.
3. Save selected profiles into an OmniDial lead list.
4. Run async bulk enrichment with progress polling.
5. Optionally run bulk CRM push after enrichment.

## 2) Fix-First Issues (Completed)

### 2.1 Cross-tab popup state race
Resolved by tab-scoped profile update handling.
- `extension/src/popup/components/App.tsx`
- `extension/src/background/service-worker.ts`

What changed:
1. Popup now processes `PROFILE_DETECTED` only when payload includes matching `tabId`.
2. Background forwards profile events with explicit `tabId`.
3. Popup tracks active tab and ignores off-tab events.

### 2.2 Non-org-scoped extension caches
Resolved with org-scoped + versioned cache keys.
- `extension/src/lib/storage.ts`
- `extension/src/popup/components/App.tsx`
- `extension/src/popup/components/AddToCampaignButton.tsx`
- `extension/src/popup/components/LeadBrowser.tsx`

What changed:
1. Cache namespace versioning added (`cache:v2`).
2. Lead/context caches now keyed by `organizationId`.
3. Org-switch invalidation clears scoped cache entries.
4. Session refresh in popup now prefers live API session to avoid stale org context.

### 2.3 Org trust issue in enrichment parsing
Resolved by authoritative server org merge order.
- `backend/src/api/routes/enrichment.ts`

What changed:
1. Schema parse now merges request payload first, then overwrites `organizationId` from active session.

### 2.4 CRM enum mismatch
Resolved by schema alignment with backend-supported providers.
- `shared/types/src/requests/crmSync.ts`
- `extension/src/popup/components/CrmSelector.tsx`

What changed:
1. Added `pipedrive` to CRM provider enum.
2. Extension CRM selector label mapping includes `Pipedrive`.

### 2.5 Prod packaging used dev manifest
Resolved via mode-based manifest switch.
- `extension/vite.config.ts`
- `extension/package.json`

What changed:
1. Build copies `manifest.prod.json` in production mode.
2. Dev script now uses `--mode development`.

### 2.6 LinkedIn canonicalization gaps
Resolved with stronger canonicalization in extension + backend.
- `extension/src/lib/linkedin-parser.ts`
- `extension/src/lib/storage.ts`
- `backend/src/services/extension.service.ts`

What changed:
1. Canonical extraction now checks direct URL and query-embedded LinkedIn profile URLs.
2. Sales Navigator URL identities normalized more consistently.

### 2.7 LinkedIn-only import flow blocked by phone requirement
Resolved for list CSV import + EnrichEngine import.
- `backend/src/queues/list-csv-import.worker.ts`
- `backend/src/repositories/lead.repository.ts`
- `backend/src/api/controllers/integration.controller.ts`

What changed:
1. CSV list import accepts row with `phone` OR `linkedInUrl`.
2. Bulk lead insert now returns IDs for no-phone inserts.
3. EnrichEngine import no longer drops rows that have LinkedIn URL but no phone.

## 3) Implemented Sub-Specs (A-H)

### A) Extension session/state hardening
Implemented.
- Active-org scoped caches.
- Active-tab profile event filtering.
- Session refresh + scope sync on initialize.

### B) LinkedIn card multi-select collector
Implemented.
- `extension/src/content/linkedin.ts`

Behavior:
1. Detects selectable cards on LinkedIn list/search-like pages.
2. Injects checkbox overlay per card.
3. Extracts normalized profile payload and sends selection toggle events.
4. Handles SPA changes via mutation observer refresh.

### C) Background selection cart + side panel UX
Implemented.
- `extension/src/background/service-worker.ts`
- `extension/src/popup/components/LinkedInSelectionCart.tsx`
- `extension/src/popup/components/BottomNav.tsx`
- `extension/src/popup/components/App.tsx`
- `extension/src/popup/styles.css`

Behavior:
1. Background maintains scoped carts (`scope = userId:organizationId`).
2. Cart persisted in `chrome.storage.local`.
3. Side panel `Cart` tab shows selections, remove/clear, and bulk flow actions.
4. Cart count badge displayed in bottom navigation.

### D) Backend list ingestion from LinkedIn selections
Implemented.
- `backend/src/api/routes/extension.ts`
- `backend/src/api/controllers/extension.controller.ts`
- `backend/src/services/extension.service.ts`
- `shared/types/src/requests/extension.ts`

New endpoint:
1. `POST /api/extension/lists/create-from-linkedin-selection`

Behavior:
1. Dedupes selected profiles by normalized LinkedIn identity.
2. Reuses existing leads when found.
3. Creates new lead records for missing profiles (enrichment-first compatible).
4. Creates list and adds all resolved lead IDs.
5. Returns `correlationId`.

### E) Async bulk enrichment orchestration + progress jobs
Implemented.
- `backend/src/queues/extension-bulk-enrich.queue.ts`
- `backend/src/queues/extension-bulk-enrich.worker.ts`
- `backend/src/types/queues.ts`
- `backend/src/worker.ts`
- `backend/src/services/extension.service.ts`
- `backend/src/api/routes/extension.ts`
- `backend/src/api/controllers/extension.controller.ts`

New endpoints:
1. `POST /api/extension/lists/:id/bulk-enrich` (enqueue job)
2. `GET /api/extension/jobs/:jobId` (poll status/progress)

Behavior:
1. Enriches list leads asynchronously.
2. Tracks progress (`processed`, `enriched`, `failed`).
3. Returns summary (`totalRequested`, `totalEnriched`, `totalFailed`, `totalCreditsUsed`).
4. Enforces batch max of 100 per run.

### F) Bulk CRM push for list leads
Implemented.
- `backend/src/services/extension.service.ts`
- `backend/src/api/routes/extension.ts`
- `backend/src/api/controllers/extension.controller.ts`
- `extension/src/lib/api.ts`
- `extension/src/popup/components/LinkedInSelectionCart.tsx`

New endpoint:
1. `POST /api/extension/lists/:id/bulk-push-crm`

Behavior:
1. Pushes all active list leads to selected provider.
2. Returns lead-level success/failure results and totals.
3. Supports provider set: `hubspot`, `salesforce`, `attio`, `pipedrive`.

### G) Permissions/compliance/packaging hardening
Implemented.
- Build manifest selection is now strict: only `development` mode can use localhost-scoped manifest; all other modes require `manifest.prod.json`.
- Production host permissions are least-privilege (`api.omnidial.io` + LinkedIn only).
- Packaging includes `dist/manifest.json` validation to block localhost/insecure hosts and unexpected permissions in production artifacts.
- LinkedIn multi-select controls are constrained to supported list/search surfaces and remain user-driven (manual checkbox selection).

### H) Observability + QA matrix
Implemented.

Observability:
1. Bulk enrichment flow now emits structured lifecycle events with stable `eventType` keys and `correlationId` (`started`, `progress`, `completed`, `failed`, lead-level failures).
2. Queue polling contract includes `correlationId` (`GET /api/extension/jobs/:jobId`) and extension controllers set `x-correlation-id` response headers.
3. Create-list, bulk-enrich enqueue, job-status reads, and bulk CRM push all emit correlation-aware backend logs.
4. Extension cart UI surfaces correlation ID during success and error states for support triage.

QA matrix coverage is executable:
1. `pnpm qa:extension-h` runs `scripts/qa/extension-h-observability-matrix.mjs`.
2. Multi-tab profile update isolation.
3. Org-switch cache isolation.
4. LinkedIn profile + list/search page behavior.
5. Cart persistence and update broadcasts.
6. List ingest, job queue, polling, and CRM push flow.
7. Required H observability guarantees (`correlationId` propagation + worker lifecycle logs).

## 4) API Contracts (Current)

### Request schemas
- `shared/types/src/requests/extension.ts`

Added:
1. `CreateListFromLinkedInSelectionRequestSchema`
2. `ExtensionListBulkEnrichRequestSchema`
3. `ExtensionJobStatusRequestSchema`
4. `ExtensionListBulkPushCrmRequestSchema`
5. Session-scoped extension CRM request schemas

### Org authority model
Extension and CRM session flows now use active-org middleware:
- `backend/src/api/middlewares/auth.ts` (`validateActiveOrganization`)

## 5) Implementation Notes

1. Backend list source metadata is currently persisted in list description summary string (source type/url/captured timestamp) to avoid immediate schema migration risk.
2. Bulk flow enforces `<= 100` lead operations per request/job for extension routes.
3. Existing `/api/crm/*` routes now also bind to active session organization via middleware override.

## 6) Acceptance Criteria Check

1. Multi-select on LinkedIn list pages: pass.
2. Persistent selection cart in side panel: pass.
3. Create list from selected profiles: pass.
4. Async bulk enrichment + progress polling: pass.
5. Optional bulk CRM push after enrich: pass.
6. No cross-tab profile state leakage in popup: pass.
7. No cross-org extension cache leakage for lead/context caches: pass.
8. Production manifest switching wired: pass.
