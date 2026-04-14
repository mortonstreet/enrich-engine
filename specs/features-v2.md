# OmniDial Features V2 - Implementation Status

This spec documents the v2 features for OmniDial.

---

## OmniDial Enhancements (Enterprise Features)

**Status:** Backend Complete, Frontend Components Created - Needs Integration

### Overview

| Feature | Description | Backend | Frontend |
|---------|-------------|---------|----------|
| Parallel Dialer | Dial 2-5 leads simultaneously | Complete | Components Ready |
| Predictive Scoring | ML-based answer likelihood | Complete | Components Ready |
| Virtual Sales Floor | Real-time team visibility | Complete | Components Ready |
| Manager Listen/Whisper/Barge | Call monitoring | Complete | Components Ready |
| Call Blitz | Team competitions | Complete | Components Ready |
| AI Live Coach | Trigger-based coaching cards | Complete | Components Ready |
| Live Transcription | Real-time speech-to-text | Complete | Components Ready |
| Local Presence | Area code matching caller ID | Complete | Components Ready |
| Multi-Vendor Enrichment | Waterfall enrichment | Complete | Components Ready |

---

## OD-1: Parallel Dialer

**Status:** Backend Complete

### How It Works
1. Rep starts parallel dial session (2-5 lines configurable)
2. Rep is placed in Twilio conference (waiting)
3. System dials N leads simultaneously
4. First lead to answer is bridged to conference
5. Other calls are immediately abandoned (tracked for compliance)
6. Call proceeds normally, then cycle repeats

### Implementation Files

**Backend (Complete):**
- `backend/src/services/parallelDialer.service.ts` - Session orchestration
- `backend/src/repositories/parallelDialSession.repository.ts`
- `backend/src/repositories/parallelDialAttempt.repository.ts`
- `backend/src/api/routes/parallelDialer.ts`

**Frontend (Components Ready):**
- `frontend/components/dialer/ParallelDialerControls.tsx` - Start/stop with line selector
- `frontend/components/dialer/PredictiveScoreIndicator.tsx` - Score display
- `frontend/components/dialer/AbandonedCallsReport.tsx` - Compliance dashboard
- `frontend/hooks/api/useParallelDialer.ts`

**Shared Types:**
- `shared/types/src/requests/parallelDialer.ts`

### API Endpoints
```
POST /api/parallel-dialer/sessions           - Start session
POST /api/parallel-dialer/sessions/:id/end   - End session
GET  /api/parallel-dialer/abandoned-calls    - Compliance reporting
```

### Database Tables
- `parallel_dial_session` - Tracks sessions
- `parallel_dial_attempt` - Individual dial attempts

### Remaining Work
- [ ] Integrate `ParallelDialerControls` into dialer page
- [ ] Wire up Twilio webhooks for parallel dial callbacks
- [ ] Add parallel dial toggle to campaign settings

---

## OD-2: Predictive Scoring

**Status:** Backend Complete

### Scoring Factors
- Time of day (historical answer patterns)
- Day of week patterns
- Phone type (mobile vs landline via Twilio Lookup)
- Previous call attempt count
- Lead data completeness

### Implementation Files

**Backend (Complete):**
- `backend/src/services/predictiveScoring.service.ts`
- `backend/src/api/routes/predictiveScoring.ts`

**Frontend (Components Ready):**
- `frontend/components/dialer/PredictiveScoreIndicator.tsx`
- `frontend/hooks/api/usePredictiveScoring.ts`

**Shared Types:**
- `shared/types/src/requests/predictiveScoring.ts`

### API Endpoints
```
POST /api/predictive-scoring/calculate/:listId
POST /api/predictive-scoring/reorder/:campaignId/:listId
GET  /api/predictive-scoring/lead/:leadId
GET  /api/predictive-scoring/patterns
GET  /api/predictive-scoring/phone-type?phoneNumber=
```

### Database Tables
- `lead_predictive_score` - Score per lead
- `call_answer_pattern` - Historical patterns by day/hour

### Remaining Work
- [ ] Display score indicator in power dialer lead card
- [ ] Add "Reorder by score" button to campaign lists
- [ ] Show score factors breakdown in lead detail

---

## OD-3: Virtual Sales Floor

**Status:** Backend Complete

### Features
- Real-time visibility into who's dialing
- Who is currently on a call
- Live session statistics
- Real-time leaderboard updates

### Implementation Files

**Backend (Complete):**
- `backend/src/services/salesFloor.service.ts`
- `backend/src/api/routes/salesFloor.ts`

**Frontend (Components Ready):**
- `frontend/components/sales-floor/SalesFloorDashboard.tsx` - Main view
- `frontend/components/sales-floor/ActiveRepCard.tsx` - Rep status
- `frontend/components/sales-floor/LiveLeaderboard.tsx` - Rankings
- `frontend/hooks/api/useSalesFloor.ts`

**Shared Types:**
- `shared/types/src/requests/salesFloor.ts`

### Pusher Events
```typescript
PUSHER_EVENTS.SESSION_STARTED
PUSHER_EVENTS.SESSION_ENDED
PUSHER_EVENTS.CALL_ANSWERED
PUSHER_EVENTS.LEADERBOARD_UPDATE
PUSHER_EVENTS.REP_STATUS_UPDATE
```

### API Endpoints
```
GET  /api/sales-floor/status
GET  /api/sales-floor/leaderboard
```

### Remaining Work
- [ ] Create `/dashboard/sales-floor` page
- [ ] Wire up Pusher subscriptions for real-time updates
- [ ] Add sales floor link to sidebar navigation

---

## OD-4: Manager Listen/Whisper/Barge

**Status:** Backend Complete

### Monitoring Modes

| Mode | Description |
|------|-------------|
| Listen | Manager joins muted, silently monitors |
| Whisper | Manager unmuted, only rep can hear (coaching) |
| Barge | Manager unmuted, everyone can hear (conference) |

### Implementation Files

**Backend (Complete):**
- `backend/src/services/managerListen.service.ts`
- Routes in `backend/src/api/routes/salesFloor.ts`

**Frontend (Components Ready):**
- `frontend/components/sales-floor/ManagerControls.tsx` - Floating control panel
- `frontend/components/sales-floor/ActiveRepCard.tsx` - Listen/whisper/barge buttons

### API Endpoints
```
POST /api/sales-floor/listen/start
POST /api/sales-floor/listen/:sessionId/end
POST /api/sales-floor/listen/:sessionId/mode
```

### Database Tables
- `manager_listen_session` - Tracks monitoring sessions

### Remaining Work
- [ ] Add manager controls to active rep cards (admin only)
- [ ] Implement Twilio conference join for monitoring
- [ ] Show manager presence indicator to rep

---

## OD-5: Call Blitz

**Status:** Backend Complete

### Features
- Team competitions with configurable goals
- Live leaderboard during blitz
- Goal types: calls, connections, talk time

### Implementation Files

**Backend (Complete):**
- `backend/src/services/callBlitz.service.ts`
- Routes in `backend/src/api/routes/salesFloor.ts`

**Frontend (Components Ready):**
- `frontend/components/sales-floor/BlitzBanner.tsx` - Active blitz display

### API Endpoints
```
GET  /api/sales-floor/blitz
POST /api/sales-floor/blitz
GET  /api/sales-floor/blitz/:id
POST /api/sales-floor/blitz/:id/start
POST /api/sales-floor/blitz/:id/end
POST /api/sales-floor/blitz/:id/join
```

### Database Tables
- `call_blitz` - Blitz configuration
- `blitz_participant` - Participation tracking

### Remaining Work
- [ ] Create blitz management UI for admins
- [ ] Show blitz banner on dialer when active
- [ ] Add blitz history/results view

---

## OD-6: AI Live Coach Cards

**Status:** Backend Complete

### How It Works
1. Real-time speech-to-text during calls (Deepgram/AssemblyAI)
2. System scans transcript for configured trigger phrases
3. When phrase detected, relevant coach card appears
4. Rep sees key messaging and objection handling tips
5. Feedback loop improves card relevance

### Card Categories
- `objection` - Objection handling
- `question` - Discovery questions
- `closing` - Closing techniques
- `discovery` - Discovery phase
- `general` - General coaching

### Implementation Files

**Backend (Complete):**
- `backend/src/services/liveCoach.service.ts`
- `backend/src/services/transcription.service.ts`
- `backend/src/api/routes/liveCoach.ts`

**Frontend (Components Ready):**
- `frontend/components/live-coach/CoachCardOverlay.tsx` - Floating card
- `frontend/components/live-coach/LiveTranscriptPanel.tsx` - Transcript view
- `frontend/components/live-coach/CoachCardSettings.tsx` - Admin config
- `frontend/hooks/api/useLiveCoach.ts`

**Shared Types:**
- `shared/types/src/requests/liveCoach.ts`

### API Endpoints
```
GET  /api/live-coach/cards
POST /api/live-coach/cards
GET  /api/live-coach/cards/:id
PATCH /api/live-coach/cards/:id
DELETE /api/live-coach/cards/:id
GET  /api/live-coach/transcript/:callId
POST /api/live-coach/triggers/:id/feedback
GET  /api/live-coach/trigger-stats
```

### Database Tables
- `coach_card` - Card configuration
- `coach_card_trigger` - Trigger log
- `live_transcript_segment` - Transcript chunks

### Remaining Work
- [ ] Integrate transcription service with Deepgram/AssemblyAI
- [ ] Add coach card overlay to active call UI
- [ ] Create settings page for coach cards
- [ ] Wire up Pusher for real-time card triggers

---

## OD-7: Local Presence Dialing

**Status:** Backend Complete

### How It Works
1. Before dial, system extracts lead's phone area code
2. Matches against organization's phone number pool
3. Selects best matching caller ID
4. Tracks which number was used for callback routing
5. When lead calls back, routes to original rep

### Implementation Files

**Backend (Complete):**
- `backend/src/services/localPresence.service.ts`
- `backend/src/api/routes/localPresence.ts`

**Frontend (Components Ready):**
- `frontend/components/local-presence/PhoneNumberPoolManager.tsx`
- `frontend/components/local-presence/LocalPresenceSettings.tsx`
- `frontend/components/local-presence/CallerIdIndicator.tsx`
- `frontend/hooks/api/useLocalPresence.ts`

**Shared Types:**
- `shared/types/src/requests/localPresence.ts`

### API Endpoints
```
GET  /api/local-presence/phone-pool
POST /api/local-presence/phone-pool/sync
PATCH /api/local-presence/phone-pool/:id
GET  /api/local-presence/preview?leadPhone=
GET  /api/local-presence/coverage
GET  /api/local-presence/missing-area-codes
POST /api/local-presence/callback-routes/clear-expired
```

### Database Tables
- `phone_number_pool` - Owned numbers with area codes
- `callback_route` - Route callbacks to correct rep

### Remaining Work
- [ ] Add phone pool manager to dialer settings
- [ ] Show caller ID indicator before dial
- [ ] Integrate local presence selection into dial flow
- [ ] Handle inbound callback routing

---

## OD-8: Multi-Vendor Enrichment

**Status:** Backend Complete

### Supported Vendors
- Apollo.io
- ZoomInfo
- Clearbit
- Lusha
- EnrichEngine

### Waterfall Pattern
1. Admin connects vendors with API keys
2. Vendors assigned priority order
3. On enrichment request, system queries vendors in order
4. First successful result used, or merge from multiple
5. Multiple contact points stored per lead

### Implementation Files

**Backend (Complete):**
- `backend/src/services/enrichment.service.ts`
- `backend/src/services/vendors/` - Per-vendor adapters (stubs)
- `backend/src/api/routes/enrichment.ts`

**Frontend (Components Ready):**
- `frontend/components/enrichment/DataVendorSettings.tsx`
- `frontend/components/enrichment/LeadEnrichmentPanel.tsx`
- `frontend/components/enrichment/LeadContactInfoList.tsx`
- `frontend/hooks/api/useEnrichment.ts`

**Shared Types:**
- `shared/types/src/requests/enrichment.ts`

### API Endpoints
```
GET  /api/enrichment/vendors
POST /api/enrichment/vendors
PATCH /api/enrichment/vendors/:id
DELETE /api/enrichment/vendors/:id
POST /api/enrichment/vendors/:id/test
POST /api/enrichment/leads/:leadId/enrich
POST /api/enrichment/bulk-enrich
GET  /api/enrichment/leads/:leadId/contacts
GET  /api/enrichment/history
```

### Database Tables
- `data_vendor_connection` - Vendor API keys
- `lead_contact_info` - Multiple emails/phones per lead
- `enrichment_history` - Enrichment event log

### Remaining Work
- [ ] Implement actual API calls in vendor adapters
- [ ] Add vendor settings to integrations page
- [ ] Add re-enrich button to lead detail panel
- [ ] Show contact info list in lead view

---

## Database Schema (OmniDial Enhancements)

### New Tables
```prisma
// Parallel Dialing
model ParallelDialSession { ... }
model ParallelDialAttempt { ... }

// Predictive Scoring
model LeadPredictiveScore { ... }
model CallAnswerPattern { ... }

// Sales Floor
model CallBlitz { ... }
model BlitzParticipant { ... }
model ManagerListenSession { ... }

// AI Live Coach
model CoachCard { ... }
model CoachCardTrigger { ... }
model LiveTranscriptSegment { ... }

// Local Presence
model PhoneNumberPool { ... }
model CallbackRoute { ... }

// Multi-Vendor Enrichment
model DataVendorConnection { ... }
model LeadContactInfo { ... }
model EnrichmentHistory { ... }
```

### Modified Tables
- `call` - Added: `parallelSessionId`, `wasParallelAbandoned`, `predictiveScore`, `poolNumberId`
- `lead` - Added: `phoneType`, `totalCallAttempts`, `totalAnswers`, `lastCallAt`, `enrichmentStatus`, `enrichmentSources[]`
- `campaign_lead` - Added: `predictiveScore`, `scoreDialOrder`
- `active_dialer_session` - Added: `currentLeadId`, `currentLeadName`, `callsThisSession`, `connectedThisSession`

### Migration File
`shared/db/prisma/migrations/20260121000000_gtm_enhancements/migration.sql`

---

## Frontend Config Updates

### Endpoints Added (`frontend/lib/config.ts`)
```typescript
PARALLEL_DIALER: { SESSIONS, SESSION_END, ABANDONED_CALLS }
PREDICTIVE_SCORING: { CALCULATE, REORDER, LEAD_SCORE, PATTERNS, PHONE_TYPE }
SALES_FLOOR: { STATUS, LEADERBOARD, BLITZ_*, LISTEN_* }
LIVE_COACH: { CARDS, CARD, TRANSCRIPT, TRIGGER_FEEDBACK, TRIGGER_STATS }
LOCAL_PRESENCE: { PHONE_POOL, PHONE_POOL_SYNC, PREVIEW, COVERAGE, MISSING_AREA_CODES }
ENRICHMENT: { VENDORS, VENDOR, VENDOR_TEST, LEAD_ENRICH, BULK_ENRICH, LEAD_CONTACTS, HISTORY }
```

### Query Keys Added
```typescript
parallelDialerSession, abandonedCalls, predictiveScorePatterns, leadPredictiveScore,
salesFloorStatus, salesFloorLeaderboard, blitzes, blitz,
coachCards, coachCard, liveTranscript, triggerStats,
phonePool, localPresencePreview, areaCodeCoverage, missingAreaCodes,
enrichmentVendors, leadContactInfo, enrichmentHistory
```

---

## Pusher Events Added (`shared/types/src/pusher.ts`)

```typescript
// Sales Floor
SESSION_STARTED, SESSION_ENDED, CALL_ANSWERED
LEADERBOARD_UPDATE, REP_STATUS_UPDATE

// Blitz
BLITZ_STARTED, BLITZ_ENDED, BLITZ_LEADERBOARD_UPDATE

// Manager Listen
MANAGER_JOINED, MANAGER_LEFT, MANAGER_MODE_CHANGED

// Live Coaching
TRANSCRIPT_UPDATE, COACH_CARD_TRIGGERED

// Parallel Dialer
PARALLEL_DIAL_STARTED, PARALLEL_DIAL_CONNECTED, PARALLEL_DIAL_ABANDONED
```

---

## Integration Priority

For continuing in a new session, recommended order:

1. **Sales Floor Dashboard** - Create page, wire up components
2. **Coach Card Settings** - Add to settings, enable card management
3. **Local Presence Settings** - Add phone pool to dialer settings
4. **Enrichment Vendors** - Add to integrations page
5. **Parallel Dialer** - Integrate into dialer, wire Twilio webhooks
6. **Live Coach Overlay** - Add to active call UI
7. **Blitz Management** - Create admin UI

---

## Phase 5: Enrich Engine Integration

**Status:** PENDING

### 5.1 OAuth Integration Setup

**Objective:** Allow users to connect their Enrich Engine account and import lists.

**Backend Files to Create/Modify:**
- `backend/src/services/enrichEngine.service.ts` (NEW)
  - OAuth flow handling (authorization URL, token exchange, refresh)
  - API client for Enrich Engine endpoints
  - List fetching and lead import logic
- `backend/src/services/integration.service.ts`
  - Add `enrich_engine` as a new provider type
- `backend/src/api/routes/integrations.ts`
  - `GET /integrations/enrich-engine/auth-url` - Get OAuth authorization URL
  - `GET /integrations/enrich-engine/callback` - Handle OAuth callback
  - `GET /integrations/enrich-engine/lists` - Fetch available lists
  - `POST /integrations/enrich-engine/import` - Import leads from a list
  - `DELETE /integrations/enrich-engine` - Disconnect integration
- `backend/src/config/index.ts`
  - Add `ENRICH_ENGINE_CLIENT_ID` and `ENRICH_ENGINE_CLIENT_SECRET` env vars
- `shared/types/src/requests/integration.ts`
  - Add request/response schemas for Enrich Engine endpoints

**Database:**
- Store OAuth tokens in existing `integration` table with `provider: 'enrich_engine'`
- Store `accessToken`, `refreshToken`, `expiresAt` in encrypted config

### 5.2 Frontend Integration

**Frontend Files to Create/Modify:**
- `frontend/components/settings/EnrichEngineListPicker.tsx` (NEW)
  - Modal to browse and select lists from Enrich Engine
  - Search/filter functionality
  - List preview with lead count
- `frontend/components/lists/ImportFromEnrichEngineModal.tsx` (NEW)
  - Wizard-style import flow
  - List selection -> Field mapping -> Import confirmation
  - Progress indicator during import
- `frontend/components/settings/IntegrationsSettings.tsx`
  - Add Enrich Engine card with connect/disconnect button
  - Show connection status and last sync time
- `frontend/app/dashboard/lists/page.tsx`
  - Add "Import from Enrich Engine" button (show only if connected)
- `frontend/hooks/api/useIntegrations.ts`
  - Add hooks: `useEnrichEngineAuthUrl`, `useEnrichEngineLists`, `useImportEnrichEngineList`
- `frontend/lib/config.ts`
  - Add endpoints for Enrich Engine routes

**User Flow:**
1. User goes to Settings -> Integrations
2. Clicks "Connect Enrich Engine"
3. Redirected to Enrich Engine OAuth
4. Returns to app with connected status
5. User goes to Lists page, clicks "Import from Enrich Engine"
6. Selects a list, maps fields, confirms import
7. Leads are created in the selected campaign/list

---

## Phase 6: CRM & Pipeline Enhancements

**Status:** PENDING

### 6.1 Client Tagging via Campaigns

**Objective:** Display client association on leads in pipeline view, derived from campaign relationship.

**Files to Modify:**
- `frontend/app/dashboard/crm/page.tsx`
  - Add client color badge to lead cards in Kanban columns
  - Show client name on hover
- `frontend/components/crm/LeadCard.tsx` (if exists, or create)
  - Display client badge with color from `campaign.client.color`
- Query should already include client via `lead.campaign.client` relationship

**Implementation Notes:**
- Leads are associated with clients through: `Lead -> Campaign -> Client`
- The campaign already has `clientId` relationship
- Just need to display this in the UI

### 6.2 Pipeline Client Filter Dropdown

**Objective:** Filter Kanban board to show only leads from a specific client's campaigns.

**Files to Modify:**
- `frontend/app/dashboard/crm/page.tsx`
  - Add client dropdown filter in the header area
  - Pass `clientId` filter to leads query
  - Filter should show: "All Clients" + list of clients with leads
- `frontend/hooks/api/useLeads.ts` (or equivalent CRM hook)
  - Add `clientId` filter parameter to the pipeline/kanban query
- `backend/src/api/controllers/lead.controller.ts`
  - Accept `clientId` query param and filter leads accordingly
- `backend/src/repositories/lead.repository.ts`
  - Add client filter to pipeline queries (join through campaign)

**Filter Logic:**
```sql
WHERE campaign.clientId = :clientId
```

### 6.3 Soft Delete Lead from Call Pool

**Objective:** Allow removing a lead from a specific list/campaign without deleting the lead data.

**Files to Modify:**
- `frontend/components/dialer/PowerDialerControls.tsx`
  - Add "Remove from list" button/menu option on current lead
  - Confirmation dialog before removal
- `backend/src/services/leadList.service.ts`
  - Add `removeLeadFromList(leadId, listId)` method
  - Mark the lead-list association as inactive/removed
- `backend/src/api/routes/lists.ts`
  - `DELETE /lists/:listId/leads/:leadId` - Remove lead from list
- Database consideration:
  - Add `removedAt` timestamp to `leadList` junction table
  - Or add `status: 'active' | 'removed'` field

**User Flow:**
1. In Power Dialer, user sees current lead
2. Clicks "Remove from list" button
3. Confirms removal
4. Lead is soft-deleted from that list (data preserved)
5. Power Dialer advances to next lead
6. Lead can still be found in global leads view

---

## Phase 7.3: Smart Dispositions (AI-Powered)

**Status:** PENDING

### Objective
Use Twilio call transcription + AI to automatically suggest dispositions after calls.

### Implementation Steps

**Step 1: Enable Twilio Transcription**
- `backend/src/lib/twilio.ts`
  - Enable `transcribe: true` in call recording options
  - Set transcription callback URL
- `backend/src/api/routes/webhooks/twilio.ts`
  - Add `/webhooks/twilio/transcription` endpoint
  - Store transcription text in call record

**Step 2: AI Classification Service**
- `backend/src/services/disposition.service.ts` (NEW or extend)
  - `suggestDisposition(transcriptionText: string, dispositions: Disposition[]): string`
  - Use OpenAI/Claude API to classify call outcome
  - Return suggested disposition ID

**Prompt Template:**
```
Given this call transcription and available dispositions, suggest the most appropriate disposition.

Transcription: {transcription}

Available Dispositions:
- Connected: Spoke with the person
- Booked: Meeting/demo scheduled
- Voicemail: Left voicemail or reached answering machine
- Not Interested: Person declined
- Wrong Number: Number doesn't belong to target
- Callback Requested: Person asked to call back later

Respond with only the disposition name.
```

**Step 3: Auto-Flag Voicemails**
- Detect voicemail even when Twilio's AMD (Answering Machine Detection) misses it
- Keywords to detect: "leave a message", "voicemail", "beep", "not available"
- `backend/src/services/dialer.service.ts`
  - After transcription received, check for voicemail keywords
  - Auto-set disposition to "Voicemail" if detected

**Step 4: Frontend Integration**
- `frontend/components/dialer/DispositionSelector.tsx`
  - Show "Suggested: {disposition}" badge if AI suggestion available
  - User can accept or override

**Database Changes:**
- Add `transcriptionText` column to `call` table
- Add `suggestedDispositionId` column to `call` table

---

## Phase 9: Live Monitor Assessment

**Status:** INVESTIGATED - Feasible but Deferred

### Objective
Determine if real-time call monitoring (supervisor listening to agent calls) is feasible with Twilio.

### Investigation Findings

#### 1. Twilio Conference Features - SUPPORTED
Twilio's Conference API supports three participant modes that enable monitoring:
- **`listen` mode**: Supervisor can hear both parties silently (ideal for monitoring)
- **`coach` mode**: Supervisor can speak to the agent only (whisper coaching)
- **Standard mode**: Full bidirectional audio

#### 2. Technical Feasibility - POSSIBLE WITH REFACTORING

**Current Architecture:**
- Calls are created using direct `client.calls.create()` in `backend/src/lib/twilio.ts`
- Simple point-to-point calls without conference infrastructure
- `LiveMonitorPanel.tsx` exists and shows active dialer sessions (who's on a call, status, start time)
- Conference-related functionality (`muteCall`) already exists, suggesting some groundwork

**Required Changes for Full Implementation:**
1. Convert ALL calls to conference-based architecture using `<Dial><Conference>` TwiML
2. Each call becomes a named conference (e.g., `conference-{callId}`)
3. Agent joins first, then customer is dialed into the conference
4. Supervisors can join existing conferences with `listen` or `coach` mode

#### 3. Trade-offs Analysis

| Factor | Impact |
|--------|--------|
| Latency | Minor increase (~50-100ms) due to conference routing |
| Cost | Higher - conference calls billed per participant-minute |
| Complexity | Significant - requires TwiML app changes, webhook handling |
| Reliability | Conference calls are well-supported by Twilio |
| Scalability | Better - supports multiple supervisors per call |

### Decision: DEFERRED

**Recommendation:** Keep existing `LiveMonitorPanel` for session visibility but defer real-time call listening to a future phase.

**Rationale:**
1. Current implementation already provides value (shows who's dialing and their status)
2. Full live listening requires significant architectural refactoring
3. Post-call recording review provides most of the supervisory value
4. Conference-based calling can be added incrementally later

**Current State (Kept):**
- `LiveMonitorPanel.tsx` - Shows active dialer sessions (admin-only tab)
- Displays: user name, session start time, "On Call" vs "Dialing" status
- Auto-refreshes every 10 seconds

**Future Enhancement Path:**
If full live monitoring becomes a priority:
1. Update `initiateCall` to create conference instead of direct call
2. Add `/dialer/sessions/:id/join` endpoint for supervisor to join
3. Add "Listen" and "Coach" buttons to `LiveMonitorPanel`
4. Handle supervisor disconnect gracefully

### Files Status
- `frontend/components/dialer/LiveMonitorPanel.tsx` - KEEP (session monitoring)
- `frontend/app/dashboard/dialer/page.tsx` - KEEP (Live Monitor tab for admins)
- `backend/src/services/liveMonitor.service.ts` - NOT NEEDED for current scope
- `backend/src/api/routes/liveMonitor.ts` - NOT NEEDED for current scope

---

## Implementation Priority

Recommended order for implementing remaining phases:

1. **Phase 6.2** - Pipeline Client Filter (simplest, high impact)
2. **Phase 6.1** - Client Tagging (UI enhancement, straightforward)
3. **Phase 6.3** - Soft Delete from Call Pool (important for workflow)
4. **Phase 5** - Enrich Engine Integration (larger feature, independent)
5. **Phase 7.3** - Smart Dispositions (requires external API, can defer)
6. **Phase 9** - Live Monitor (investigation first, then decide)

---

## Verification Checklist

After implementing each phase:

- [ ] Run `pnpm build` to verify no TypeScript errors
- [ ] Run `pnpm test` (backend) if tests exist
- [ ] Manual testing of the feature flow
- [ ] Check mobile/responsive behavior for frontend changes
