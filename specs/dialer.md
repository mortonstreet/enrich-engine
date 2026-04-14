# Dialer Feature Spec

**Module Owner:** This session
**Status:** In Progress - Verified Jan 2026

---

## Implementation Status (Updated Jan 2026)

### Core Features Implemented
- Manual dialer functioning
- Call history display
- Disposition/callback tags working
- Settings (mostly fine)

### Core Features - Fixed
- Power Dialer with client/campaign/list selection (FUNCTIONAL - all critical bugs fixed Jan 2026)

### Bug Fixes - Implementation Verified
- [x] Power Dialer `callEnded` signal - PowerDialerControls.tsx:135-139, page.tsx:58,98-103,243
- [x] Call recording proxy with Twilio auth - dialer.controller.ts:363-426, calls.ts:69-74
- [x] Voicemail drop disabled until in-progress - DialerPanel.tsx:346
- [x] Phone normalization library - backend/src/lib/phone.ts (used in lead.repository.ts:143)

### UI Changes - Implementation Verified
- [x] "Status Connecting" removed - CallState type has: idle, initiated, ringing, in-progress, completed, failed
- [x] Disposition colors in call history - CallHistory.tsx:108-118, call.repository.ts joins for dispositionColor

### Bug Fixes - Jan 2026 Implementation
- [x] [CRITICAL] BUG: Power Dialer does not properly access lists, campaigns, or clients - selection dropdowns verified working correctly
- [x] [CRITICAL] BUG: Power Dialer buttons not working for dialing - Start/Stop/Skip controls fixed with proper device initialization
- [x] [HIGH] BUG: Power Dialer not advancing to next number - fixed counter-based call end detection (PowerDialerControls.tsx:137-145)
- [x] [HIGH] BUG: Rapid dialing causes dialpad glitch - added isDialing guard to prevent concurrent calls (DialerPanel.tsx:27,71,166,389)

### UI Changes - Jan 2026 Implementation
- [x] [HIGH] UI: Phone number entry uses simple text input (DialerPanel.tsx:299-320), DTMF keypad retained for in-call digit sending
- [x] [MEDIUM] UI: Auto-refresh dialer state after call ends - added auto-reset timeout (useDialer.ts:200-204,212-216,225-230)

### Enhancements - Jan 2026 Implementation
- [x] [CRITICAL] ENHANCE: Power Dialer overhaul - fixed auto-dial with device initialization (DialerPanel.tsx:68-106), counter-based advance

### Bug Fixes - Jan 2026 (Part 2) - Implementation Verified
- [x] [HIGH] BUG: Power Dialer cadence - calls can overlap if countdown starts before call ends
  - Root cause: Countdown starts immediately after callEndedCount increments
  - Fix: Wait for callState === "idle" before starting next countdown (pendingCountdownRef pattern)
  - Files: PowerDialerControls.tsx:38-41,149-156, page.tsx:356-357
- [x] [MEDIUM] BUG: Call history shows phone numbers instead of lead names
  - Root cause: call.repository.ts doesn't join with lead table
  - Fix: Add lead table join, update CallResponse type, display in UI
  - Files: call.repository.ts:65,90-91, dialer.ts:199-200, CallHistory.tsx:107-131

### Bugs/Features to Fix - Not Implemented
- [ ] [HIGH] FEATURE: Power Dialer keyboard navigation
  - Add keyboard arrow keys (up/down) to toggle between leads in list
  - Skip button is one-way, need two-way navigation
  - Enter key to select and auto-call a lead
  - Auto-advance to next lead when speed dial is on
  - Lead list as scrollable cards that can be clicked to call
  - Manual dial mode: option to load a list OR type number manually
  - Files: PowerDialerControls.tsx, DialerPanel.tsx, page.tsx

- [ ] [HIGH] BUG: Live monitoring admin restriction
  - Live monitoring should only be visible to admin users
  - Notification for power dialing/session activity should be sent to admin emails for the workspace
  - Not for regular reps to see
  - Fix: Add role check for live monitoring visibility, implement email notifications
  - Files: LiveMonitor.tsx, dialer.service.ts, notification.service.ts

- [ ] [HIGH] BUG: Session persistence
  - Power dialing sessions and campaign sessions not saved
  - Refreshing page removes all state/history for the session
  - Need to persist workflow state and history (cookies/localStorage/DB)
  - Fix: Store session state in localStorage or DB, restore on page load
  - Files: useDialer.ts, PowerDialerControls.tsx, powerDialer.service.ts

- [ ] [MEDIUM] FEATURE: Lead detail info in dialer
  - When lead card pops up as next to call, show detailed info
  - Display social links as icon buttons (LinkedIn opens in new tab)
  - Show notes written for the lead
  - Toggle between LinkedIn tab and notes natively in dialer interface
  - Files: DialerPanel.tsx, LeadInfoCard.tsx (new), useLeadDetails.ts

### New Feature - Jan 2026 (Live Listening)
- [ ] [NEW] Live listening capability for managers/admins
  - Email notification when rep starts power dialer session
  - View active dialer sessions in organization
  - Listen to calls in real-time using Twilio Conference
  - Files: New tables, new services, webhook modifications, frontend dashboard

---

## Overview

Enhance dialer with power dialer mode, client/campaign workflow, call scripting, recording association with leads, and UI cleanup (remove dialpad).

---

## Requirements

### 1. Power Dialer Mode

**Auto-Advance Calling**
- Automatically dial next lead after call ends
- Configurable delay between calls (0-30 seconds)
- Pause/resume power dialing
- Skip lead button
- Progress indicator

**Power Dialer Controls**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Power Dialer                                              [Start] [Stop]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Client: [Acme Corp ▼]                                                     │
│  Campaign: [Q1 Outreach ▼]                                                 │
│  List: [West Coast VPs ▼]                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Progress: 23 / 156 leads  ████████░░░░░░░░░░░░  15%                       │
│  Delay between calls: [5 seconds ▼]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Client → Campaign → List Workflow

**Selection Hierarchy**
1. Select Client (shows only that client's campaigns)
2. Select Campaign (shows only that campaign's lists)
3. Select List (loads leads for dialing)

**List Swapping**
- Easy dropdown to switch lists mid-session
- List progress saved per list
- Resume where left off when switching back

### 3. Remove Dialpad, Use Text Input

**Before (Remove)**
```
┌───────────────────┐
│  [1]  [2]  [3]   │
│  [4]  [5]  [6]   │
│  [7]  [8]  [9]   │
│  [*]  [0]  [#]   │
└───────────────────┘
```

**After (Text Field)**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Phone: [+1 (___) ___-____]                                    [Call]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Simple text input with phone formatting
- Paste-friendly
- Clear button

### 4. Call Scripting

**Script Display During Calls**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Script: Q1 Sales Pitch                                         [Minimize] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INTRO:                                                                    │
│  "Hi {firstName}, this is {repName} calling from {companyName}.           │
│  I'm reaching out because..."                                              │
│                                                                             │
│  QUALIFYING QUESTIONS:                                                     │
│  1. Are you currently using any sales automation tools?                    │
│  2. What's your biggest challenge with outbound calling?                   │
│                                                                             │
│  CLOSE:                                                                    │
│  "Would you be open to a 15-minute demo next week?"                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Script Features**
- Scripts attached to campaigns
- Variable substitution ({firstName}, {company}, etc.)
- Collapsible/expandable panel
- Script CRUD in campaign settings

### 5. Customizable Dispositions

**Disposition Editor**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Call Dispositions                                            [+ Add New]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Drag] │ Connected        │ [Green  ▼] │ [Edit] [Delete]                  │
│  [Drag] │ Left Voicemail   │ [Yellow ▼] │ [Edit] [Delete]                  │
│  [Drag] │ No Answer        │ [Gray   ▼] │ [Edit] [Delete]                  │
│  [Drag] │ Wrong Number     │ [Red    ▼] │ [Edit] [Delete]                  │
│  [Drag] │ Not Interested   │ [Orange ▼] │ [Edit] [Delete]                  │
│  [Drag] │ Callback         │ [Blue   ▼] │ [Edit] [Delete]                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Custom label text
- Color picker (predefined palette)
- Drag to reorder
- Organization-wide dispositions

### 6. Fix Voicemail Drops

**Current Issue**
- Voicemail drops not working

**Requirements**
- Pre-recorded voicemail audio files
- Drop voicemail during active call
- Automatic disconnect after drop

**Experimental: Mass Voicemail**
- Send voicemail to entire list
- Ringless voicemail delivery (if supported by carrier)
- Progress tracking
- Flag as experimental feature

### 7. Link Call Recordings to Lead Profiles

**Recording Association**
- Each call record linked to lead ID
- Recordings accessible from lead profile
- Recordings listed with date/time/duration

**Lead Profile Call History**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Call History for Fox Lorber                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Jan 10, 2024 2:30 PM  │  3:45  │  Connected     │  [▶ Play]  [Download]  │
│  Jan 8, 2024 10:15 AM  │  0:32  │  Left Voicemail│  [▶ Play]  [Download]  │
│  Jan 5, 2024 4:00 PM   │  1:15  │  No Answer     │  [▶ Play]  [Download]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8. Admin-Only Twilio Config

**Settings Tab Permissions**
- Admin/Owner: Full Twilio configuration access
- Members:
  - View/edit dispositions
  - View/manage voicemail drops
  - NO access to Twilio config
  - Cannot disable call recording (always on)

**Dialer Settings Tab Structure**
```
For Admin/Owner:
├── Twilio Configuration
│   ├── Account SID
│   ├── Auth Token
│   └── Phone Numbers
├── Call Dispositions
├── Voicemail Drops
└── Call Recording (always enabled, info only)

For Members:
├── Call Dispositions
├── Voicemail Drops
└── Call Recording (info: "All calls are recorded")
```

### 9. Auto-Record All Calls

- Recording enabled by default, cannot be disabled
- Recording indicator during calls
- Recordings stored in Twilio/S3
- Recording URL saved to Call record

---

## API Changes

### Modified Endpoints

**GET /api/dialer/config/:organizationId**
- Add role check: return limited config for non-admins

**PATCH /api/dispositions/:id**
- Add `color` field support

### New Endpoints

**Scripts CRUD**
```
GET    /api/scripts              - List scripts for org
GET    /api/scripts/:id          - Get single script
POST   /api/scripts              - Create script
PATCH  /api/scripts/:id          - Update script
DELETE /api/scripts/:id          - Delete script
```

**Script Response**
```typescript
interface Script {
  id: string;
  name: string;
  content: string;  // markdown/text with variables
  campaignId?: string;  // optional campaign association
  organizationId: string;
  createdAt: string;
}
```

**Power Dialer Progress**
```
GET  /api/power-dialer/progress/:campaignId/:listId  - Get current position
POST /api/power-dialer/progress/:campaignId/:listId  - Update position
```

**Mass Voicemail (Experimental)**
```
POST /api/voicemail/mass-send    - Queue mass voicemail job
GET  /api/voicemail/mass-send/:jobId  - Check job progress
```

### Call Recording Association

**Existing: POST /api/calls**
- Ensure `leadId` is always set when calling a lead
- Recording URL populated after call ends (webhook)

**GET /api/leads/:id/calls**
- Return all calls for a lead with recording URLs

---

## Database Changes

### New Table: Script

```sql
CREATE TABLE "Script" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "campaignId" TEXT,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id"),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
);
```

### New Table: PowerDialerProgress

```sql
CREATE TABLE "PowerDialerProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "currentIndex" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id"),
  FOREIGN KEY ("listId") REFERENCES "LeadList"("id"),
  UNIQUE ("userId", "campaignId", "listId")
);
```

### Modify Disposition Table

```sql
ALTER TABLE "Disposition" ADD COLUMN "color" TEXT DEFAULT '#gray';
```

---

## Files to Modify (Exclusive Ownership)

### Frontend
- `frontend/app/dashboard/dialer/page.tsx` - Main dialer page
- `frontend/components/dialer/DialerPanel.tsx` - Main panel
- `frontend/components/dialer/PowerDialer.tsx` - New power dialer component
- `frontend/components/dialer/CallPanel.tsx` - Active call display
- `frontend/components/dialer/PhoneInput.tsx` - Replace dialpad
- `frontend/components/dialer/ScriptPanel.tsx` - New script display
- `frontend/components/dialer/DispositionPicker.tsx` - Update with colors
- `frontend/components/dialer/DispositionEditor.tsx` - New CRUD component
- `frontend/components/dialer/VoicemailManager.tsx` - Update/fix
- `frontend/components/dialer/DialerSettings.tsx` - Role-based settings
- `frontend/hooks/api/useDialer.ts` - Update hooks
- `frontend/hooks/api/useScripts.ts` - New hook

### Backend
- `backend/src/api/routes/calls.ts` - Update routes
- `backend/src/api/routes/scripts.ts` - New routes
- `backend/src/api/routes/dialer.ts` - Update config endpoint
- `backend/src/api/controllers/call.controller.ts`
- `backend/src/api/controllers/script.controller.ts` - New
- `backend/src/services/call.service.ts`
- `backend/src/services/script.service.ts` - New
- `backend/src/services/voicemail.service.ts` - Fix/enhance
- `backend/src/services/powerDialer.service.ts` - New
- `backend/src/repositories/call.repository.ts`
- `backend/src/repositories/script.repository.ts` - New

### Shared
- `shared/types/src/requests/dialer.ts` - Update types
- `shared/types/src/requests/script.ts` - New types

---

## Implementation Order

1. Remove dialpad, add phone text input
2. Add color field to dispositions
3. Create disposition editor UI
4. Create Script table and backend
5. Add script panel to dialer UI
6. Implement client → campaign → list selection
7. Create power dialer progress tracking
8. Implement auto-advance logic
9. Ensure calls are linked to leads
10. Add call history to lead profiles
11. Implement admin-only Twilio config
12. Fix voicemail drop functionality
13. (Experimental) Mass voicemail feature

---

## Testing Checklist

- [ ] Phone text input works with various formats
- [ ] Dispositions show correct colors
- [ ] Dispositions can be edited (label + color)
- [ ] Scripts can be created/edited/deleted
- [ ] Script displays during active call
- [ ] Variable substitution works in scripts
- [ ] Client dropdown shows all clients
- [ ] Campaign dropdown filters by client
- [ ] List dropdown filters by campaign
- [ ] Power dialer advances to next lead
- [ ] Power dialer respects delay setting
- [ ] Power dialer progress saves/resumes
- [ ] Calls are linked to lead records
- [ ] Call recordings appear in lead profile
- [ ] Recording playback works
- [ ] Members cannot see Twilio config
- [ ] Admins can see full settings
- [ ] Voicemail drops work during calls
