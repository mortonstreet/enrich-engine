# Tenant Security and Authorization Spec (Session A)

**Document ID:** `launch-readiness/01`  
**Status:** Draft (Wave 1 launch blocker)  
**Primary Risk Addressed:** Cross-tenant unauthorized access (IDOR / broken object-level authorization)

---

## 1. Problem Statement

Current code paths show authenticated access without consistent org ownership checks for several ID-based operations. This creates cross-tenant read/write risk when a valid resource ID from another org is supplied.

Wave 1 requires mandatory, centralized org-scoped authorization for all read/write-by-ID endpoints.

---

## 2. Tenant Isolation Model (Defense in Depth)

## 2.1 App-Layer Controls (Required)

1. Every user-facing resource access must resolve org context from authenticated session (`activeOrganizationId`) as the primary source.
2. Every ID-based read/write must enforce:
- `resource.id = :id`
- `resource.organizationId = :activeOrgId` (or equivalent join through org-owned parent).
3. Membership/role checks are necessary but not sufficient.
4. Authorization must happen before mutation side effects (Twilio calls, provider API operations, deletes, etc).

## 2.2 DB-Layer Controls (Required)

1. Tenant-owned tables must carry an org scoping path:
- Direct `organizationId`, or
- Foreign key chain to org-owned parent.
2. Add/verify composite indexes for scoped lookups:
- Example: `(id, organizationId)` or indexes enabling join-by-org filters.
3. Add foreign key constraints to prevent orphan records crossing org boundaries.

---

## 3. Mandatory Org-Scoping Policy

For every user-authenticated route performing ID-based access:

1. Controller/service must pass `activeOrgId` into repository layer.
2. Repository must query by `id + org` (direct or joined).
3. Bare `findById(id)` / `update(id)` / `delete(id)` is forbidden for user-facing calls.
4. Webhook-only paths may use unscoped lookup if request authenticity is cryptographically verified and path is never user-callable.

---

## 4. Required Code Patterns

## 4.1 Controller Pattern

```ts
const orgId = requireActiveOrg(req.session)
const resource = await service.getByIdForOrg(req.validated.id, orgId)
if (!resource) return notFound()
```

## 4.2 Repository Pattern

```ts
// Good: scoped query
selectFrom("resource")
  .where("id", "=", id)
  .where("organizationId", "=", orgId)
```

```ts
// Good: scoped via join
selectFrom("child")
  .innerJoin("parent", "parent.id", "child.parentId")
  .where("child.id", "=", id)
  .where("parent.organizationId", "=", orgId)
```

## 4.3 Context Injection Pattern

If schema parse includes orgId from session, server value must win:

```ts
schema.parse({
  ...req.body,
  organizationId: sessionOrgId,
})
```

Do not place `...req.body` or `...req.query` after server-injected `organizationId`.

---

## 5. Authorization Matrix (Wave 1 Route Families)

| Route Family | Canonical Org Source | Required Role | Required Scope Strategy |
| --- | --- | --- | --- |
| `api/calls/*` | Session `activeOrganizationId` | Org member | Call, disposition, voicemail, recording, session resources must resolve by ID + org |
| `api/dialer/sessions/*` | Session `activeOrganizationId` | Org member (owner for org-wide list) | Active session `sessionId` operations must be scoped to org |
| `api/parallel-dialer/sessions/*` | Session `activeOrganizationId` | Org member | Session and attempt lookup/update must include org ownership |
| `api/api-keys/*` | Session `activeOrganizationId` | Owner | API key get/revoke/usage must enforce key belongs to active org |
| `api/enrichment/vendors/*` | Session `activeOrganizationId` | Owner/admin | Vendor connection update/delete/test must scope by connection ID + org |
| `api/enrichment/leads/*` | Session `activeOrganizationId` | Org member | Lead contact access must verify lead belongs to active org |

---

## 6. Known At-Risk Paths and Required Fixes

## 6.1 API Keys (Critical)

Files:
- `backend/src/api/controllers/apiKey.controller.ts`
- `backend/src/services/apiKey.service.ts`
- `backend/src/repositories/apiKey.repository.ts`
- `backend/src/repositories/apiKeyUsage.repository.ts`

Current risk:
1. `getApiKey`, `revokeApiKey`, `getApiKeyUsage` call service by `id` only.
2. Repository `findById` and `revoke` are unscoped.

Wave 1 fix:
1. Add scoped service/repository APIs:
- `getApiKeyByIdForOrg(id, orgId)`
- `revokeApiKeyForOrg(id, orgId)`
- `getApiKeyUsageForOrg(id, orgId, ...)` (verify key ownership first).
2. Reject if key is not in active org.

## 6.2 Calls and Related Dialer Resources (Critical)

Files:
- `backend/src/api/controllers/dialer.controller.ts`
- `backend/src/services/dialer.service.ts`
- `backend/src/repositories/call.repository.ts`
- `backend/src/repositories/voicemailDrop.repository.ts`
- `backend/src/repositories/disposition.repository.ts`
- `backend/src/repositories/voicemailGreeting.repository.ts`

Current risk:
1. `getCall`, `endCall`, `setCallDisposition`, `dropVoicemail`, `getCallRecording`, `markVoicemailRead`, delete/update routes for dispositions and voicemail assets rely on unscoped ID queries/mutations.
2. Some scoped variants exist in `call.repository.ts` but are not consistently used.

Wave 1 fix:
1. Enforce org-scoped lookup/update/delete for all user-facing call/disposition/voicemail ID operations.
2. Add scoped repository variants where missing and replace unscoped service usage.

## 6.3 Active Dialer Sessions (High)

Files:
- `backend/src/api/routes/dialer.ts`
- `backend/src/services/activeDialerSession.service.ts`
- `backend/src/repositories/activeDialerSession.repository.ts`

Current risk:
1. End session by `sessionId` without explicit org ownership check.

Wave 1 fix:
1. Add `endSessionForOrg(sessionId, orgId)` and require org match before ending.

## 6.4 Parallel Dialer Sessions (Critical)

Files:
- `backend/src/api/routes/parallelDialer.ts`
- `backend/src/services/parallelDialer.service.ts`
- `backend/src/repositories/parallelDialSession.repository.ts`

Current risk:
1. Session operations (`get`, `pause`, `resume`, `end`, `join`) use `sessionId` lookups without org-scoped enforcement.
2. Request parsing pattern allows potential client override of injected `organizationId` due to spread order.

Wave 1 fix:
1. Add repository/service methods scoped by `sessionId + orgId`.
2. For all parse payloads, force server org precedence.

## 6.5 Enrichment Vendor Mutations (Critical)

Files:
- `backend/src/api/routes/enrichment.ts`
- `backend/src/services/enrichment.service.ts`

Current risk:
1. `updateVendorConnection`, `disconnectVendor`, `testVendorConnection` operate by `connectionId` only.
2. `getLeadContactInfo(leadId)` does not enforce org ownership.

Wave 1 fix:
1. Add org-scoped vendor mutation methods (`connectionId + orgId`).
2. Change contact info reads to require `leadId + orgId`.
3. Enforce server-side org precedence when parsing request payload.

---

## 7. Superadmin and Break-Glass Policy

1. Superadmin bypass remains explicit and audited only.
2. Bypass usage must emit structured security audit events including:
- Actor ID
- Target org
- Action
- Correlation/request ID

---

## 8. Verification Requirements

1. Penetration tests for all listed ID-based endpoints:
- Cross-org read attempts must return 404/403.
- Cross-org writes must not mutate data.
2. Regression tests for same-org access must continue to succeed.
3. Static checks or lint rules must flag unscoped repository usage in user-facing services.

---

## 9. Definition of Done (Wave 1)

1. All known at-risk paths are migrated to scoped access helpers.
2. No user-facing ID mutation path remains unscoped.
3. Automated authz tests cover all routes listed in Section 5.
4. Security review sign-off recorded for Session A scope.

---

## 10. Dependencies and Cross-Spec Links

1. Charter and Wave policy: `specs/launch-readiness/00-launch-charter.md`.
2. Auth/session invariants that supply authoritative org context: `specs/launch-readiness/02-auth-magic-link-and-session-hardening.md`.
3. Billing and quota controls that depend on scoped org ownership: `specs/launch-readiness/03-billing-limits-and-abuse-protection.md`.
4. Dialer and webhook paths that must enforce the same scoped lookup pattern: `specs/launch-readiness/05-dialer-reliability-and-state-model.md`.
5. Enrichment/extension route families requiring identical org-scoping: `specs/launch-readiness/06-enrichment-extension-and-api-compliance.md`.
6. Consolidated API/schema deltas and rollout order: `specs/launch-readiness/11-api-and-schema-change-log.md`.
