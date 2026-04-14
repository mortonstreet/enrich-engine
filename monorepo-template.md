# Monorepo Template - Full Stack Deployment Guide

A battle-tested monorepo template for deploying full-stack applications with Next.js frontend and Express backend. This template incorporates lessons learned from production deployments to prevent common pitfalls.

---

## Technology Stack

### Frontend (Vercel)
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework with App Router |
| React | 19.x | UI library |
| TailwindCSS | 4.x | Styling |
| Tanstack Query | 5.x | Server state management |
| Zustand | 5.x | Client state management |
| Radix UI | Latest | Headless UI components |
| Zod | 4.x | Schema validation |

### Backend (Railway)
| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 5.x | HTTP server |
| BetterAuth | 1.4.x | Authentication |
| Prisma | 6.x | ORM / Database client |
| BullMQ | 5.x | Background job processing |
| ioredis | 5.x | Redis client |
| Pino | 10.x | Logging |
| Zod | 4.x | Schema validation |

### Infrastructure
| Service | Provider | Purpose |
|---------|----------|---------|
| Database | Supabase / Railway Postgres | PostgreSQL 16 |
| Cache/Queue | Redis Cloud / Upstash | Redis 7 with TLS |
| Email | Resend | Transactional email |
| Real-time | Pusher / Soketi | WebSockets |
| Error Tracking | Sentry / GlitchTip | Error monitoring |
| Analytics | PostHog / Vercel Analytics | Product analytics |

### Development Tools
| Tool | Purpose |
|------|---------|
| pnpm | Package manager |
| Nx | Monorepo build orchestration |
| tsdown | TypeScript bundler (backend) |
| tsx | TypeScript executor (development) |
| Husky | Git hooks |
| Prettier | Code formatting |

---

## Project Structure

```
monorepo/
├── frontend/                 # Next.js application
│   ├── app/                  # App Router pages
│   ├── components/
│   │   ├── ui/               # Lowercase file names (button.tsx, not Button.tsx)
│   │   └── features/         # Feature components
│   ├── hooks/                # Custom hooks (one per endpoint)
│   ├── lib/
│   │   ├── config.ts         # Environment validation
│   │   ├── api.ts            # API client
│   │   └── auth-client.ts    # BetterAuth client
│   └── config/
│       ├── endpoints.ts      # API endpoints
│       └── queryKeys.ts      # React Query keys
│
├── backend/                  # Express application
│   ├── src/
│   │   ├── api/
│   │   │   ├── app.ts        # Express app with CORRECT middleware order
│   │   │   ├── routes/       # Route definitions
│   │   │   └── controllers/  # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── repositories/     # Database access
│   │   ├── lib/
│   │   │   ├── better-auth.ts    # Auth with cross-domain config
│   │   │   └── redis.ts          # Redis with TLS support
│   │   ├── config/
│   │   │   └── index.ts      # Environment validation
│   │   └── server.ts         # Entry point
│   └── dist/                 # Build output
│
├── shared/
│   ├── db/                   # Prisma schema and client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   └── types/                # Shared TypeScript types
│       └── src/
│           └── requests/     # API request/response types
│
├── docker-compose.yml        # Local development services
├── railway.json              # Railway deployment config
├── pnpm-workspace.yaml       # Workspace definition
└── package.json              # Root package.json
```

---

## Critical Configuration Patterns

### 1. Express Middleware Order (CRITICAL)

The order of middleware in Express is critical. Auth routes MUST come AFTER body parsers.

```typescript
// backend/src/api/app.ts
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/better-auth';

const app = express();

// 1. CORS - First
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// 2. Body Parsers - BEFORE auth routes
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// 3. Request Logging
app.use(requestLogger);

// 4. Auth Routes - AFTER body parsers
app.all('/api/auth/*splat', toNodeHandler(auth));

// 5. API Routes
app.use('/api', apiRouter);

// 6. Error Handler - Last
app.use(errorHandler);
```

**Why this matters**: If auth routes are mounted before body parsers, `req.body` will be undefined and all auth requests will fail with "missing email/password" errors.

---

### 2. BetterAuth Cross-Domain Configuration (CRITICAL)

Production deployments often have frontend and backend on different domains. Cookies won't work without proper configuration.

```typescript
// backend/src/lib/better-auth.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const isProduction = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [process.env.FRONTEND_URL!],

  // CRITICAL: Cross-domain cookie configuration
  advanced: {
    crossSubDomainCookies: {
      enabled: isProduction,
    },
    defaultCookieAttributes: {
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    },
  },

  emailAndPassword: {
    enabled: true,
  },
});
```

**Required settings for cross-domain auth**:
- `sameSite: 'none'` - Allows cookies to be sent cross-origin
- `secure: true` - Required when using `sameSite: 'none'`
- `trustedOrigins` - Whitelist your frontend domain

---

### 3. Environment Variable Validation (CRITICAL)

Never use `.default()` for critical production values. Fail loudly instead of silently falling back to localhost.

```typescript
// frontend/lib/config.ts
import { z } from 'zod';

// WRONG - Silent fallback to localhost in production
const badSchema = z.object({
  API_URL: z.url().default('http://localhost:3001'), // z.url() expects URL object!
});

// CORRECT - Explicit string validation, no default
const schema = z.object({
  API_URL: z.string().url(),
});

// Validate at startup, fail fast if missing
function validateConfig() {
  const result = schema.safeParse({
    API_URL: process.env.NEXT_PUBLIC_API_URL,
  });

  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    throw new Error('Missing required environment variables');
  }

  return result.data;
}

export const config = validateConfig();
```

**Next.js specific**: Use `NEXT_PUBLIC_` prefix for any variable needed in browser code.

---

### 4. Redis TLS Configuration (CRITICAL)

Cloud Redis providers (Redis Cloud, Upstash, etc.) require TLS. Default Node.js verification fails with managed certificates.

```typescript
// backend/src/lib/redis.ts
import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL!;
const isTLS = redisUrl.startsWith('rediss://');

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  // TLS configuration for cloud Redis
  ...(isTLS && {
    tls: {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
    },
  }),

  // Retry strategy with exponential backoff
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('Redis: Max retries reached, giving up');
      return null;
    }
    const delay = Math.min(times * 1000, 30000);
    console.log(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
});

// Connection event handlers for debugging
redis.on('connect', () => {
  console.log('Redis: Connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('close', () => {
  console.log('Redis: Connection closed');
});
```

**Protocol detection**: `rediss://` = TLS enabled, `redis://` = no TLS

---

### 5. ESM/CommonJS Import Compatibility

When using ESM (`"type": "module"` in package.json), some packages using CommonJS exports need special handling.

```typescript
// WRONG - Named import from CJS module
import { twiml } from 'twilio';  // SyntaxError: Named export not found

// CORRECT - Default import with destructure
import twilio from 'twilio';
const { twiml } = twilio;
```

**Common CJS packages requiring this pattern**:
- twilio
- passport
- Some older AWS SDK packages

---

### 6. File Naming Convention (CRITICAL for Linux deployment)

macOS is case-insensitive, Linux is case-sensitive. Mixed casing causes deployment failures.

```
# WRONG - Will fail on Linux
components/ui/Button.tsx
components/ui/Input.tsx

# CORRECT - Use lowercase consistently
components/ui/button.tsx
components/ui/input.tsx
```

**Git rename for case-only changes**:
```bash
git mv Button.tsx button.tsx.tmp
git mv button.tsx.tmp button.tsx
```

---

## Deployment Configuration

### Railway (Backend)

Create `railway.json` in root:

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

**Key points**:
- Filter builds to backend workspace only
- Generate Prisma client before build AND before start
- Run migrations (`db:deploy`) on every deploy
- Use restart policy for resilience

### Railway Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Redis (must support TLS for Railway Redis)
REDIS_URL=rediss://...

# Auth
BETTER_AUTH_SECRET=<random-64-char-string>
BETTER_AUTH_URL=https://your-backend.railway.app

# Frontend URL for CORS
FRONTEND_URL=https://your-app.vercel.app

# Node environment
NODE_ENV=production
PORT=3001
```

---

### Vercel (Frontend)

Vercel auto-detects Next.js. Configure in project settings or `vercel.json`:

```json
{
  "buildCommand": "pnpm --filter frontend build",
  "outputDirectory": "frontend/.next",
  "installCommand": "pnpm install"
}
```

### Vercel Environment Variables

```bash
# API URL - MUST use NEXT_PUBLIC_ prefix
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Auth URL
NEXT_PUBLIC_AUTH_URL=https://your-backend.railway.app

# Optional: Analytics
NEXT_PUBLIC_POSTHOG_KEY=<key>
NEXT_PUBLIC_POSTHOG_HOST=<host>
```

---

## Local Development

### Start Services

```bash
# Start local infrastructure
docker-compose up -d

# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter @shared/db db:generate

# Run migrations
pnpm --filter @shared/db db:push

# Start backend (terminal 1)
pnpm --filter backend dev

# Start frontend (terminal 2)
pnpm --filter frontend dev
```

### Local Environment Files

**backend/.env**:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dev_db
REDIS_URL=redis://localhost:6380
BETTER_AUTH_SECRET=dev-secret-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=3001
```

**frontend/.env.local**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_URL=http://localhost:3001
```

---

## Pre-Deployment Checklist

### Code Quality
- [ ] `pnpm --filter backend tsc --noEmit` passes
- [ ] `pnpm --filter frontend tsc --noEmit` passes
- [ ] No uppercase component file names
- [ ] ESM imports use correct pattern for CJS packages

### Configuration
- [ ] No `.default()` on critical env vars
- [ ] `NEXT_PUBLIC_` prefix on all frontend browser vars
- [ ] Middleware order: CORS → Body → Auth → Routes → Error
- [ ] Cross-domain cookie config in BetterAuth
- [ ] Redis TLS config for cloud providers

### Deployment
- [ ] `railway.json` filters to backend workspace
- [ ] Prisma generate runs before build AND start
- [ ] Migrations run on deploy
- [ ] All secrets in environment variables (not in code)

### Testing
- [ ] Test production build locally: `pnpm --filter backend build && node backend/dist/server.mjs`
- [ ] Test auth flow end-to-end
- [ ] Test Redis connection with cloud provider
- [ ] Verify CORS headers in browser network tab

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Auth returns 400 with empty body | Middleware order wrong | Move body parsers before auth routes |
| Cookies not saved in production | Missing cross-domain config | Set `sameSite: 'none'`, `secure: true` |
| API_URL is localhost in prod | Validation fallback to default | Remove `.default()`, use `z.string().url()` |
| Redis connection fails | TLS verification | Add `rejectUnauthorized: false` for cloud Redis |
| Build fails on Vercel/Railway | Case-sensitive file system | Use lowercase file names |
| Import error in production | ESM/CJS mismatch | Use default import for CJS packages |
| Railway builds wrong package | Missing config | Add `railway.json` with workspace filter |

---

## Security Checklist

- [ ] `.env` files in `.gitignore`
- [ ] No secrets in code or logs
- [ ] `BETTER_AUTH_SECRET` is 64+ random characters
- [ ] Database credentials use least-privilege user
- [ ] CORS whitelist only trusted origins
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS enforced in production

---

## Monitoring & Observability

### Recommended Setup

1. **Error Tracking**: Sentry or GlitchTip (self-hosted)
2. **Logging**: Pino with Axiom/Logtail transport
3. **Analytics**: PostHog or Vercel Analytics
4. **Uptime**: Better Uptime or Railway built-in

### Logging Configuration

```typescript
// backend/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial template with bug fixes integrated |

This template represents lessons learned from production deployments. Follow these patterns to avoid days of debugging common issues.
