# Dashboard Feature Spec

**Module Owner:** This session
**Status:** COMPLETE - All Features Implemented

---

## Implementation Status (Updated Jan 2026)

### Recently Fixed
- [x] [CRITICAL] BUG: Dashboard now displays real call data from the database. Added analytics API endpoint that queries Call table with proper filters (date range, user, client). Dashboard shows Total Calls, Outbound, Inbound, Connected, Talk Time, Avg Duration, Calls Over Time chart, and Call Status breakdown chart.

### Completed Features
- [x] Metric cards display (calls, connects, rate, talk time, avg call)
- [x] Calls over time chart (displays Twilio data)
- [x] Disposition/Call Status chart (displays data with theme-aware tooltips)
- [x] CSV export works
- [x] Activity Feed: component wired up with activity logging
- [x] Today's Tasks widget: connected to tasks API
- [x] Schedule widget: connected to schedule API
- [x] Disposition chart hover text: fixed with theme-aware colors
- [x] Renamed "Dispositions" to "Call Status" throughout

### Bug Fixes Applied
- Fixed `logCallActivity`, `logTaskCompleted`, `logLeadActivity`, `logCampaignCreated` function signatures
- Activity is now logged when calls complete, tasks complete, etc.
- Disposition chart tooltip now uses `hsl(var(--popover))` and `hsl(var(--popover-foreground))`

### Still Pending (Low Priority)
- [x] PDF export: Fixed - now opens print dialog for save-as-PDF
- [x] Chart drill-down: DispositionChart now has `onDispositionClick` and `selectedDisposition` props wired to dashboard and analytics pages
- [x] Analytics tab deprecation: Added "Legacy" badge to sidebar nav and deprecation banner on analytics page with link to Dashboard

### Key Files
- `frontend/app/dashboard/page.tsx` - Main dashboard page
- `frontend/components/dashboard/ActivityFeed.tsx` - Activity feed component
- `frontend/components/dashboard/TaskWidget.tsx` - Tasks widget
- `frontend/components/dashboard/ScheduleWidget.tsx` - Schedule widget
- `frontend/components/analytics/DispositionChart.tsx` - Call status pie chart
- `frontend/hooks/api/useDashboard.ts` - Dashboard hooks
- `backend/src/services/activity.service.ts` - Activity logging helpers

---

## Overview

Rename "Home" to "Dashboard" and transform it into the primary analytics and visibility hub. This tab will eventually replace the Analytics tab, consolidating all metrics, activity feeds, and organizational insights into one central view.

---

## Requirements

### 1. Rename Home → Dashboard

**Sidebar Update**
- Change "Home" label to "Dashboard"
- Keep `/dashboard` route (no URL change needed)
- Update icon if desired (LayoutDashboard icon)

### 2. Merge Analytics Features

Import all analytics functionality from the Analytics tab:

**Metric Cards**
- Calls Today / This Week / This Month
- Connects count
- Connect Rate (%)
- Total Talk Time
- Average Call Duration

**Filters Bar**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Date: [Today ▼]  Client: [All Clients ▼]  Campaign: [All ▼]  Rep: [All ▼] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Charts**
- Calls over time (line/bar chart)
- Disposition breakdown (pie chart)
- Campaign performance comparison table

**Leaderboard**
- Rep rankings with calls, connects, rate, talk time
- Week-over-week trend indicators

**Export**
- CSV/PDF export of current view

### 3. Activity Feed (New)

Real-time feed of organization activity.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Activity Feed                                    [All ▼] [Refresh]        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📞 John Smith called Jane Doe (Acme Corp) - 3:42 duration           │   │
│  │    2 minutes ago • Connected                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Sarah added 45 leads to "West Coast VPs" campaign               │   │
│  │    15 minutes ago                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Mike completed task: Follow up with Bob Wilson                   │   │
│  │    1 hour ago                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Activity Types**
- Calls made/received
- Leads added/updated
- Tasks completed
- Campaigns created/modified
- Team member joined

**Filters**
- All activity
- Calls only
- Leads only
- Tasks only
- My activity only

### 4. Task/To-Do Widget (New)

Quick view of today's tasks and follow-ups.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Today's Tasks                                           [View All]        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ⚠️ OVERDUE                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [ ] Call back John Smith (Acme)              Due: Yesterday    [✓] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📅 TODAY                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [ ] Send proposal to Jane Doe                Due: 2:00 PM      [✓] │   │
│  │ [ ] Follow up on demo request                Due: 4:00 PM      [✓] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Upcoming: 5 tasks this week                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features**
- Overdue tasks highlighted in red
- Today's tasks with due times
- Quick complete checkbox
- Click to view task details
- "View All" links to full task list

### 5. Client Overview Widget (New)

Quick stats breakdown by client.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Client Overview                                  [This Week ▼]            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┬────────┬──────────┬────────┬──────────┐                  │
│  │ Client       │ Calls  │ Connects │ Rate   │ Pipeline │                  │
│  ├──────────────┼────────┼──────────┼────────┼──────────┤                  │
│  │ Acme Corp    │   89   │    24    │ 27.0%  │ $125,000 │                  │
│  │ Tech Inc     │   67   │    19    │ 28.4%  │ $89,000  │                  │
│  │ Sales Co     │   45   │    11    │ 24.4%  │ $67,000  │                  │
│  │ StartupXYZ   │   34   │     8    │ 23.5%  │ $45,000  │                  │
│  └──────────────┴────────┴──────────┴────────┴──────────┘                  │
│                                                                             │
│  [Click client to filter dashboard]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features**
- Summary stats per client
- Click client to filter entire dashboard
- Pipeline value from CRM
- Sortable columns

### 6. Calendar/Schedule Widget (New)

View scheduled callbacks and meetings.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Schedule                                    [Day] [Week]  [< Jan 13 >]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  9:00 AM   ┌─────────────────────────────────────────────────────────┐     │
│            │ Callback: John Smith (Acme Corp)              📞        │     │
│            │ Re: Q1 pricing discussion                               │     │
│            └─────────────────────────────────────────────────────────┘     │
│                                                                             │
│  11:00 AM  ┌─────────────────────────────────────────────────────────┐     │
│            │ Demo: Jane Doe (Tech Inc)                     💻        │     │
│            │ Product walkthrough                                     │     │
│            └─────────────────────────────────────────────────────────┘     │
│                                                                             │
│  2:00 PM   ┌─────────────────────────────────────────────────────────┐     │
│            │ Callback: Bob Wilson (Sales Co)               📞        │     │
│            └─────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features**
- Day view (default) / Week view toggle
- Navigate between days
- Event types: Callback, Meeting, Demo
- Click to view/edit event
- Quick dial from callback events

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                                                  │
│  [Date: Today ▼] [Client: All ▼] [Campaign: All ▼] [Rep: All ▼] [Export ▼]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │  Calls  │ │Connects │ │  Rate   │ │Talk Time│ │Avg Call │              │
│  │   156   │ │   42    │ │  26.9%  │ │ 4:23:00 │ │  3:42   │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐    │
│  │                                │  │                                │    │
│  │     Calls Over Time Chart      │  │    Disposition Breakdown       │    │
│  │                                │  │         (Pie Chart)            │    │
│  │                                │  │                                │    │
│  └────────────────────────────────┘  └────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐    │
│  │                                │  │                                │    │
│  │       Activity Feed            │  │      Today's Tasks             │    │
│  │                                │  │                                │    │
│  │                                │  ├────────────────────────────────┤    │
│  │                                │  │                                │    │
│  │                                │  │      Calendar/Schedule         │    │
│  │                                │  │                                │    │
│  └────────────────────────────────┘  └────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐    │
│  │                                │  │                                │    │
│  │     Client Overview Table      │  │     Team Leaderboard           │    │
│  │                                │  │                                │    │
│  └────────────────────────────────┘  └────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Changes

### Reuse Existing Endpoints

- `GET /api/analytics/:organizationId/calls` - Metrics
- `GET /api/analytics/:organizationId/leaderboard` - Leaderboard
- `POST /api/analytics/:organizationId/export` - Export

### New Endpoints

**Activity Feed**
```
GET /api/activity/:organizationId
```

**Query Params**
- `type`: 'all' | 'calls' | 'leads' | 'tasks'
- `userId`: filter to specific user
- `limit`: number of items (default 20)
- `cursor`: pagination cursor

**Response**
```typescript
interface ActivityItem {
  id: string;
  type: 'call' | 'lead_added' | 'lead_updated' | 'task_completed' | 'campaign_created';
  userId: string;
  userName: string;
  description: string;
  metadata: {
    leadId?: string;
    leadName?: string;
    campaignId?: string;
    campaignName?: string;
    taskId?: string;
    callDuration?: number;
    disposition?: string;
  };
  createdAt: string;
}
```

**Today's Tasks**
```
GET /api/tasks?dueDate=today&userId=:userId
GET /api/tasks?overdue=true&userId=:userId
```

**Client Overview**
```
GET /api/analytics/:organizationId/clients
```

**Response**
```typescript
interface ClientAnalytics {
  clientId: string;
  clientName: string;
  calls: number;
  connects: number;
  connectRate: number;
  pipelineValue: number;
}
```

**Schedule/Calendar**
```
GET /api/schedule/:organizationId
```

**Query Params**
- `startDate`: ISO date
- `endDate`: ISO date
- `userId`: optional filter

**Response**
```typescript
interface ScheduleEvent {
  id: string;
  type: 'callback' | 'meeting' | 'demo';
  title: string;
  leadId?: string;
  leadName?: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}
```

---

## Database Changes

### New Table: Activity

```sql
CREATE TABLE "Activity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
);

CREATE INDEX "Activity_organizationId_createdAt_idx"
  ON "Activity"("organizationId", "createdAt" DESC);
CREATE INDEX "Activity_type_idx" ON "Activity"("type");
```

### New Table: ScheduleEvent

```sql
CREATE TABLE "ScheduleEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "leadId" TEXT,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
);

CREATE INDEX "ScheduleEvent_userId_startTime_idx"
  ON "ScheduleEvent"("userId", "startTime");
```

---

## Files to Modify (Exclusive Ownership)

### Frontend
- `frontend/app/dashboard/page.tsx` - Complete redesign
- `frontend/components/dashboard/DashboardFilters.tsx` - New filter bar
- `frontend/components/dashboard/MetricCards.tsx` - Import from analytics
- `frontend/components/dashboard/CallsChart.tsx` - Import from analytics
- `frontend/components/dashboard/DispositionChart.tsx` - Import from analytics
- `frontend/components/dashboard/ActivityFeed.tsx` - New component
- `frontend/components/dashboard/TaskWidget.tsx` - New component
- `frontend/components/dashboard/ClientOverview.tsx` - New component
- `frontend/components/dashboard/ScheduleWidget.tsx` - New component
- `frontend/components/dashboard/Leaderboard.tsx` - Import from analytics
- `frontend/components/dashboard/Sidebar.tsx` - Rename Home → Dashboard
- `frontend/hooks/api/useDashboard.ts` - New hooks

### Backend
- `backend/src/api/routes/activity.ts` - New routes
- `backend/src/api/routes/schedule.ts` - New routes
- `backend/src/api/controllers/activity.controller.ts` - New
- `backend/src/api/controllers/schedule.controller.ts` - New
- `backend/src/services/activity.service.ts` - New
- `backend/src/services/schedule.service.ts` - New
- `backend/src/repositories/activity.repository.ts` - New
- `backend/src/repositories/scheduleEvent.repository.ts` - New

### Shared
- `shared/types/src/requests/activity.ts` - New types
- `shared/types/src/requests/schedule.ts` - New types

---

## Implementation Order

### Phase 1: Foundation
1. Rename Home → Dashboard in Sidebar
2. Import metric cards from analytics
3. Add filter bar (date, client, campaign, rep)

### Phase 2: Charts & Leaderboard
4. Import/adapt calls chart
5. Import/adapt disposition chart
6. Import/adapt leaderboard (with fixes)

### Phase 3: New Widgets
7. Create Activity table and backend
8. Build Activity Feed component
9. Build Task Widget component
10. Create ScheduleEvent table and backend
11. Build Calendar/Schedule widget

### Phase 4: Client Overview
12. Add client analytics endpoint
13. Build Client Overview table
14. Wire up client click → filter dashboard

### Phase 5: Polish
15. Add export functionality
16. Responsive layout adjustments
17. Loading states and error handling

---

## Analytics Tab Deprecation Plan

1. Dashboard feature complete and tested
2. Add "Legacy" badge to Analytics nav item
3. Show notice on Analytics tab: "Analytics has moved to Dashboard"
4. After 2 weeks, redirect `/dashboard/analytics` → `/dashboard`
5. Remove Analytics tab from sidebar
6. Delete analytics components (or keep for reference)

---

## Testing Checklist

- [ ] Sidebar shows "Dashboard" instead of "Home"
- [ ] Metric cards display correct data
- [ ] All filters work (date, client, campaign, rep)
- [ ] Charts render and update with filters
- [ ] Leaderboard shows talk time correctly
- [ ] Activity feed loads and updates
- [ ] Activity feed filters work
- [ ] Task widget shows today's tasks
- [ ] Task widget shows overdue items
- [ ] Quick complete works on tasks
- [ ] Calendar shows scheduled events
- [ ] Day/week toggle works
- [ ] Client overview table loads
- [ ] Clicking client filters dashboard
- [ ] Export produces correct CSV/PDF
- [ ] Layout responsive on mobile
