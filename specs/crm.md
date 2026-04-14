# CRM Pipeline Feature Spec

**Module Owner:** This session
**Status:** In Progress

---

## Implementation Status (Updated Jan 2026)

### Bug Fixes - Phase 3
- [x] BUG: [CRITICAL] Pipeline stages reorder route not working - Express route ordering issue (`/reorder` was after `/:id` routes, causing "reorder" to match as ID parameter) - Fixed in `backend/src/api/routes/pipeline.ts:36-41`
- [x] BUG: CallHistory component using wrong hook (`useCalls` instead of `useLeadCalls`) - was hitting general `/calls` endpoint instead of lead-specific `/leads/{id}/calls` endpoint - Fixed in `frontend/components/crm/CallHistory.tsx:3,56`
- [x] BUG: Silent error handling in `useLeads` hook swallowed errors and returned empty data, masking API failures - Fixed in `frontend/hooks/api/useLeads.ts:61-85`
- [x] BUG: Silent error handling in `useLead` hook returned null on errors, making it impossible to distinguish "not found" from API errors - Fixed in `frontend/hooks/api/useLeads.ts:94-100`
- [x] BUG: Unused `_dragOverStageId` state variable in PipelineBoard - Removed dead code in `frontend/components/crm/PipelineBoard.tsx`

### Completed Features - Phase 1 (Pipeline Board)
- [x] Lead total calculation (backend works)
- [x] Lead Detail Panel shows when clicking leads (LeadSlideOutPanel.tsx)
- [x] CRM leads created successfully via CreateLeadModal
- [x] Lead counts display in pipeline stage headers (via getStageStats API)
- [x] Value sums per pipeline column (PipelineColumn.tsx footer)
- [x] Activity indicators on lead cards (green=recent, gray=stale in LeadCard.tsx)
- [x] No manual refresh button - React Query handles auto-refetch
- [x] Pipeline stage invalidation on lead CRUD operations (useLeads.ts)

### Completed Features - Phase 2 (Pipeline Promotion)
- [x] "Add to Pipeline" bulk action in Leads tab (AddToPipelineDropdown.tsx)
- [x] "Add to Pipeline" in Lists detail page three-dot menu per lead
- [x] Click-to-call navigates to app dialer instead of tel: links
- [x] Dialer page accepts phone/leadId query params for auto-dial
- [x] Backend endpoint: POST /leads/bulk-add-to-pipeline

### Bug Fixes - Phase 4 (Jan 2026)
- [x] BUG: Disposition editing after call - Added disposition dropdown with edit capability in CallHistory.tsx. Users can now click pencil icon to edit call disposition after call ends. Fixed in `frontend/components/crm/CallHistory.tsx` and invalidation added in `frontend/hooks/api/useCalls.ts`
- [x] BUG: CRM loading UX - Replaced spinner with skeleton loading in LeadSlideOutPanel and leads/[id]/page.tsx for better perceived performance. Fixed in `frontend/components/crm/LeadSlideOutPanel.tsx:151-186` and `frontend/app/dashboard/leads/[id]/page.tsx:168-222`
- [x] BUG: Add task feature broken - Date format conversion issue. Date input returns YYYY-MM-DD but API expects ISO datetime. Added conversion to datetime string before API call. Fixed in `frontend/components/crm/TaskList.tsx:32-39`
- [x] BUG: Edit lead fields blank - Race condition with queueMicrotask in useEffect. Changed to use initializeForm() function called when Edit button is clicked, ensuring form data is populated from current lead data. Fixed in `frontend/components/crm/LeadSlideOutPanel.tsx:61-88,265`

### Key Files
**Phase 4 - Bug Fixes (Jan 2026):**
- `frontend/components/crm/CallHistory.tsx` - Added disposition editing with dropdown
- `frontend/hooks/api/useCalls.ts` - Added lead query invalidation on disposition change
- `frontend/components/crm/LeadSlideOutPanel.tsx` - Skeleton loading + initializeForm for edit
- `frontend/app/dashboard/leads/[id]/page.tsx` - Skeleton loading for lead detail
- `frontend/components/crm/TaskList.tsx` - Fixed date to datetime conversion

**Phase 3 - Bug Fixes:**
- `backend/src/api/routes/pipeline.ts` - Fixed route ordering (reorder before :id params)

**Phase 1 - Pipeline Board:**
- `frontend/app/dashboard/crm/page.tsx` - Main CRM page
- `frontend/components/crm/PipelineBoard.tsx` - Kanban board with drag-drop
- `frontend/components/crm/PipelineColumn.tsx` - Column with count badge and value sum
- `frontend/components/crm/LeadCard.tsx` - Card with activity indicator
- `frontend/components/crm/LeadSlideOutPanel.tsx` - Detail panel with tabs
- `frontend/hooks/api/useLeads.ts` - Lead mutations with pipeline invalidation
- `backend/src/repositories/lead.repository.ts` - getStageStats for counts/values

**Phase 2 - Pipeline Promotion:**
- `frontend/components/leads/AddToPipelineDropdown.tsx` - Dropdown for bulk add to pipeline
- `frontend/components/leads/BulkActionBar.tsx` - Bulk action bar with pipeline button
- `frontend/components/leads/LeadTable.tsx` - Click-to-call uses app dialer
- `frontend/app/dashboard/lists/[id]/page.tsx` - Three-dot menu with pipeline option
- `frontend/app/dashboard/dialer/page.tsx` - Query param support for auto-dial
- `backend/src/api/routes/leads.ts` - POST /leads/bulk-add-to-pipeline route

---

## Overview

Redesign the CRM pipeline to follow Attio-inspired patterns with enhanced data visibility and streamlined UX.

---

## Requirements

### 1. Pipeline Board Enhancements

**Lead Count Per Stage**
- Display lead count badge in each pipeline column header
- Count only leads in that specific stage (not total DB)
- Format: `Stage Name (12)`

**Pipeline Value Sum**
- Show total deal value at the bottom of each column
- Sum all `dealValue` fields for leads in that stage
- Format: `$125,000` or `$0` if no values
- Clicking sum could optionally filter to leads with values

**Remove Refresh Button**
- Pipeline should use React Query with automatic refetch
- Remove manual refresh - data stays fresh via invalidation

### 2. Lead Detail Panel (Slide-out)

When a lead is clicked, show a detail panel with:

**Header Section**
```
┌─────────────────────────────────────────┐
│  [Avatar]  John Smith            [X]    │
│            VP Sales @ Acme Corp         │
│            +1 (212) 555-1234            │
└─────────────────────────────────────────┘
```

**Tabbed Content**
- **Overview Tab**: All contact fields, deal info, pipeline stage selector
- **Activity Tab**: Timeline of calls, notes, tasks (chronological)
- **Notes Tab**: Create/view notes with timestamps
- **Tasks Tab**: Create/view/complete tasks
- **Calls Tab**: Call history with recording playback links

**Contact Fields Displayed**
- Name (first + last)
- Phone (click-to-call)
- Email (click-to-email)
- Company
- Title
- LinkedIn URL (external link)
- Deal Value
- Pipeline Stage (dropdown to move)
- Created date
- Last contacted date

### 3. UI Polish

**Pipeline Columns**
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ New Leads (24)   │  │ Contacted (18)   │  │ Qualified (7)    │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │
│ │ John Smith   │ │  │ │ Jane Doe     │ │  │ │ Bob Wilson   │ │
│ │ Acme Corp    │ │  │ │ Tech Inc     │ │  │ │ Sales Co     │ │
│ │ $50,000      │ │  │ │ $25,000      │ │  │ │ $100,000     │ │
│ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │
│                  │  │                  │  │                  │
│ ┌──────────────┐ │  │                  │  │                  │
│ │ ...          │ │  │                  │  │                  │
│ └──────────────┘ │  │                  │  │                  │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│     $750,000     │  │     $425,000     │  │     $100,000     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Lead Cards**
- Name (bold)
- Company
- Deal value (if present)
- Last activity indicator (dot: green=recent, gray=stale)
- Drag handle for moving between stages

---

## API Changes

### Existing Endpoints (Modify)

**GET /api/leads**
- Add query param: `pipelineStageId` to filter by stage
- Add query param: `includeCounts=true` for stage counts

**GET /api/pipeline-stages**
- Include `leadCount` in response
- Include `totalValue` sum in response

### New Endpoints

**GET /api/leads/:id/activity**
- Returns combined timeline of calls, notes, tasks
- Sorted by date descending
- Response:
```typescript
interface ActivityItem {
  id: string;
  type: 'call' | 'note' | 'task';
  content: string;
  createdAt: string;
  metadata?: {
    duration?: number;      // for calls
    recordingUrl?: string;  // for calls
    completed?: boolean;    // for tasks
  };
}
```

---

## Database Changes

No schema changes required. Use existing:
- `Lead` table (has `dealValue`, `pipelineStageId`)
- `Note` table (linked to leads)
- `Task` table (linked to leads)
- `Call` table (linked to leads)

---

## Files to Modify (Exclusive Ownership)

### Frontend
- `frontend/app/dashboard/crm/page.tsx` - Main pipeline page
- `frontend/components/crm/PipelineBoard.tsx` - Board component
- `frontend/components/crm/PipelineColumn.tsx` - Column with footer sum
- `frontend/components/crm/LeadCard.tsx` - Card component
- `frontend/components/crm/LeadDetailPanel.tsx` - New slide-out panel
- `frontend/components/crm/ActivityTimeline.tsx` - New activity feed
- `frontend/hooks/api/useCRM.ts` - New hook for CRM data

### Backend
- `backend/src/api/controllers/pipeline.controller.ts`
- `backend/src/services/pipeline.service.ts`
- `backend/src/repositories/pipelineStage.repository.ts`

---

## Implementation Order

1. Remove refresh button from pipeline page
2. Add lead count to pipeline stage query
3. Add value sum to pipeline columns
4. Create LeadDetailPanel component
5. Add activity timeline component
6. Wire up note/task CRUD in panel
7. Add call history with recording links

---

## Testing Checklist

### Phase 1 - Pipeline Board
- [ ] Pipeline shows correct lead count per stage
- [ ] Value sums calculate correctly
- [ ] Drag-drop still works between stages
- [ ] Lead detail panel opens on card click
- [ ] All tabs show correct data
- [ ] Notes can be created/edited
- [ ] Tasks can be created/completed
- [ ] Call recordings play correctly
- [ ] Panel closes with X or click-outside

### Phase 2 - Pipeline Promotion
- [ ] Leads tab: Select leads → "Add to Pipeline" dropdown → select stage → leads added
- [ ] Lists tab: Click three-dot menu → "Add to Pipeline" → select stage → lead added
- [ ] Leads tab: Click phone number → redirects to /dashboard/dialer with params
- [ ] Leads tab: Click "Call" in dropdown → redirects to dialer
- [ ] Dialer: With phone/leadId params → auto-populates and initiates call
- [ ] CRM Pipeline: Promoted leads appear in correct stage
