# Production Security Hardening Spec

## Status Summary

### COMPLETED (Phase 1 - Partial)

#### 1.1 Helmet Security Headers
- **Status:** DONE
- **File:** `backend/src/api/app.ts`
- `helmet` installed and added as first middleware after `express()` creation
- Configures X-Content-Type-Options, X-Frame-Options, HSTS, etc.

#### 1.2 Require ENCRYPTION_KEY in Production
- **Status:** DONE
- **File:** `backend/src/lib/encryption.ts`
- Throws error if `ENCRYPTION_KEY` is missing when `NODE_ENV=production`
- Falls back to JWT secret in dev only

#### 1.3 Sanitize Request Body Logging
- **Status:** DONE
- **File:** `backend/src/api/middlewares/requestLogger.ts`
- Added `sanitizeBody()` function that redacts sensitive keys (password, token, apiKey, secret, etc.)
- Applied to both Sentry context AND Axiom logger

#### 1.4 Remove console.log from Twilio Webhooks
- **Status:** DONE
- **File:** `backend/src/api/routes/webhooks/twilio.ts`
- All 50+ `console.log`/`console.error` statements replaced with structured `logger.info()`/`logger.debug()`/`logger.error()` calls
- No PII (phone numbers, CallSids) in log messages - only IDs

#### 1.5 Encrypt Twilio Auth Tokens
- **Status:** DONE
- **File:** `backend/src/lib/twilio.ts`
- `encryptAuthToken()` and `decryptAuthToken()` now use AES-256-GCM via `encrypt()`/`decrypt()` from `encryption.ts`
- Backwards compatible: detects plaintext tokens and passes them through during migration period
- **MIGRATION SCRIPT STILL NEEDED** - see remaining work below

#### 1.6 Encrypt Integration OAuth Tokens - PARTIALLY DONE
- **Status:** IN PROGRESS
- **Files modified:** `backend/src/services/integration.service.ts`, `backend/src/services/googleSheets.service.ts`
- Added `encryptToken()`/`decryptToken()` helpers in `integration.service.ts`
- `handleOAuthCallback()` now encrypts tokens before saving (Google Sheets + HubSpot)
- `googleSheets.service.ts` - `getAuthenticatedClient()` now decrypts tokens after reading from DB, encrypts refreshed tokens before saving
- **REMAINING:** See below

#### 1.7 Twilio Webhook Signature Verification
- **Status:** DONE
- **File:** `backend/src/api/routes/webhooks/twilio.ts`
- Created `verifyTwilioSignature` middleware using `twilio.validateRequest()`
- Applied to all Twilio webhook routes via `router.use(verifyTwilioSignature)`
- Resolves auth token from call context, phone number, or env var
- **File:** `backend/src/api/app.ts`
- Added raw body capture for Twilio webhook routes (like Slack pattern)
- Skips verification in development unless `VERIFY_TWILIO_SIGNATURE` env var is set

---

## COMPLETED (Phase 1 - Full, Phase 2-4 Partial)

Most Phase 1-4 code items have been implemented. **The following are NOT done:**
- **3.3 Cloudflare Setup** - NOT STARTED (manual/ops)
- **3.4 Tailscale Setup** - NOT STARTED (manual/ops)
- **3.5 Firewall Rules** - NOT STARTED (manual/ops, depends on 3.3)
- **4.4 Chrome Web Store Submission Prep** - Future
- **4.5 Mac App Store Submission Prep** - Future

---

## REMAINING WORK (All Done - Kept for Reference)

### Phase 1 Remaining (Critical)

#### 1.6 Encrypt Integration OAuth Tokens - FINISH
- **Files still needing token decryption:**
  1. `backend/src/services/googleSheets.service.ts` - `hasWriteScopes()` function (line ~294): needs to decrypt `accessToken` and `refreshToken` before use, and encrypt refreshed token before saving. Same pattern as `getAuthenticatedClient()` which is already done.
  2. `backend/src/services/hubspot.service.ts` - `getAuthenticatedHeaders()` function (line ~106): needs import of `decrypt`/`encrypt` from `@/lib/encryption`, add `decryptToken()` helper (same as in googleSheets), decrypt `accessToken` (line 106) and `refreshToken` (line 115/122) after DB read, encrypt refreshed tokens before saving (line 125-128).
- **Migration script:** Write a one-time script to encrypt all existing plaintext tokens in the `integration` table:
  ```
  -- For each row in integration where accessToken is not null:
  -- UPDATE integration SET "accessToken" = encrypt(accessToken), "refreshToken" = encrypt(refreshToken)
  ```
  Script location: `backend/src/scripts/encrypt-integration-tokens.ts`

#### 1.5 Migration Script for Twilio Auth Tokens
- Write a one-time script to encrypt existing plaintext `authTokenEncrypted` values in `twilio_config` table
- Script location: `backend/src/scripts/encrypt-twilio-tokens.ts`
- Logic: Read all twilio_config rows, for each row attempt decrypt - if it fails (plaintext), encrypt and update

---

### Phase 2: High Priority (Fix Within First Week)

#### 2.1 Apply Rate Limiting to Routes
- **File:** `backend/src/api/middlewares/rateLimiterMiddleware.ts` (currently 4 lines, unused)
- **Existing infra:** `backend/src/services/rate-limiter.service.ts` (Redis-based, well-built, ready to use)
- Expand middleware file with presets:
  - `authRateLimit` - 5 requests per 5 min per IP (login/signup)
  - `generalApiRateLimit` - 60 per min per user
  - `adminRateLimit` - 30 per min per user
  - `webhookRateLimit` - 100 per min per endpoint
  - `expensiveOperationRateLimit` - 10 per min per user (enrichment, research)
- Apply to routes:
  - Auth routes: `backend/src/api/routes/auth.ts`
  - Admin routes: `backend/src/api/routes/admin.ts`
  - Enrichment routes: `backend/src/api/routes/enrichment.ts`
  - Research routes: `backend/src/api/routes/research.ts`
  - Twilio webhooks: already in `backend/src/api/routes/webhooks/twilio.ts`
  - Global API: `backend/src/api/routes/index.ts`

#### 2.2 Next.js Security Headers
- **File:** `frontend/next.config.ts` (currently nearly empty)
- Add `headers()` function returning:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Permissions-Policy: camera=(), geolocation=(), microphone=(self)`
  - `Content-Security-Policy` allowing:
    - Stripe JS (`js.stripe.com`)
    - Pusher WebSocket (`*.pusher.com`, `wss://*.pusher.com`)
    - Twilio Client SDK (`*.twilio.com`, `media.twiliocdn.com`)
    - Google profile images (`lh3.googleusercontent.com`)
    - Microphone must be `(self)` for dialer functionality

#### 2.3 Sanitize dangerouslySetInnerHTML (XSS Prevention)
- `dompurify` + `@types/dompurify` already installed in frontend
- 4 locations to fix:
  1. `frontend/components/campaigns/ScriptManager.tsx:273` - script content preview
  2. `frontend/components/agents/ConversationView.tsx:203` - email body HTML (highest risk - user content)
  3. `frontend/app/(marketing)/blog/[slug]/page.tsx:769` - blog content
  4. `frontend/components/dialer/ScriptPanel.tsx:280` - script with variable highlighting
- Wrap all `__html` values with `DOMPurify.sanitize()`, using allowlists for safe tags
- Import pattern:
  ```typescript
  import DOMPurify from 'dompurify'
  // Then: dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
  ```

#### 2.4 Restrict Chrome Extension CORS
- **File:** `backend/src/api/app.ts` (line ~35 in corsOriginHandler)
- Currently `origin.startsWith('chrome-extension://')` allows ANY extension
- Change to whitelist specific extension ID(s) via `CHROME_EXTENSION_IDS` env var:
  ```typescript
  if (origin.startsWith('chrome-extension://')) {
    if (config.nodeEnv !== 'production') return callback(null, true)
    const allowedIds = (process.env.CHROME_EXTENSION_IDS || '').split(',')
    const extensionId = origin.replace('chrome-extension://', '')
    if (allowedIds.includes(extensionId)) return callback(null, true)
    return callback(new Error('Extension not allowed'))
  }
  ```

#### 2.5 Remove localhost from Extension Manifest
- **File:** `extension/manifest.json` (line 15)
- Remove `"http://localhost:*/*"` from `host_permissions` for production build
- Options:
  - A) Create `extension/manifest.prod.json` without localhost
  - B) Strip during build step in `extension/package.json`
  - C) Use environment variable in build script to conditionally include

#### 2.6 SSRF Protection for Firecrawl
- **File:** `backend/src/clients/firecrawl.client.ts`
- Add `validateUrl()` function before `scrape()` and `extract()` calls:
  ```typescript
  function validateUrl(url: string): void {
    const parsed = new URL(url)
    // Block non-http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP(S) URLs are allowed')
    }
    // Block localhost and loopback
    const hostname = parsed.hostname.toLowerCase()
    if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) {
      throw new Error('Local addresses are not allowed')
    }
    // Block private IP ranges
    const ipParts = hostname.split('.').map(Number)
    if (ipParts.length === 4) {
      if (ipParts[0] === 10) throw new Error('Private IP not allowed')
      if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) throw new Error('Private IP not allowed')
      if (ipParts[0] === 192 && ipParts[1] === 168) throw new Error('Private IP not allowed')
      if (ipParts[0] === 169 && ipParts[1] === 254) throw new Error('Link-local not allowed')
    }
  }
  ```
- Call `validateUrl(url)` at the top of both `scrape()` and `extract()` functions

#### 2.7 Call Repository Org Scoping
- **File:** `backend/src/repositories/call.repository.ts`
- `findById`, `findByTwilioCallSid`, `findByConferenceSid` don't filter by orgId
- Add org-scoped variants for user-facing API routes:
  ```typescript
  export const findByIdForOrg = async (id: string, orgId: string) => {
    return db.selectFrom('call')
      .innerJoin('twilio_config', 'twilio_config.id', 'call.twilioConfigId')
      .where('call.id', '=', id)
      .where('twilio_config.organizationId', '=', orgId)
      .selectAll('call')
      .executeTakeFirst()
  }
  ```
- Audit callers in controllers to determine which need org-scoped version
- Webhook handlers can use unscoped versions (protected by Twilio signature verification from 1.7)

---

### Phase 3: Infrastructure Hardening (Week 2)

#### 3.1 Admin Audit Logging
- Create migration for `admin_audit_log` table:
  ```sql
  CREATE TABLE admin_audit_log (
    id TEXT PRIMARY KEY,
    admin_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_admin_audit_log_admin ON admin_audit_log(admin_user_id);
  CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
  CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at);
  ```
- New files:
  - `backend/src/repositories/adminAuditLog.repository.ts` - CRUD operations
  - `backend/src/services/adminAuditLog.service.ts` - `logAdminAction(adminUserId, action, targetType, targetId, details, ipAddress)`
- Add `logAdminAction()` calls in `backend/src/services/admin.service.ts` for:
  - `deleteUser()`
  - `deleteOrganization()`
  - `reassignUser()`
  - `removeUserFromOrganization()`
  - `addOrganizationCredits()`
  - `resetUserPassword()`
  - `resolveDuplicateLeads()` (bulk delete)
  - `createOrganization()`
  - `provisionOrganization()`
  - `markOrganizationMainAccount()`
  - `switchOrg()`

#### 3.2 .gitignore Improvements
- **File:** `.gitignore`
- Add:
  ```
  # Environment files
  .env.*
  !.env.example

  # Secrets and credentials
  *.pem
  *.key
  credentials.json
  service-account*.json

  # IDE
  .idea/
  *.swp
  *.swo
  ```

#### 3.3 Cloudflare Setup (Manual/Ops) - NOT STARTED
- **Status:** NOT STARTED - Domain DNS may route through Cloudflare but WAF/proxy not configured
- **Note:** CSP updated to allow `static.cloudflareinsights.com` for when Web Analytics is enabled
- Place `app.omnidial.io`, `api.omnidial.io`, marketing site behind Cloudflare proxy
- Enable WAF managed rules (OWASP Core Ruleset)
- Enable DDoS protection (automatic)
- Enable bot management
- Force HTTPS via page rules
- Configure SSL/TLS to Full (Strict)

#### 3.4 Tailscale Setup (Manual/Ops) - NOT STARTED
- **Status:** NOT STARTED - Scripts exist in `scripts/vps-setup/` but not deployed
- Install Tailscale on production servers
- Put admin routes (`/api/admin/*`) behind Tailscale ACLs
- Use Tailscale SSH for production server access
- Restrict database (5432) and Redis (6379) to Tailscale network only

#### 3.5 Firewall Rules (Manual/Ops) - NOT STARTED
- **Status:** NOT STARTED - Depends on Cloudflare setup (3.3)
- Allow ports 80/443 only from Cloudflare IP ranges
- Block direct server access bypassing Cloudflare
- Allow internal ports only from app servers + Tailscale

---

### Phase 4: Ongoing Security Posture

#### 4.1 Password Complexity
- **File:** `backend/src/lib/better-auth.ts`
- Add `minPasswordLength: 8` to the `emailAndPassword` config:
  ```typescript
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    ...
  }
  ```

#### 4.2 Account Lockout
- Track failed login attempts in Redis using the rate limiter service
- Lock account after 5 failures in 15 minutes (30-min cooldown)
- Implementation:
  - Add `onError` hook in better-auth config to track failed login attempts
  - Key pattern: `login_attempts:${email}` in Redis sorted set
  - Before auth: check if account is locked, return 429 if so
  - Send notification email on lockout via Resend

#### 4.3 Dependency Auditing
- Add to CI pipeline: `pnpm audit --audit-level=high`
- Set up GitHub Dependabot (add `.github/dependabot.yml`)
- Run `pnpm audit` before each release

#### 4.4 Chrome Web Store Submission Prep
- Remove all localhost references from production manifest (see 2.5)
- Ensure minimal permissions (storage, activeTab, sidePanel - already good)
- Content scripts scoped to linkedin.com only (already good)
- Privacy policy page required at a public URL

#### 4.5 Mac App Store Submission Prep (Future)
- App Sandbox entitlements
- Hardened runtime
- Notarization with Apple Developer ID

---

## Verification Checklist

After implementation:
1. `cd backend && pnpm exec tsc --noEmit` - backend type check
2. `cd frontend && pnpm exec tsc --noEmit` - frontend type check
3. Test auth flow end-to-end (signup, login, 2FA)
4. Test Twilio webhook with signature validation (use `VERIFY_TWILIO_SIGNATURE=true`)
5. Verify rate limiting with rapid requests to auth endpoints
6. Check security headers: `curl -I https://api.omnidial.io/api/health`
7. Check frontend headers: `curl -I https://app.omnidial.io`
8. Run `pnpm audit` across all workspaces
9. Test Chrome extension CORS with production extension ID
10. Verify CSP doesn't break dialer (microphone), Stripe checkout, or Pusher WebSocket
11. Test admin audit logs are created for all destructive operations
12. Scan with OWASP ZAP or similar tool
