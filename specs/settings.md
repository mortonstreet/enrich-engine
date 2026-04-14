# Settings Feature Spec

**Status:** Google Sheets implemented, Webhooks hidden until needed

---

## Overview

The Settings page provides organization management, team administration, and third-party integrations. Access is role-based:

- **All Users**: Account settings (profile, password)
- **Admin/Owner Only**: Organization settings, Integrations, Billing

---

## Implementation Status

### Completed
- [x] Settings page with tab-based navigation
- [x] Team invitations via Resend email
- [x] Role-based access control (Owner > Admin > Member)
- [x] Google Sheets integration (full OAuth + import flow)

### Hidden (Build Later)
- [ ] Webhooks integration - UI hidden, enable by adding "automation" to CATEGORY_ORDER

### Deprecated
- Salesforce, HubSpot, Slack, Zapier, API Keys - removed from codebase

---

## Team Invitations (Resend)

**Status: COMPLETE**

Team invites use Resend SMTP for email delivery:

- `backend/src/clients/email.client.ts` - `sendOrganizationInvitation()`
- `backend/src/lib/email.ts` - Nodemailer with Resend SMTP (smtp.resend.com:465)
- `backend/src/lib/better-auth.ts` - Organization plugin with email handler

**Flow:**
1. Admin enters email + selects role (member/admin)
2. Better-auth creates invitation record
3. Resend delivers invitation email
4. User clicks link → `/accept-invitation/[id]`
5. User signs up/logs in → Added to organization

**Environment:**
- `RESEND_API_KEY` - Resend API key
- Domain must be verified in Resend dashboard

---

## Team Roles

**Status: COMPLETE**

```
Owner > Admin > Member
```

- **Owner**: Full access, cannot be removed
- **Admin**: Can manage team, billing, integrations (cannot remove owner)
- **Member**: App access only (dialer, CRM, campaigns)

---

## Google Sheets Integration

**Status: IMPLEMENTED**

Full OAuth integration allowing users to import leads from Google Sheets.

### User Flow
1. Click "Connect" → Google OAuth popup
2. Authorize access to Google Sheets + Drive
3. Click "Import" → Select spreadsheet from picker
4. Map columns to lead fields (auto-detects common names)
5. Import creates new Lead List with imported leads
6. Add list to campaign for dialing

### Key Files

**Backend:**
- `backend/src/services/googleSheets.service.ts` - Sheets/Drive API operations
- `backend/src/services/integration.service.ts` - OAuth flow, token management
- `backend/src/api/routes/integrations.ts` - API endpoints

**Frontend:**
- `frontend/components/settings/IntegrationsSettings.tsx` - Integration list + import button
- `frontend/components/settings/GoogleSheetsPicker.tsx` - Spreadsheet selection modal
- `frontend/components/settings/ColumnMappingModal.tsx` - Column to field mapping
- `frontend/hooks/api/useIntegrations.ts` - React Query hooks

### API Endpoints
```
GET  /integrations/google_sheets/sheets           - List user's spreadsheets
GET  /integrations/google_sheets/columns/:sheetId - Get column headers
POST /integrations/google_sheets/import           - Import leads to new list
```

### Environment
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

---

## Webhooks Integration

**Status: HIDDEN** - Not essential, build later when needed

The webhook configuration UI exists but is hidden from the settings page. The dispatch logic is not implemented.

### To Enable
Add "automation" back to `CATEGORY_ORDER` in `IntegrationsSettings.tsx`:
```typescript
const CATEGORY_ORDER: IntegrationCategory[] = ["data", "automation"];
```

### What Exists
- Config modal with webhook URL input and event checkboxes
- Integration table stores `webhookUrl` and `webhookEvents` in config JSON
- Frontend hooks for saving configuration

### What Would Need to Be Built
- Webhook dispatcher service
- WebhookLog table for delivery tracking
- Event emission in dialer/lead/campaign services
- BullMQ queue for reliable delivery
- Logs UI for viewing delivery status

---

## Settings Page Structure

**File:** `frontend/app/dashboard/settings/page.tsx`

```
[Account] [Organization] [Integrations*] [Billing*]
                         (* Admin/Owner only)
```

### Tabs
- **Account** - Profile (read-only) + Change Password
- **Organization** - Org info + Team Management (invite/remove)
- **Integrations** - Google Sheets (currently only visible integration)
- **Billing** - Subscription status + Credits

---

## Testing Checklist

### Team Invitations
- [x] Invitation email sends via Resend
- [x] Accept invitation flow works
- [x] Role selection (member/admin) works
- [x] Owner cannot be removed

### Google Sheets
- [x] OAuth flow completes
- [x] Spreadsheets listed after auth
- [x] Column headers fetched
- [x] Import creates Lead List
- [x] Leads mapped to correct fields
- [x] Token refresh works
