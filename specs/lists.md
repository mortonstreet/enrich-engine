# Lists Feature Spec

**Module Owner:** This session
**Status:** Implemented
**Dependencies:** None (foundation feature)

---

## Implementation Status

### Features
- [x] Folder hierarchy with nesting
- [x] List creation with name/description
- [ ] CSV upload with async processing (BullMQ)
- [x] Import status tracking (pending/processing/completed/failed)
- [x] Lead management with inline editing
- [x] Search across lists/folders
- [x] Pagination for leads
- [x] Export to CSV
- [x] Move lists between folders
- [ ] Breadcrumb navigation
- [x] Favorites tab with star toggle
- [x] Recents tab with last-opened-by-me timestamp
- [x] Owner column and filter
- [x] All folders display as grey

### Key Files (TBD)
**Database:**
- `shared/db/prisma/schema.prisma`

**Backend:**
- `backend/src/api/routes/lists.ts`
- `backend/src/api/controllers/list.controller.ts`
- `backend/src/services/list.service.ts`
- `backend/src/repositories/list.repository.ts`
- `backend/src/repositories/listFolder.repository.ts`
- `backend/src/repositories/listFavorite.repository.ts`
- `backend/src/repositories/listOpen.repository.ts`

**Frontend:**
- `frontend/app/dashboard/lists/page.tsx`
- `frontend/app/dashboard/lists/[id]/page.tsx`
- `frontend/components/lists/ListCard.tsx`
- `frontend/components/lists/FolderCard.tsx`
- `frontend/components/lists/CSVDropzone.tsx`
- `frontend/hooks/api/useLists.ts`

---

## Overview

The Lists feature provides lead organization through a hierarchical folder/list structure with CSV import and Clay-inspired UI. This is the foundation feature that both Scrape and Enrich features depend on.

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
- Source indicator: "Uploaded" or "Scraped"

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

**Layout**
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

### 6. List Detail Page

**Header Actions**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← My List  ● Completed                                          [Export ▼]│
│  📄 Description text here                                                   │
│  👥 2,677 leads  •  📁 in Marketing                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Export (CSV download)
- More menu (Edit, Delete)

**CSV Upload**
- Drag & drop zone
- 10MB max file size
- Standard column mappings
- Custom fields support

**Leads Table**
- Inline editing with validation
- Search within list
- Pagination (20 per page)

---

## API Endpoints

### Lists
| Method | Path | Description |
|--------|------|-------------|
| GET | `/lists` | Get all lists and folders |
| POST | `/lists` | Create new list |
| GET | `/lists/:id` | Get list details with leads |
| PATCH | `/lists/:id` | Update list |
| DELETE | `/lists/:id` | Delete list |
| POST | `/lists/:id/upload` | Upload CSV to list |
| GET | `/lists/:id/export` | Export list as CSV |

### Folders
| Method | Path | Description |
|--------|------|-------------|
| POST | `/lists/folders` | Create folder |
| PATCH | `/lists/folders/:id` | Update folder |
| DELETE | `/lists/folders/:id` | Delete folder |

### Favorites
| Method | Path | Description |
|--------|------|-------------|
| POST | `/lists/favorites` | Add to favorites (listId or folderId) |
| DELETE | `/lists/favorites/:id` | Remove from favorites |
| GET | `/lists/favorites` | Get user's favorites |

### Recents
| Method | Path | Description |
|--------|------|-------------|
| POST | `/lists/:id/open` | Track list open |
| POST | `/lists/folders/:id/open` | Track folder open |
| GET | `/lists/recents` | Get user's recently opened |

---

## Database Schema

### Prisma Models

```prisma
model LeadList {
  id             String   @id @default(cuid())
  organizationId String
  createdById    String
  name           String
  description    String?
  folderId       String?
  importStatus   String   @default("completed") // pending, processing, completed, failed
  leadCount      Int      @default(0)
  source         String   @default("uploaded") // uploaded, scraped
  scrapeJobId    String?  // Link to source scrape job if scraped
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy      User            @relation(fields: [createdById], references: [id])
  folder         LeadListFolder? @relation(fields: [folderId], references: [id], onDelete: SetNull)
  leads          Lead[]
  favorites      ListFavorite[]
  opens          ListOpen[]

  @@index([organizationId])
  @@index([folderId])
  @@index([createdById])
}

model LeadListFolder {
  id             String   @id @default(cuid())
  organizationId String
  createdById    String
  name           String
  parentId       String?
  order          Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy      User             @relation(fields: [createdById], references: [id])
  parent         LeadListFolder?  @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children       LeadListFolder[] @relation("FolderHierarchy")
  lists          LeadList[]
  favorites      ListFavorite[]
  opens          ListOpen[]

  @@index([organizationId])
  @@index([parentId])
}

model ListFavorite {
  id        String   @id @default(cuid())
  userId    String
  listId    String?
  folderId  String?
  createdAt DateTime @default(now())

  user   User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  list   LeadList?       @relation(fields: [listId], references: [id], onDelete: Cascade)
  folder LeadListFolder? @relation(fields: [folderId], references: [id], onDelete: Cascade)

  @@unique([userId, listId])
  @@unique([userId, folderId])
  @@index([userId])
}

model ListOpen {
  id        String   @id @default(cuid())
  userId    String
  listId    String?
  folderId  String?
  openedAt  DateTime @default(now())

  user   User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  list   LeadList?       @relation(fields: [listId], references: [id], onDelete: Cascade)
  folder LeadListFolder? @relation(fields: [folderId], references: [id], onDelete: Cascade)

  @@index([userId, openedAt(sort: Desc)])
}

model Lead {
  id             String   @id @default(cuid())
  listId         String
  organizationId String
  firstName      String?
  lastName       String?
  email          String?
  phone          String?
  company        String?
  role           String?
  linkedinUrl    String?
  customFields   Json     @default("{}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  list         LeadList     @relation(fields: [listId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([listId])
  @@index([organizationId])
}
```

---

## TypeScript Types

```typescript
// shared/types/src/requests/list.ts

import { z } from 'zod';

// Enums
export type ListImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ListSource = 'uploaded' | 'scraped';

// Request schemas
export const createListSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  folderId: z.string().optional(),
});

export const updateListSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  folderId: z.string().nullable().optional(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().optional(),
});

export const addFavoriteSchema = z.object({
  listId: z.string().optional(),
  folderId: z.string().optional(),
}).refine(data => (data.listId && !data.folderId) || (!data.listId && data.folderId), {
  message: 'Must provide either listId or folderId, not both',
});

export const getListsQuerySchema = z.object({
  folderId: z.string().optional(),
  search: z.string().optional(),
  ownerId: z.string().optional(),
});

export const getLeadsQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  search: z.string().optional(),
});

// Response types
export interface ListResponse {
  id: string;
  name: string;
  description: string | null;
  folderId: string | null;
  importStatus: ListImportStatus;
  leadCount: number;
  source: ListSource;
  scrapeJobId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  lastOpenedAt?: string | null;
  owner?: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface FolderResponse {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  lastOpenedAt?: string | null;
  owner?: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface LeadResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  linkedinUrl: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListsPageResponse {
  lists: ListResponse[];
  folders: FolderResponse[];
}

export interface ListDetailResponse {
  list: ListResponse;
  leads: LeadResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FavoriteResponse {
  id: string;
  type: 'list' | 'folder';
  item: ListResponse | FolderResponse;
  createdAt: string;
}

export interface RecentResponse {
  id: string;
  type: 'list' | 'folder';
  item: ListResponse | FolderResponse;
  openedAt: string;
}
```

---

## UI Components

### Pages
- `ListsPage` - Main page with tabs (All files, Recents, Favorites)
- `ListDetailPage` - Detail view with leads table

### List Components
- `ListCard` - List row in table with dropdown menu
- `FolderCard` - Folder row in table with dropdown menu
- `ListsTable` - Table with columns and sorting
- `ListsFilterBar` - Search, owner filter, new button

### Dialogs
- `CreateListDialog` - Name, description inputs
- `CreateFolderDialog` - Name, parent folder inputs
- `MoveFolderDialog` - Select destination folder
- `DeleteConfirmDialog` - Confirm deletion

### List Detail Components
- `ListHeader` - Back button, name, status, actions
- `LeadsTable` - Paginated leads with inline editing
- `CSVDropzone` - Drag & drop upload zone
- `LeadEditRow` - Inline editing for lead fields

### Hooks
- `useLists` - Fetch lists and folders
- `useListDetail` - Fetch single list with leads
- `useFavorites` - Fetch user's favorites
- `useRecents` - Fetch user's recents
- `useToggleFavorite` - Add/remove favorite
- `useCreateList` - Create new list
- `useCreateFolder` - Create new folder
- `useUploadCSV` - Upload CSV to list
- `useExportCSV` - Download list as CSV

---

## Implementation Order

1. Database schema migrations
2. Backend repositories (list, folder, favorite, open)
3. Backend services (list management, CSV processing)
4. Backend controllers and routes
5. Shared types
6. Frontend hooks
7. Frontend pages (lists page, list detail)
8. Frontend components (cards, dialogs, dropzone)
9. CSV upload with BullMQ queue
10. Real-time status updates

---

## Testing Checklist

### Core Features
- [ ] Can create a new list
- [ ] Can create a new folder
- [ ] Can nest folders inside other folders
- [ ] Can move list to different folder
- [ ] Can rename list and folder
- [ ] Can delete list and folder

### CSV Operations
- [ ] Can upload CSV file (drag & drop)
- [ ] Import status updates in real-time
- [ ] Lead count updates after import
- [ ] Can export list as CSV

### Tabs & Filters
- [ ] All files tab shows all items
- [ ] Recents tab shows recently opened
- [ ] Favorites tab shows favorited items
- [ ] Star toggle adds/removes from favorites
- [ ] Owner filter works correctly
- [ ] Search filters results in real-time

### Leads Table
- [ ] Pagination works (20 per page)
- [ ] Search within list works
- [ ] Inline editing saves changes

### UI/UX
- [ ] Breadcrumb navigation works
- [ ] Folder navigation works
- [ ] All folders display as grey
- [ ] Status badges display correctly
