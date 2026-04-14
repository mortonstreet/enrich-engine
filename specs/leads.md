# Leads Feature Spec

**Module Owner:** This session
**Status:** Production Ready

---

## Implementation Status (Updated Jan 2026)

### Already Implemented
- Lead list display with sortable columns
- Normal search (semantic search working)
- Multi-select checkboxes

### Production Bugs to Fix (PRIORITY)
- [x] Cannot add new leads in production - Fixed: Phone validation now accepts various formats
- [x] Lead detail view throws 404 when clicking on a lead - Fixed: Created /dashboard/leads/[id] page
- [x] Smart Query interprets queries but doesn't fetch/display data accurately - Fixed: Wired up smart filters to lead list query

### Feature Updates Requested
- [x] Remove restriction that only allows adding leads to ACTIVE campaigns - Fixed: Now shows all campaigns

### Bugs to Fix - Not Implemented
- [x] [CRITICAL] BUG: UI layout cuts off at 100% browser zoom - Fixed: Added min-w-0 and proper overflow handling to flex layout
- [x] [CRITICAL] BUG: LinkedIn URL "View Profile" button does not open in browser - Fixed: Added URL normalization to prepend https:// when protocol is missing
- [x] [CRITICAL] BUG: Lead detail modal does not display LinkedIn profile - Fixed: LinkedIn now displays properly with normalized URLs across all components

### Bugs to Fix - Jan 2026 (Cross-View Sync)
- [x] [HIGH] BUG: First/Last name not synced between Leads tab and Lists tab - Fixed: Cross-view query invalidation added in both useLeads.ts and useLists.ts useUpdateLead hooks
- [x] [HIGH] BUG: Notes, tasks, scheduling not visible in lead view - Fixed: Added tabbed interface with Overview, Activity, Notes, Tasks, and Calls tabs in lead detail page

### Enhancement - Not Implemented
- [ ] [MEDIUM] ENHANCE: Smart query improvements for specific searches
  - Need more specific search capability beyond semantic search
  - Example: "CFOs in pest control" should match:
    - Lead title = "CFO" AND company name contains "pest control"
  - Consider adding industry column/data type for more specific filtering
  - Goal: effortless, seamless targeted list creation from existing lead data
  - Reduce reliance on semantic/keyword search for precise queries
  - Fix: Enhance smart query parser to handle compound title+industry queries
  - Consider: Add "industry" field to Lead schema for better categorization
  - Files: smartQuery.service.ts, SmartQueryModal.tsx, lead.repository.ts

---

## Overview

Redesign leads tab with Attio-inspired list interface, multi-select capabilities, and smart query/natural language search for building lists from existing leads.

---

## Requirements

### 1. Attio-Style List Interface

**Remove Grid View**
- Single list view only (no toggle)
- Clean table format with sortable columns

**List Layout**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Leads                                                      [+ Add Lead]    │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Search leads...]                              [Smart Query] [Add to ▼]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ ] │ Name          │ Company      │ Phone        │ Email        │ ···   │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ ] │ John Smith    │ Acme Corp    │ 212-555-1234 │ john@acme... │ [···] │
│  [x] │ Jane Doe      │ Tech Inc     │ 415-555-5678 │ jane@tech... │ [···] │
│  [x] │ Bob Wilson    │ Sales Co     │ 312-555-9012 │ bob@sales... │ [···] │
│  [ ] │ Alice Brown   │ Marketing    │ 617-555-3456 │ alice@mar... │ [···] │
└─────────────────────────────────────────────────────────────────────────────┘
│  Showing 1-20 of 1,245 leads                        [◀] [1] [2] [3] [▶]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Columns (Default)**
- Checkbox (for selection)
- Name (first + last combined)
- Company
- Phone
- Email
- Created (relative date)
- Actions (menu)

### 2. Multi-Select Functionality

**Selection Behavior**
- Checkbox on each row
- "Select all" checkbox in header (current page)
- Selection persists while searching (key feature)
- Selected count shown in bulk action bar

**Bulk Action Bar (appears when items selected)**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  3 leads selected                    [Add to Campaign ▼] [Delete] [Clear]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Add to Campaign Flow**
1. Select leads using checkboxes
2. Click "Add to Campaign" dropdown
3. Select existing campaign OR create new
4. Leads added to campaign's lead list

### 3. Smart Query / Natural Language Search

**Smart Query Button**
- Opens modal for advanced searching
- Natural language input parsed to filters

**Smart Query Modal**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Smart Query                                                           [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Describe the leads you're looking for:                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VPs and Directors at tech companies in New York                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Interpreted as:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ title CONTAINS "VP" OR "Director"                                   │   │
│  │ AND company CONTAINS "tech"                                         │   │
│  │ AND (city = "New York" OR state = "NY")                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Preview: 47 leads match                              [Cancel] [Apply]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Query Examples**
- "all leads from California" → state = CA
- "leads with @gmail emails" → email CONTAINS gmail
- "companies with more than 100 employees" → employeeCount > 100
- "VPs at tech companies" → title CONTAINS VP AND company type = tech
- "leads created this month" → createdAt > start of month
- "leads I haven't called" → callCount = 0

**Query Implementation Options**
1. **Rule-based parsing**: Pattern matching for common queries
2. **LLM-powered**: Send query to Claude API for interpretation
3. **Hybrid**: Rule-based first, fallback to LLM for complex queries

### 4. Search While Multi-Selecting

**Persistent Selection**
- Selected lead IDs stored in state
- Searching doesn't clear selection
- Can search to find more leads to add to selection
- Selection count always visible

**Workflow Example**
1. Search "tech companies" → select 5 leads
2. Search "California" → select 3 more leads
3. Search "VP" → select 2 more leads
4. Total selected: 10 leads from different searches
5. Add all 10 to campaign at once

### 5. Google Sheets Integration (Optional/Phase 2)

**Import from Sheets**
- Connect Google account (OAuth)
- Select spreadsheet and sheet
- Map columns to lead fields
- Import as new list or append

**Export to Sheets**
- Export current view or selection
- Create new sheet or append to existing
- Maintain sync (optional webhook)

---

## API Changes

### Modified Endpoints

**GET /api/leads**
- Add support for complex filter queries
- Add `smartQuery` query param for natural language

**Request**
```typescript
GET /api/leads?smartQuery=VPs at tech companies
// OR
GET /api/leads?filters[title][$contains]=VP&filters[company][$contains]=tech
```

### New Endpoints

**POST /api/leads/smart-query**
- Parse natural language query
- Return filter interpretation + preview count

**Request**
```typescript
interface SmartQueryRequest {
  query: string;
  previewOnly?: boolean;  // just return count, not leads
}
```

**Response**
```typescript
interface SmartQueryResponse {
  interpretation: {
    filters: FilterObject;
    humanReadable: string;
  };
  previewCount: number;
  leads?: Lead[];  // only if previewOnly=false
}
```

**POST /api/leads/bulk-add-to-campaign**
- Add multiple leads to campaign

**Request**
```typescript
interface BulkAddRequest {
  leadIds: string[];
  campaignId: string;
}
```

### Google Sheets Endpoints (Phase 2)

```
GET  /api/integrations/google/auth      - Initiate OAuth
GET  /api/integrations/google/callback  - OAuth callback
GET  /api/integrations/google/sheets    - List user's sheets
POST /api/leads/import/google-sheets    - Import from sheet
POST /api/leads/export/google-sheets    - Export to sheet
```

---

## Database Changes

No schema changes required for core features.

### For Smart Query (if using saved queries)

```sql
CREATE TABLE "SavedQuery" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
);
```

---

## Files to Modify (Exclusive Ownership)

### Frontend
- `frontend/app/dashboard/leads/page.tsx` - Main leads page
- `frontend/components/leads/LeadsList.tsx` - List component (replaces grid)
- `frontend/components/leads/LeadRow.tsx` - Row component
- `frontend/components/leads/LeadFilters.tsx` - Filter bar
- `frontend/components/leads/SmartQueryModal.tsx` - New modal
- `frontend/components/leads/BulkActionBar.tsx` - New component
- `frontend/components/leads/AddToCampaignDropdown.tsx` - New component
- `frontend/hooks/api/useLeads.ts` - Update hooks
- `frontend/hooks/useLeadSelection.ts` - New selection state hook

### Backend
- `backend/src/api/routes/leads.ts` - Add new endpoints
- `backend/src/api/controllers/lead.controller.ts`
- `backend/src/services/lead.service.ts`
- `backend/src/services/smartQuery.service.ts` - New service
- `backend/src/repositories/lead.repository.ts`

### Shared
- `shared/types/src/requests/lead.ts` - Update types

---

## Implementation Order

1. Convert to list-only view (remove grid toggle)
2. Add multi-select with checkboxes
3. Create bulk action bar component
4. Implement "Add to Campaign" bulk action
5. Build smart query modal UI
6. Implement smart query parsing (start rule-based)
7. Add query preview with count
8. Ensure selection persists across searches
9. (Phase 2) Google Sheets OAuth integration
10. (Phase 2) Import/export functionality

---

## Smart Query Parsing Rules (v1)

Start with rule-based parsing for common patterns:

```typescript
const parseSmartQuery = (query: string): Filters => {
  const filters: Filters = {};

  // Title patterns
  if (/\b(VP|Director|Manager|CEO|CTO)\b/i.test(query)) {
    filters.title = { $contains: query.match(/\b(VP|Director|Manager|CEO|CTO)\b/i)[0] };
  }

  // State patterns
  if (/\b(California|CA|New York|NY|Texas|TX)\b/i.test(query)) {
    filters.state = extractState(query);
  }

  // Email patterns
  if (/@(\w+)/.test(query)) {
    filters.email = { $contains: query.match(/@(\w+)/)[1] };
  }

  // Date patterns
  if (/this (week|month|year)/i.test(query)) {
    filters.createdAt = { $gte: getDateRange(query) };
  }

  // Not called patterns
  if (/haven't called|not called|never called/i.test(query)) {
    filters.callCount = { $eq: 0 };
  }

  return filters;
};
```

---

## Testing Checklist

- [ ] List view displays all leads correctly
- [ ] Sorting works on all columns
- [ ] Multi-select persists across pagination
- [ ] Multi-select persists across searches
- [ ] Bulk "Add to Campaign" works
- [ ] Smart query modal opens
- [ ] Basic queries parse correctly
- [ ] Preview count is accurate
- [ ] Applied filters show correct results
- [ ] Selection can be cleared
- [ ] Add lead dialog still works
- [ ] Delete single lead still works
