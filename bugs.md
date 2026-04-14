# Bug Report & Development Issues

This document catalogs all bugs, errors, and issues that impacted development of the OmniDial monorepo. Use this as a reference to avoid repeating these mistakes in future projects.

---

## Critical Issues Summary

| Category | Count | Severity | Status |
|----------|-------|----------|--------|
| Authentication/BetterAuth | 2 | Critical | Fixed |
| Environment Configuration | 3 | Critical | Fixed |
| Redis/TLS Configuration | 4 | High | Fixed |
| Deployment/Railway | 2 | Critical | Fixed |
| Module Compatibility (ESM/CJS) | 1 | High | Fixed |
| File System Case Sensitivity | 1 | High | Fixed |
| Type System/Schema | 2 | Medium | Fixed |

---

## 1. Authentication / BetterAuth Issues

### 1.1 Request Body Parsing Order (CRITICAL)

**Commit**: `c90d838`

**Problem**: Login and signup completely broken - auth endpoints received empty request bodies.

**Root Cause**: Express middleware order was incorrect. Auth routes (`/api/auth`) were mounted BEFORE body parsing middleware (`express.json()` and `bodyParser.json()`).

**Files Affected**:
- `backend/src/api/app.ts`
- `backend/src/server.ts`

**Symptoms**:
- 400 errors on all auth endpoints
- Empty `req.body` in auth handlers
- "Missing email or password" validation errors

**Fix**:
```typescript
// WRONG - auth routes before body parsing
app.use('/api/auth', authRoutes);
app.use(express.json());

// CORRECT - body parsing before auth routes
app.use(express.json());
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);
```

**Prevention**: Always configure middleware in this order:
1. CORS
2. Body parsers (express.json, bodyParser)
3. Request logging
4. Auth routes
5. Other routes
6. Error handlers

---

### 1.2 Cross-Domain Cookie Configuration (CRITICAL)

**Commit**: `524b3cf`

**Problem**: Authentication cookies not being set in production when frontend and backend are on different domains.

**Root Cause**: BetterAuth default cookie settings don't work cross-domain. Production deployments often have:
- Frontend: `app.example.com` (Vercel)
- Backend: `api.example.com` or Railway URL

**Files Affected**:
- `backend/src/lib/better-auth.ts`

**Symptoms**:
- Login succeeds but user immediately appears logged out
- Cookies visible in response but not stored in browser
- Works in localhost, fails in production

**Fix**:
```typescript
export const auth = betterAuth({
  // ... other config
  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
});
```

**Prevention**: Always configure cross-domain cookies for production auth:
- `sameSite: 'none'` for cross-origin
- `secure: true` for HTTPS (required with sameSite: none)
- Enable `crossSubDomainCookies` if using subdomains

---

## 2. Environment Configuration Issues

### 2.1 API_URL Validation Type Error

**Commit**: `38dbe38`

**Problem**: Frontend config validation failed silently, falling back to localhost in production.

**Root Cause**: Used `z.url()` which expects a URL object, but environment variables are always strings.

**Files Affected**:
- `frontend/lib/config.ts`

**Symptoms**:
- API requests going to `localhost:3001` in production
- No visible error (silent fallback to default)
- Works in development, fails in production

**Fix**:
```typescript
// WRONG
const schema = z.object({
  API_URL: z.url().default('http://localhost:3001'),
});

// CORRECT
const schema = z.object({
  API_URL: z.string().url(),
});
```

**Prevention**:
- Use `z.string().url()` for URL string validation
- Avoid `.default()` for critical production values - fail loudly instead
- Test config validation with actual production values

---

### 2.2 Next.js Public Environment Variables

**Commit**: `3461749`

**Problem**: Environment variables not available in client-side code.

**Root Cause**: Next.js requires `NEXT_PUBLIC_` prefix for client-accessible variables.

**Symptoms**:
- `process.env.API_URL` is `undefined` in browser
- Works in server components, fails in client components

**Fix**:
```bash
# .env
NEXT_PUBLIC_API_URL=https://api.example.com
```

```typescript
// config.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

**Prevention**: Always use `NEXT_PUBLIC_` prefix for any env var needed in the browser.

---

## 3. Redis Connection Issues

### 3.1 Redis TLS Configuration (Multiple Fixes)

**Commits**: `5ee0bde`, `e1a5064`, `385d537`, `f2a444d`

**Problem**: Redis connections failing with cloud providers (Redis Cloud, Upstash, etc.).

**Root Cause**: Cloud Redis instances use TLS with self-signed or custom certificates. Default Node.js TLS verification fails.

**Files Affected**:
- `backend/src/lib/redis.ts`

**Symptoms**:
- `ECONNREFUSED` errors
- `SELF_SIGNED_CERT_IN_CHAIN` errors
- `UNABLE_TO_VERIFY_LEAF_SIGNATURE` errors
- Connections work locally with Docker Redis, fail with cloud Redis

**Fix**:
```typescript
import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const isTLS = redisUrl?.startsWith('rediss://');

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(isTLS && {
    tls: {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
    },
  }),
  retryStrategy: (times) => {
    if (times > 10) return null;
    return Math.min(times * 1000, 30000);
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});
```

**Prevention**:
- Always check for `rediss://` protocol to detect TLS requirement
- Disable certificate verification for managed Redis services
- Implement proper retry strategy with backoff
- Add connection event handlers for debugging

---

## 4. Deployment Configuration Issues

### 4.1 Railway Monorepo Build Configuration

**Commit**: `1bdf06f`

**Problem**: Railway attempting to build entire monorepo instead of just backend.

**Root Cause**: No explicit build configuration; Railway auto-detected pnpm and tried to build everything.

**Files Affected**:
- `railway.json` (created)

**Symptoms**:
- Build failures due to frontend dependencies
- Memory exhaustion during build
- Wrong service started

**Fix**: Create `railway.json`:
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm --filter @shared/db db:generate && pnpm --filter backend build"
  },
  "deploy": {
    "startCommand": "pnpm --filter @shared/db db:generate && pnpm --filter @shared/db db:deploy && node backend/dist/server.mjs",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Prevention**: Always create explicit deployment configs for monorepos:
- Specify which workspace to build
- Run DB migrations before start
- Configure restart policies

---

## 5. Module Compatibility Issues

### 5.1 ESM/CommonJS Import Mismatch

**Commit**: `82ec63a`

**Problem**: Twilio SDK import failing at runtime on Railway.

**Root Cause**: Project uses ESM (`"type": "module"`), but Twilio uses CommonJS exports. Named imports don't work with CJS default exports.

**Files Affected**:
- `backend/src/api/routes/webhooks/twilio.ts`

**Symptoms**:
- Works with `ts-node` locally
- Fails with compiled ESM in production
- `SyntaxError: Named export 'twiml' not found`

**Fix**:
```typescript
// WRONG - named import from CJS module
import { twiml } from 'twilio';

// CORRECT - default import with destructure
import twilio from 'twilio';
const { twiml } = twilio;
```

**Prevention**:
- Check if dependencies use CJS or ESM
- Use default imports for CJS packages in ESM projects
- Test with production build locally before deploying

---

## 6. File System Case Sensitivity

### 6.1 Component File Naming

**Commit**: `7d2cfda`

**Problem**: Build succeeds on macOS, fails on Linux (Vercel/Railway).

**Root Cause**: macOS file system is case-insensitive; Linux is case-sensitive. Files named `Button.tsx` vs imports expecting `button.tsx`.

**Files Affected**:
- `frontend/components/ui/Button.tsx` → `button.tsx`
- `frontend/components/ui/Input.tsx` → `input.tsx`

**Symptoms**:
- `Module not found: Can't resolve './button'`
- Works in local development (macOS)
- Fails in CI/CD and production (Linux)

**Fix**:
```bash
# Git doesn't track case-only renames by default
git mv Button.tsx button.tsx.tmp
git mv button.tsx.tmp button.tsx
```

**Prevention**:
- Use consistent lowercase for all component files
- Configure ESLint to enforce naming conventions
- Test builds in Linux environment (Docker) before deploying

---

## 7. Type System Issues

### 7.1 Schema Validation Inconsistencies

**Commit**: `255930a`

**Problem**: TypeScript compilation errors across multiple files.

**Root Cause**: Multiple issues:
- Duplicate exports between files
- Missing required fields in schemas
- Invalid Zod method usage

**Files Affected**:
- `shared/types/src/requests/crm.ts`
- `shared/types/src/requests/lead.ts`
- Multiple controller files

**Specific Issues**:

1. **Duplicate exports**:
```typescript
// crm.ts had lead exports that conflicted with lead.ts
// Remove duplicates, keep single source of truth
```

2. **z.record() wrong usage**:
```typescript
// WRONG - single argument
z.record(z.string())

// CORRECT - key and value types
z.record(z.string(), z.string())
```

3. **Missing required fields**:
```typescript
// Add organizationId to multi-tenant queries
const schema = z.object({
  leadId: z.string(),
  organizationId: z.string(), // Required for tenant isolation
});
```

**Prevention**:
- Run `tsc --noEmit` in CI before merge
- Single source of truth for shared types
- Review Zod documentation for correct method signatures

---

## Development Environment Checklist

Before deploying, verify:

- [ ] Middleware order: CORS → Body parsers → Auth → Routes → Error handlers
- [ ] Cross-domain cookies configured for production
- [ ] Environment variables use correct prefixes (`NEXT_PUBLIC_` for frontend)
- [ ] No `.default()` on critical config values
- [ ] Redis TLS configured for cloud providers
- [ ] Monorepo build commands filter to correct workspace
- [ ] ESM/CJS imports tested with production build
- [ ] File naming uses consistent lowercase
- [ ] TypeScript compiles without errors
- [ ] All secrets in `.env` (never committed)

---

## Quick Debug Commands

```bash
# Test TypeScript compilation
pnpm --filter backend tsc --noEmit
pnpm --filter frontend tsc --noEmit

# Test production build locally
pnpm --filter backend build
node backend/dist/server.mjs

# Check for case sensitivity issues
find . -name "*.tsx" | xargs -I {} sh -c 'echo {} | grep -E "[A-Z]"'

# Verify environment variables
node -e "console.log(process.env.API_URL)"
```
