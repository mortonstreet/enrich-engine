# Create Spec Workflow

**Type:** Meta-Spec (Workflow Definition)
**Purpose:** Define rules for creating new feature specifications

---

## Overview

This workflow guides the creation of new feature specifications from scratch. It ensures consistent structure, proper implementation tracking, and that all new features are flagged as NOT IMPLEMENTED for future iterations.

---

## Workflow Steps

### Step 1: Interview Phase

Before writing any spec, gather requirements through targeted questions:

1. **What is the feature?** (Name and one-sentence description)
2. **What problem does it solve?** (User pain point or business need)
3. **What are the core requirements?** (Must-haves vs nice-to-haves)
4. **What existing features does it interact with?** (Dependencies)
5. **Are there any UI mockups or examples to follow?** (Reference designs)

### Step 2: Create Spec File

Create a new file at `specs/<feature-name>.md` with this structure:

```markdown
# [Feature Name] Feature Spec

**Module Owner:** This session
**Status:** Not Started

---

## Implementation Status

### Not Implemented
- [ ] Feature item 1
- [ ] Feature item 2
- [ ] Feature item 3

### Key Files (TBD)
- Files will be listed here after implementation

---

## Overview

[One paragraph describing the feature and its purpose]

---

## Requirements

### 1. [Requirement Category]

**[Sub-requirement]**
- Detail 1
- Detail 2

[ASCII mockup if applicable]
```
[Requirement Category]
...

---

## API Changes

### New Endpoints
- List all new endpoints with method, path, description
- Include request/response types

### Modified Endpoints
- List changes to existing endpoints

---

## Database Changes

### New Tables
- SQL CREATE statements

### Modified Tables
- ALTER statements

### Migration Strategy
1. Step-by-step migration plan

---

## Files to Modify

### Frontend
- List all frontend files to create/modify

### Backend
- List all backend files to create/modify

### Shared
- List all shared type files

---

## Implementation Order

1. [First task - usually database]
2. [Second task - usually backend]
3. [Continue in dependency order]

---

## Testing Checklist

- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3
```

---

## Required Flags and Markers

### Implementation Status Rules

**All new items MUST use unchecked boxes:**
```markdown
- [ ] Not implemented feature
```

**Never use checked boxes for new features:**
```markdown
- [x] WRONG - Do not mark as complete until implemented
```

### Status Field Values

| Status | When to Use |
|--------|-------------|
| `Not Started` | New spec, nothing implemented |
| `In Progress` | Some features implemented |
| `Complete` | All core features implemented |

### Bug/Issue Markers

When adding bugs or issues during spec creation:
```markdown
### Known Issues - Not Implemented
- [ ] BUG: [Description of bug]
- [ ] ISSUE: [Description of issue]
```

### Future Enhancements

For nice-to-have features that won't be in v1:
```markdown
### Future Enhancements (Out of Scope)
- [ ] FUTURE: [Enhancement description]
```

---

## Spec Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `<feature>.md` | `crm.md`, `dialer.md` |
| Sub-feature | `<parent>-<child>.md` | `dialer-voicemail.md` |
| Integration | `<integration>-integration.md` | `slack-integration.md` |

---

## Validation Checklist

Before finalizing a new spec, verify:

- [ ] All features marked as `- [ ]` (not implemented)
- [ ] Status set to `Not Started`
- [ ] Implementation Status section present with "Not Implemented" subsection
- [ ] Overview section explains the feature clearly
- [ ] Requirements are broken into numbered sections
- [ ] API Changes section documents all endpoints
- [ ] Database Changes section includes SQL
- [ ] Files to Modify lists all affected files
- [ ] Implementation Order follows dependency order
- [ ] Testing Checklist covers all requirements

---

## Example: Minimal New Spec

```markdown
# Notifications Feature Spec

**Module Owner:** This session
**Status:** Not Started

---

## Implementation Status

### Not Implemented
- [ ] In-app notification bell
- [ ] Notification preferences
- [ ] Email notification triggers
- [ ] Real-time WebSocket updates

### Key Files (TBD)
- To be determined during implementation

---

## Overview

Add a notification system to alert users of important events like new leads,
completed calls, and team activity.

---

## Requirements

### 1. In-App Notifications

**Notification Bell**
- Bell icon in header with unread count badge
- Dropdown showing recent notifications
- Mark as read on click

### 2. Notification Preferences

**User Settings**
- Toggle for each notification type
- Email vs in-app preference

---

## API Changes

### New Endpoints
- `GET /api/notifications` - List user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `GET /api/notification-preferences` - Get user preferences
- `PATCH /api/notification-preferences` - Update preferences

---

## Database Changes

### New Tables

```sql
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "read" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

---

## Files to Modify

### Frontend
- `frontend/components/layout/NotificationBell.tsx` - New
- `frontend/components/notifications/NotificationList.tsx` - New
- `frontend/hooks/api/useNotifications.ts` - New

### Backend
- `backend/src/api/routes/notifications.ts` - New
- `backend/src/services/notification.service.ts` - New
- `backend/src/repositories/notification.repository.ts` - New

---

## Implementation Order

1. Create Notification database table
2. Build notification backend (routes, service, repository)
3. Create NotificationBell component
4. Implement notification preferences
5. Add WebSocket for real-time updates

---

## Testing Checklist

- [ ] Notifications display in dropdown
- [ ] Unread count updates correctly
- [ ] Mark as read works
- [ ] Preferences save correctly
```

---

## Usage

To create a new spec:

```
claude -> plan mode implement specs/create-spec.md
```

Claude will:
1. Ask interview questions to gather requirements
2. Create a properly structured spec file
3. Ensure all items are flagged as not implemented
4. Present the spec for review before saving
