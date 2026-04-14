# Update Spec Workflow

**Type:** Meta-Spec (Workflow Definition)
**Purpose:** Define rules for updating existing feature specifications

---

## Overview

This workflow guides the process of adding new features, bugs, or enhancements to existing specs. It ensures that new additions are properly flagged as NOT IMPLEMENTED so that subsequent `implement specs/<feature>.md` runs only work on the new items.

---

## Workflow Steps

### Step 1: Select Specs to Update

Present the user with available specs:

```
Available specs to update:

1. campaigns.md - Campaigns Feature Spec [Complete]
2. crm.md - CRM Pipeline Feature Spec [Complete]
3. dialer.md - Dialer Feature Spec [In Progress]
4. leads.md - Leads Feature Spec [Complete]
5. lists.md - Lists Feature Spec [Complete]
6. dashboard.md - Dashboard Feature Spec [Complete]
7. settings.md - Settings Feature Spec [In Progress]

Which spec(s) would you like to update? (Enter numbers, e.g., "1,3,5")
```

### Step 2: Gather Changes

For each selected spec, ask:

1. **What type of change?**
   - New feature
   - Bug fix needed
   - Enhancement to existing feature
   - UI/UX improvement
   - API change
   - Database change

2. **Describe the change** (detailed description)

3. **Priority level**
   - Critical (blocks core functionality)
   - High (important for next release)
   - Medium (should be done soon)
   - Low (nice to have)

4. **Any additional context?** (related issues, user feedback, etc.)

### Step 3: Update Spec File

Add changes to the appropriate section with proper flags.

---

## Update Rules

### Adding New Features

Add to "Implementation Status" under a new "Not Implemented" subsection or append to existing:

```markdown
## Implementation Status (Updated [Month Year])

### Completed Features
- [x] Existing completed feature 1
- [x] Existing completed feature 2

### Not Implemented
- [ ] NEW: [New feature description]
- [ ] NEW: [Another new feature]
```

### Adding Bug Fixes

Create or append to "Bugs to Fix" subsection:

```markdown
### Bugs to Fix - Not Implemented
- [ ] BUG: [Bug description] - [Where it occurs]
- [ ] BUG: [Another bug description]
```

### Adding Enhancements

Create or append to "Enhancements" subsection:

```markdown
### Enhancements - Not Implemented
- [ ] ENHANCE: [Enhancement description]
- [ ] ENHANCE: [Improvement to existing feature]
```

### Adding UI/UX Changes

```markdown
### UI Changes - Not Implemented
- [ ] UI: [UI change description]
- [ ] UX: [UX improvement description]
```

---

## Flag Prefixes

Use these prefixes to categorize changes:

| Prefix | Use Case | Example |
|--------|----------|---------|
| `NEW:` | Brand new feature | `- [ ] NEW: Add bulk delete for leads` |
| `BUG:` | Bug that needs fixing | `- [ ] BUG: CSV upload fails silently` |
| `ENHANCE:` | Improve existing feature | `- [ ] ENHANCE: Add sorting to table` |
| `UI:` | Visual/layout change | `- [ ] UI: Redesign campaign cards` |
| `UX:` | Interaction improvement | `- [ ] UX: Add confirmation dialog` |
| `PERF:` | Performance fix | `- [ ] PERF: Optimize lead query` |
| `REFACTOR:` | Code improvement | `- [ ] REFACTOR: Split large component` |
| `API:` | Backend API change | `- [ ] API: Add pagination to endpoint` |
| `DB:` | Database change | `- [ ] DB: Add index for performance` |

---

## Priority Markers

Optionally add priority in brackets:

```markdown
- [ ] [CRITICAL] BUG: Application crashes on load
- [ ] [HIGH] NEW: Add export functionality
- [ ] [MEDIUM] ENHANCE: Improve search performance
- [ ] [LOW] UI: Update color scheme
```

---

## Updating Related Sections

When adding new items, also update these sections if needed:

### API Changes Section
```markdown
## API Changes

### New Endpoints (Not Implemented)
- `GET /api/new-endpoint` - [Description]

### Modified Endpoints (Not Implemented)
- `PATCH /api/existing` - Add new field
```

### Database Changes Section
```markdown
## Database Changes

### Pending Migrations
```sql
-- Not Implemented
ALTER TABLE "Lead" ADD COLUMN "newField" TEXT;
```
```

### Files to Modify Section
```markdown
## Files to Modify

### New Files Needed
- `frontend/components/feature/NewComponent.tsx` - Not implemented
- `backend/src/services/new.service.ts` - Not implemented
```

### Implementation Order Section
```markdown
## Implementation Order

### Completed
1. ~~Database migration~~ DONE
2. ~~Backend routes~~ DONE

### Not Started
3. Frontend component - NOT IMPLEMENTED
4. Integration tests - NOT IMPLEMENTED
```

---

## Example: Adding a Bug to crm.md

**Before:**
```markdown
## Implementation Status (Updated Jan 2026)

### Completed Features
- [x] Lead total calculation
- [x] Lead Detail Panel
```

**After:**
```markdown
## Implementation Status (Updated Jan 2026)

### Completed Features
- [x] Lead total calculation
- [x] Lead Detail Panel

### Bugs to Fix - Not Implemented
- [ ] [HIGH] BUG: Drag-drop sometimes loses lead data when moving between columns
- [ ] [MEDIUM] BUG: Value sum doesn't update immediately after editing deal value
```

---

## Example: Adding Enhancement to dialer.md

**Before:**
```markdown
## Implementation Status (Updated Jan 2026)

### Core Features Implemented
- [x] Manual dialer functioning
- [x] Call history display
```

**After:**
```markdown
## Implementation Status (Updated Jan 2026)

### Core Features Implemented
- [x] Manual dialer functioning
- [x] Call history display

### Enhancements - Not Implemented
- [ ] [MEDIUM] ENHANCE: Add call duration prediction based on historical data
- [ ] [LOW] ENHANCE: Show contact's timezone during calls
```

---

## Validation After Update

After updating a spec, verify:

- [ ] New items use `- [ ]` (unchecked boxes)
- [ ] New items have appropriate prefix (NEW/BUG/ENHANCE/etc.)
- [ ] Priority is marked if critical or high
- [ ] Related sections (API/DB/Files) updated if needed
- [ ] "Updated [Month Year]" date is current
- [ ] Status field updated if changed (e.g., "Complete" -> "In Progress")

---

## Status Transitions

| From | To | When |
|------|----|------|
| `Complete` | `In Progress` | Adding new features or bugs |
| `In Progress` | `In Progress` | Adding more items |
| `Not Started` | `In Progress` | Starting implementation |
| `In Progress` | `Complete` | All items checked off |

---

## Implementation Flow

After updating specs, the user can run:

```
claude -> implement specs/<feature>.md
```

Claude will:
1. Read the spec file
2. Identify only `- [ ]` (unchecked) items
3. Implement those items in priority order
4. Mark items as `- [x]` when complete
5. Update "Key Files" section with modified files
6. Update status if all items complete

---

## Usage

To update existing specs:

```
claude -> plan mode implement specs/update-spec.md
```

Claude will:
1. List available specs with their status
2. Prompt user to select which specs to update
3. Ask what changes to add (bugs, features, enhancements)
4. Update the selected specs with proper flags
5. Present changes for review before saving
