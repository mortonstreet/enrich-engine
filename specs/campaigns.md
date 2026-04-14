# Campaigns Feature Spec

**Module Owner:** This session
**Status:** Complete

---

## Implementation Status (Updated Jan 2026)

### Already Implemented
- Client entity creation and management
- Filtering campaigns by client
- Active/Inactive auto-status (7-day rule)
- Multi-step campaign creation flow (Name → Client → Upload)

### Production Bugs Fixed
- [x] CSV file upload: silent failure - fixed by properly handling orgId closure and improving error handling in `useUploadCsv` hook

### Bugs Fixed
- [x] [HIGH] BUG: Campaign status shows "inactive" despite activity
  - Root cause: lastCalledAt was never being updated when calls were made
  - Fix: Added updateLastCalledAt to campaign.repository.ts and call it from initiateOutboundCall in dialer.service.ts
  - Files modified: backend/src/repositories/campaign.repository.ts, backend/src/services/dialer.service.ts

- [x] [MEDIUM] BUG: Title formatting inconsistency
  - Campaigns tab title was using text-2xl while other tabs used text-4xl md:text-5xl
  - Fix: Updated h1 styling to match Dialer and Leads pages
  - Files modified: frontend/app/dashboard/campaigns/page.tsx

---

## Overview

Redesign campaigns to use a client-based organization system instead of types. Campaigns are grouped by client, with automatic status based on calling activity.

---

## Requirements

### 1. Client Tagging System

**Replace "Types" with "Clients"**
- Remove existing type dropdown (Personal/Team)
- Add new "Client" entity for organizing campaigns
- Users can create/edit/delete clients
- Each campaign belongs to one client

**Client Management**
- Create client modal: name, optional color/icon
- Edit client inline or via modal
- Delete client (must reassign or delete campaigns first)
- List clients in a dropdown/filter

### 2. Campaign Filtering

**Filter Bar**
```
┌─────────────────────────────────────────────────────────────┐
│  Client: [All Clients ▼]  Status: [All ▼]  Search: [____]  │
└─────────────────────────────────────────────────────────────┘
```

- **Client Filter**: Dropdown with all clients + "All Clients" option
- **Status Filter**: Active / Inactive / All
- **Search**: Filter by campaign name

### 3. Dynamic Status (Automatic)

**Remove Manual Pause/Resume**
- No user controls for pausing/resuming
- Status determined automatically by calling activity

**Status Logic**
- **Active**: At least one call made in the last 7 days
- **Inactive**: No calls in the last 7 days

**Visual Indicator**
- Active: Green badge
- Inactive: Gray badge
- Show "Last called: 3 days ago" text

### 4. New Campaign Flow

**Step 1: Basic Info**
```
┌─────────────────────────────────────────────────────────────┐
│  Create New Campaign                                   [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Campaign Name: [________________________]                  │
│                                                             │
│  Client: [Select Client ▼]  [+ New Client]                 │
│                                                             │
│                                          [Cancel] [Next →] │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Upload List**
```
┌─────────────────────────────────────────────────────────────┐
│  Add Leads to Campaign                                 [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [  Drag & drop CSV file here  ]                           │
│  [  or click to browse         ]                           │
│                                                             │
│  ─── OR ───                                                │
│                                                             │
│  Select Existing List: [Choose List ▼]                     │
│                                                             │
│                                   [← Back] [Create Campaign]│
└─────────────────────────────────────────────────────────────┘
```

### 5. Campaign Card Updates

```
┌─────────────────────────────────────────────────────────────┐
│  Acme Corp Outreach                         [Active] [···] │
│  Client: Acme Corp                                         │
│  Leads: 245  |  Called: 89  |  Remaining: 156              │
│  Last called: 2 hours ago                                  │
└─────────────────────────────────────────────────────────────┘
```

- Show client name
- Show lead stats (total, called, remaining)
- Show last called timestamp
- Action menu: Edit, Delete (no pause/resume)

---

## API Changes

### New Endpoints

**Clients CRUD**
```
GET    /api/clients              - List all clients for org
POST   /api/clients              - Create client
PATCH  /api/clients/:id          - Update client
DELETE /api/clients/:id          - Delete client
```

**Client Response**
```typescript
interface Client {
  id: string;
  name: string;
  color?: string;
  organizationId: string;
  campaignCount: number;
  createdAt: string;
}
```

### Modified Endpoints

**GET /api/campaigns**
- Replace `type` query param with `clientId`
- Add `lastCalledAt` to response
- Status calculated dynamically (not stored)

**POST /api/campaigns**
- Replace `type` field with `clientId`
- Remove `status` field (calculated)

**Campaign Response Update**
```typescript
interface Campaign {
  id: string;
  name: string;
  clientId: string;
  client: Client;
  status: 'active' | 'inactive';  // calculated
  lastCalledAt: string | null;
  leadCount: number;
  calledCount: number;
  remainingCount: number;
  organizationId: string;
  createdAt: string;
}
```

---

## Database Changes

### New Table: Client

```sql
CREATE TABLE "Client" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
);

CREATE INDEX "Client_organizationId_idx" ON "Client"("organizationId");
```

### Modify Campaign Table

```sql
-- Add clientId column
ALTER TABLE "Campaign" ADD COLUMN "clientId" TEXT;

-- Add foreign key
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id");

-- Remove type column (after migration)
ALTER TABLE "Campaign" DROP COLUMN "type";

-- Remove status column (calculated dynamically)
ALTER TABLE "Campaign" DROP COLUMN "status";
```

### Migration Strategy

1. Create Client table
2. Create default "General" client for each org
3. Add clientId column to Campaign (nullable initially)
4. Migrate existing campaigns to "General" client
5. Make clientId required
6. Remove type and status columns

---

## Files to Modify (Exclusive Ownership)

### Frontend
- `frontend/app/dashboard/campaigns/page.tsx` - Main campaigns page
- `frontend/components/campaigns/CampaignList.tsx` - List component
- `frontend/components/campaigns/CampaignCard.tsx` - Card component
- `frontend/components/campaigns/CreateCampaignDialog.tsx` - Multi-step dialog
- `frontend/components/campaigns/ClientFilter.tsx` - New filter component
- `frontend/components/campaigns/ClientManager.tsx` - New CRUD component
- `frontend/hooks/api/useCampaigns.ts` - Update hooks
- `frontend/hooks/api/useClients.ts` - New hook

### Backend
- `backend/src/api/routes/campaigns.ts` - Update routes
- `backend/src/api/routes/clients.ts` - New routes
- `backend/src/api/controllers/campaign.controller.ts`
- `backend/src/api/controllers/client.controller.ts` - New controller
- `backend/src/services/campaign.service.ts`
- `backend/src/services/client.service.ts` - New service
- `backend/src/repositories/campaign.repository.ts`
- `backend/src/repositories/client.repository.ts` - New repository

### Shared
- `shared/types/src/requests/campaign.ts` - Update types
- `shared/types/src/requests/client.ts` - New types

---

## Implementation Order

1. Create Client database migration
2. Create Client backend (routes, controller, service, repository)
3. Update Campaign to use clientId instead of type
4. Update campaign status to be calculated dynamically
5. Update frontend filter to use clients
6. Create client management UI
7. Update create campaign dialog to multi-step
8. Update campaign cards with new layout
9. Remove pause/resume controls

---

## Testing Checklist

- [ ] Clients can be created/edited/deleted
- [ ] Campaigns filter by client correctly
- [ ] New campaign flow works (name → client → upload)
- [ ] Status shows Active/Inactive based on 7-day rule
- [ ] Last called timestamp displays correctly
- [ ] Lead counts are accurate
- [ ] Deleting client warns about campaigns
- [ ] Search filters campaigns by name
