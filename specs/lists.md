# Lists Feature Spec

**Module Owner:** This session
**Status:** Complete - All Bug Fixes Applied

---

## Implementation Status (Updated Jan 2026)

### Completed Features
- [x] Folder hierarchy with nesting
- [x] List creation with name/description
- [x] CSV upload with async processing (BullMQ)
- [x] Import status tracking (pending/processing/completed/failed)
- [x] Lead management with inline editing
- [x] Search across lists/folders
- [x] Pagination for leads
- [x] Export to CSV
- [x] Move lists between folders
- [x] Breadcrumb navigation
- [x] List detail page working
- [x] "Add to Campaign" modal shows ALL campaigns with status badges
- [x] All folders display as grey (Clay-style)
- [x] Color picker removed from folder create/edit dialogs
- [x] Refresh button removed from list detail page
- [x] "Tag..." option removed from dropdown menus
- [x] "Duplicate" option removed from dropdown menus

### Key Files Updated
- `FolderCard.tsx` - Uses FOLDER_GREY constant, color picker removed
- `FolderSidebar.tsx` - Uses FOLDER_GREY, color picker removed from dialogs
- `[id]/page.tsx` - Refresh button removed, campaigns dropdown works

### Features Completed (Jan 2026)
- [x] **Favorites tab** - Users can favorite lists/folders, shown in Favorites tab
- [x] **Recents tab** - Tracks recently opened lists AND folders per user
- [x] **Star toggle in Tags column** - Click to add/remove favorites
- [x] **Database migrations** - ListFavorite and ListOpen tables created
- [x] **Backend API** - Full favorites and recents endpoints implemented
- [x] **Frontend hooks** - useFavorites, useRecents, useToggleFavorite, etc.

### Remaining (Lower Priority) - NOW COMPLETE
- [x] **Owner filter** - Dropdown to filter lists by creator
- [x] **Last opened by me** - Displays timestamp from recents tracking
- [x] **Owner column** - Shows creator name from organization members

### Bugs Fixed (Jan 2026)
- [x] [HIGH] BUG: Favorites tab not displaying favorited items - Fixed: Recents data now used directly without lookup
- [x] [HIGH] BUG: Owner column not displaying correctly - Fixed: Added createdById to findMany query
- [x] [HIGH] BUG: "Last opened by me" column not showing accurate timestamps - Fixed: Added openedAtMap lookup for All/Favorites tabs

### Bugs Fixed - Jan 2026 (Lead Management)
- [x] [HIGH] BUG: First/Last name not synced when editing in Lists tab
  - Fix: Cross-view query invalidation (same as leads.md)
  - Files: useLists.ts - Already implemented with queryClient.invalidateQueries for leads
- [x] [MEDIUM] BUG: 3-dot menu missing "Edit" option for full lead editing
  - Fix: Add "Edit Details" menu item linking to /dashboard/leads/[id]
  - Files: /dashboard/lists/[id]/page.tsx - Already implemented

### Bugs Fixed - Jan 2026 (UI/UX)
- [x] [LOW] BUG: "(root)" should say "Home"
  - When moving files/folders via 3-dot menu
  - Fixed: Changed "Home (root)" to "Home" in move dialog
  - Files: frontend/app/dashboard/lists/page.tsx

- [x] [MEDIUM] BUG: Lists tab missing title header
  - Lists tab only shows "All Files" without a "Lists" title header
  - Fixed: Added "Lists" title header above tabs to match other pages
  - Files: frontend/app/dashboard/lists/page.tsx

---

## Overview

The Lists feature provides lead organization through a hierarchical folder/list structure with CSV import, campaign integration, and Clay-inspired UI.

---

## Requirements

### 1. Tab Navigation (Clay-style)

**Tab Bar**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [All files]  [Recents]  [Favorites]                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **All files** - Default view, shows all lists and folders
- **Recents** - Recently opened lists and folders (per user)
- **Favorites** - User's favorited lists and folders

### 2. Folder Management

**Folders**
- Grey color only (no color picker)
- Support nesting (parent/child folders)
- Sortable order
- Click to navigate inside

**Folder Dropdown Menu**
```
┌─────────────────────────────┐
│ ⓘ  Folder details          │
│ ✏️  Rename                  │
│ ☆  Add to favorites        │
│ 🗑️  Delete                  │
└─────────────────────────────┘
```

### 3. List Management

**Lists**
- Name and optional description
- Import status badge (pending/processing/completed/failed)
- Lead count display
- Folder assignment

**List Dropdown Menu**
```
┌─────────────────────────────┐
│ ⓘ  Info/Details            │
│ ✏️  Rename                  │
│ ☆  Add to favorites        │
│ ↔️  Move                    │
│ 🗑️  Delete                  │
└─────────────────────────────┘
```

### 4. Filter Bar

**Owner Filter**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Owner: [All ▼]   ≡ Filters                              [Search...]  [+New]│
└─────────────────────────────────────────────────────────────────────────────┘
```

- Dropdown: "All" or specific team member
- Filters by who created the list/folder
- Shows user's name/avatar

**Search**
- Search across list names, folder names, descriptions
- Real-time filtering

### 5. Table Columns

| Column | Description |
|--------|-------------|
| Name | List/folder name with grey icon |
| Tags | Star icon for favorites (clickable) |
| Created at | Creation date |
| Last opened by me | When current user last opened |
| Owner | Who created the item |
| Access | "Edit" indicator |
| Actions | 3-dots dropdown menu |

### 6. Add to Campaign Dialog

**Current Bug:** Campaign dropdown not populating

**Fix Required**
- Campaign dropdown must populate with ALL campaigns
- Remove active-only filter
- Keep Active/Inactive badge display on campaigns

**Dialog**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Add List to Campaign                                                   [X] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  All 2,677 leads from this list will be added to the selected campaign.    │
│                                                                             │
│  Campaign                                                                   │
│  [Select a campaign ▼]                                                      │
│    - Q1 Outreach (Active)                                                   │
│    - West Coast VPs (Inactive)                                              │
│    - Tech Startups (Active)                                                 │
│                                                                             │
│                                              [Cancel]  [Add to Campaign]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7. List Detail Page

**Header Actions** (Remove Refresh button)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← test  ● Completed                                     [Export] [Add to ▼]│
│  📄 2390940439                                                              │
│  👥 2,677 leads  •  📁 in test                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Export (CSV download)
- Add to Campaign
- More menu (Edit, Delete)
- NO Refresh button

**CSV Upload**
- Drag & drop zone
- 10MB max file size
- Standard column mappings (phone required)
- Custom fields support

**Leads Table**
- Inline editing with validation
- Search within list
- Pagination (20 per page)

---

## API Changes

### New Endpoints

**Favorites**
```
POST   /api/lists/favorites           - Add to favorites (listId or folderId)
DELETE /api/lists/favorites/:id       - Remove from favorites
GET    /api/lists/favorites           - Get user's favorites
```

**Request: Add to Favorites**
```typescript
interface AddFavoriteRequest {
  listId?: string;
  folderId?: string;
  organizationId: string;
}
```

**Response: Favorites List**
```typescript
interface FavoriteItem {
  id: string;
  type: 'list' | 'folder';
  item: LeadList | LeadListFolder;
  createdAt: string;
}
```

**Recents/Opens Tracking**
```
POST   /api/lists/:id/open           - Track list open
POST   /api/lists/folders/:id/open   - Track folder open
GET    /api/lists/recents            - Get user's recently opened
```

**Response: Recents List**
```typescript
interface RecentItem {
  id: string;
  type: 'list' | 'folder';
  item: LeadList | LeadListFolder;
  openedAt: string;
}
```

### Modified Endpoints

**GET /api/campaigns (for dropdown)**
- Remove active-only default filter
- Return ALL campaigns for organization

---

## Database Changes

### New Table: ListFavorite

```sql
CREATE TABLE "ListFavorite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "listId" TEXT,
  "folderId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("listId") REFERENCES "LeadList"("id") ON DELETE CASCADE,
  FOREIGN KEY ("folderId") REFERENCES "LeadListFolder"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "listId"),
  UNIQUE ("userId", "folderId"),
  CHECK (("listId" IS NOT NULL AND "folderId" IS NULL) OR ("listId" IS NULL AND "folderId" IS NOT NULL))
);

CREATE INDEX "ListFavorite_userId_idx" ON "ListFavorite"("userId");
```

### New Table: ListOpen

```sql
CREATE TABLE "ListOpen" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "listId" TEXT,
  "folderId" TEXT,
  "openedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("listId") REFERENCES "LeadList"("id") ON DELETE CASCADE,
  FOREIGN KEY ("folderId") REFERENCES "LeadListFolder"("id") ON DELETE CASCADE,
  CHECK (("listId" IS NOT NULL AND "folderId" IS NULL) OR ("listId" IS NULL AND "folderId" IS NOT NULL))
);

CREATE INDEX "ListOpen_userId_openedAt_idx" ON "ListOpen"("userId", "openedAt" DESC);
```

### Modify LeadListFolder Display

- Ignore "color" column in frontend (always display grey)
- No changes to database schema, just frontend rendering

---

## Files to Modify (Exclusive Ownership)

### Frontend
- `frontend/app/dashboard/lists/page.tsx` - Add tabs, owner filter, grey folders
- `frontend/app/dashboard/lists/[id]/page.tsx` - Remove Refresh button
- `frontend/components/lists/ListCard.tsx` - Update dropdown menu (remove Tag, Duplicate)
- `frontend/components/lists/FolderCard.tsx` - Remove color picker, grey styling
- `frontend/hooks/api/useLists.ts` - Add favorites, recents hooks

### Backend
- `backend/src/api/routes/lists.ts` - Add favorites, recents endpoints
- `backend/src/api/controllers/list.controller.ts` - Add favorite/recents handlers
- `backend/src/services/leadList.service.ts` - Add favorite/open tracking logic
- `backend/src/repositories/listFavorite.repository.ts` - New repository
- `backend/src/repositories/listOpen.repository.ts` - New repository

### Shared
- `shared/types/src/requests/list.ts` - Add favorite/recents types

---

## Implementation Order

1. Fix "Add to Campaign" dropdown (show all campaigns)
2. Remove folder colors, make all grey
3. Remove Refresh button from detail page
4. Update 3-dots menu (remove Tag, Duplicate)
5. Create database migrations for ListFavorite, ListOpen
6. Build Favorites backend (repository, service, controller, routes)
7. Build Favorites frontend (tab, star toggle, dropdown option)
8. Build Recents backend (track opens, query recent)
9. Build Recents frontend (tab, last opened column)
10. Add Owner filter with user dropdown

---

## Testing Checklist

### Bug Fixes
- [x] "Add to Campaign" dropdown shows all campaigns
- [x] Can add list to inactive campaign
- [x] Campaign status badges still display (Active/Inactive)

### Cosmetic Changes
- [x] All folders display as grey (no colors)
- [x] No color picker in folder create/edit dialogs
- [x] Refresh button removed from detail page header
- [x] No "Tag..." option in dropdown menus
- [x] No "Duplicate" option in dropdown menus

### New Features
- [x] Favorites tab shows only favorited items
- [x] Star icon in Tags column toggles favorite status
- [x] "Add to favorites" in dropdown toggles correctly
- [x] Recents tab shows recently opened items (sorted by time)
- [x] Opening a list/folder records the open time
- [x] "Last opened by me" column shows correct timestamp from recents
- [x] Owner filter dropdown shows all team members
- [x] Owner filter correctly filters the list
- [x] Owner column shows creator name

### Existing Features (Regression)
- [ ] CSV upload still works
- [ ] Export still works
- [ ] Move to folder still works
- [ ] Rename still works
- [ ] Delete with confirmation still works
- [ ] Folder navigation still works
- [ ] Search still works
- [ ] Breadcrumbs still work
