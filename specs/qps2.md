# QPS Optimization Phase 2: Rate Limiting Infrastructure

**Module Owner:** Terminal 2
**Status:** Pending
**Dependencies:** None (can be implemented independently)
**Parallel Safe:** Yes - creates new modules, minimal overlap with Phase 1/3

---

## Overview

This phase builds the centralized rate limiting infrastructure to coordinate QPS across all workers and jobs. Target: **Controlled 300 QPS with smooth distribution**

### Goals
- Implement token bucket rate limiter
- Build Redis-based distributed rate limiter for multi-worker coordination
- Create rate limiter factory with local fallback
- Integrate with Serper client as the enforcement point

---

## New Files to Create

### 1. `backend/src/lib/rateLimiter/tokenBucket.ts`

Local token bucket implementation for single-process use.

```typescript
// backend/src/lib/rateLimiter/tokenBucket.ts

export interface TokenBucketOptions {
  /** Maximum tokens in the bucket */
  maxTokens: number;
  /** Tokens added per second */
  refillRate: number;
  /** Initial tokens (defaults to maxTokens) */
  initialTokens?: number;
}

export class TokenBucket {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefillTime: number;
  private waitQueue: Array<{
    tokens: number;
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(options: TokenBucketOptions) {
    this.maxTokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.tokens = options.initialTokens ?? options.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refills tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Attempts to acquire tokens without waiting
   */
  tryAcquire(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Acquires tokens, waiting if necessary
   */
  async acquire(tokens: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      this.processWaitQueue();
      return;
    }

    // Calculate wait time
    const deficit = tokens - this.tokens;
    const waitTimeMs = (deficit / this.refillRate) * 1000;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from queue on timeout
        const index = this.waitQueue.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
        }
        reject(new Error('Rate limiter timeout'));
      }, waitTimeMs + 5000); // 5 second buffer

      this.waitQueue.push({
        tokens,
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject,
      });

      // Schedule processing
      setTimeout(() => this.processWaitQueue(), waitTimeMs);
    });
  }

  /**
   * Processes waiting requests
   */
  private processWaitQueue(): void {
    this.refill();

    while (this.waitQueue.length > 0) {
      const next = this.waitQueue[0];

      if (this.tokens >= next.tokens) {
        this.tokens -= next.tokens;
        this.waitQueue.shift();
        next.resolve();
      } else {
        break;
      }
    }
  }

  /**
   * Returns current state for monitoring
   */
  getState(): { tokens: number; maxTokens: number; queueLength: number } {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
      queueLength: this.waitQueue.length,
    };
  }
}
```

### 2. `backend/src/lib/rateLimiter/redisRateLimiter.ts`

Redis-based distributed rate limiter using sliding window.

```typescript
// backend/src/lib/rateLimiter/redisRateLimiter.ts

import { Redis } from 'ioredis';

export interface RedisRateLimiterOptions {
  /** Redis client instance */
  redis: Redis;
  /** Unique key prefix for this rate limiter */
  keyPrefix: string;
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Optional: tokens per request (default: 1) */
  tokensPerRequest?: number;
}

export class RedisRateLimiter {
  private redis: Redis;
  private keyPrefix: string;
  private maxRequests: number;
  private windowMs: number;
  private tokensPerRequest: number;

  constructor(options: RedisRateLimiterOptions) {
    this.redis = options.redis;
    this.keyPrefix = options.keyPrefix;
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.tokensPerRequest = options.tokensPerRequest ?? 1;
  }

  /**
   * Sliding window rate limiter using Redis sorted sets
   * Returns true if request is allowed, false if rate limited
   */
  async tryAcquire(tokens: number = 1): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const key = `${this.keyPrefix}:requests`;

    // Lua script for atomic check-and-update
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])
      local tokens = tonumber(ARGV[4])
      local windowMs = tonumber(ARGV[5])

      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

      -- Count current requests in window
      local currentCount = redis.call('ZCARD', key)

      if currentCount + tokens <= maxRequests then
        -- Add new request(s)
        for i = 1, tokens do
          redis.call('ZADD', key, now + i - 1, now .. ':' .. i .. ':' .. math.random())
        end
        -- Set expiry
        redis.call('PEXPIRE', key, windowMs)
        return 1
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      key,
      now,
      windowStart,
      this.maxRequests,
      tokens,
      this.windowMs
    );

    return result === 1;
  }

  /**
   * Acquires tokens, waiting if necessary
   */
  async acquire(tokens: number = 1): Promise<void> {
    const maxAttempts = 100;
    const baseDelay = 10; // ms

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (await this.tryAcquire(tokens)) {
        return;
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(1.5, attempt), 1000);
      const jitter = Math.random() * delay * 0.1;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }

    throw new Error('Rate limiter: max attempts exceeded');
  }

  /**
   * Returns current window statistics
   */
  async getStats(): Promise<{
    currentRequests: number;
    maxRequests: number;
    windowMs: number;
    utilizationPercent: number;
  }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const key = `${this.keyPrefix}:requests`;

    // Clean up and count
    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    const currentRequests = await this.redis.zcard(key);

    return {
      currentRequests,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      utilizationPercent: (currentRequests / this.maxRequests) * 100,
    };
  }

  /**
   * Resets the rate limiter (for testing)
   */
  async reset(): Promise<void> {
    const key = `${this.keyPrefix}:requests`;
    await this.redis.del(key);
  }
}
```

### 3. `backend/src/lib/rateLimiter/rateLimiterFactory.ts`

Factory for creating rate limiters with fallback support.

```typescript
// backend/src/lib/rateLimiter/rateLimiterFactory.ts

import { Redis } from 'ioredis';
import { TokenBucket } from './tokenBucket';
import { RedisRateLimiter } from './redisRateLimiter';

export interface RateLimiterInterface {
  acquire(tokens?: number): Promise<void>;
  tryAcquire(tokens?: number): boolean | Promise<boolean>;
  getStats?(): unknown;
}

export interface RateLimiterFactoryOptions {
  /** Target QPS */
  targetQps: number;
  /** Redis client (optional - falls back to local if not provided) */
  redis?: Redis;
  /** Key prefix for Redis rate limiter */
  keyPrefix?: string;
  /** Burst allowance as multiplier of QPS (default: 1.5) */
  burstMultiplier?: number;
}

/**
 * Creates appropriate rate limiter based on environment
 */
export function createRateLimiter(options: RateLimiterFactoryOptions): RateLimiterInterface {
  const {
    targetQps,
    redis,
    keyPrefix = 'rate_limiter',
    burstMultiplier = 1.5,
  } = options;

  // Use Redis-based limiter if Redis is available
  if (redis) {
    return new RedisRateLimiter({
      redis,
      keyPrefix,
      maxRequests: targetQps, // Per second
      windowMs: 1000, // 1 second window
    });
  }

  // Fall back to local token bucket
  return new TokenBucket({
    maxTokens: Math.floor(targetQps * burstMultiplier),
    refillRate: targetQps,
  });
}

/**
 * Wraps a rate limiter with metrics and logging
 */
export function withMetrics(
  limiter: RateLimiterInterface,
  options: { name: string; logInterval?: number }
): RateLimiterInterface {
  const { name, logInterval = 10000 } = options;

  let acquireCount = 0;
  let waitCount = 0;
  let totalWaitMs = 0;

  // Log metrics periodically
  const intervalId = setInterval(() => {
    if (acquireCount > 0) {
      console.log(`[RateLimiter:${name}] Stats:`, {
        acquireCount,
        waitCount,
        avgWaitMs: waitCount > 0 ? (totalWaitMs / waitCount).toFixed(2) : 0,
        stats: limiter.getStats?.(),
      });
      acquireCount = 0;
      waitCount = 0;
      totalWaitMs = 0;
    }
  }, logInterval);

  // Clean up on process exit
  process.on('beforeExit', () => clearInterval(intervalId));

  return {
    async acquire(tokens?: number): Promise<void> {
      const start = Date.now();
      const couldAcquireImmediately = await limiter.tryAcquire(tokens);

      if (!couldAcquireImmediately) {
        waitCount++;
        await limiter.acquire(tokens);
        totalWaitMs += Date.now() - start;
      }

      acquireCount++;
    },

    tryAcquire(tokens?: number): boolean | Promise<boolean> {
      return limiter.tryAcquire(tokens);
    },

    getStats() {
      return limiter.getStats?.();
    },
  };
}
```

### 4. `backend/src/lib/rateLimiter/index.ts`

Public exports.

```typescript
// backend/src/lib/rateLimiter/index.ts

export { TokenBucket, type TokenBucketOptions } from './tokenBucket';
export { RedisRateLimiter, type RedisRateLimiterOptions } from './redisRateLimiter';
export {
  createRateLimiter,
  withMetrics,
  type RateLimiterInterface,
  type RateLimiterFactoryOptions,
} from './rateLimiterFactory';
```

### 5. `backend/src/lib/rateLimiter/serperRateLimiter.ts`

Singleton rate limiter specifically for Serper API.

```typescript
// backend/src/lib/rateLimiter/serperRateLimiter.ts

import { createRateLimiter, withMetrics, RateLimiterInterface } from './rateLimiterFactory';
import { getRedisClient } from '../redis';
import { config } from '../../config';

let serperRateLimiter: RateLimiterInterface | null = null;

/**
 * Gets or creates the Serper rate limiter singleton
 */
export function getSerperRateLimiter(): RateLimiterInterface {
  if (serperRateLimiter) {
    return serperRateLimiter;
  }

  const targetQps = config.serper?.targetQps ?? 300;
  const redis = getRedisClient();

  const baseLimiter = createRateLimiter({
    targetQps,
    redis,
    keyPrefix: 'serper_rate_limiter',
    burstMultiplier: 1.2, // Allow small bursts
  });

  serperRateLimiter = withMetrics(baseLimiter, {
    name: 'Serper',
    logInterval: 30000, // Log every 30 seconds
  });

  return serperRateLimiter;
}

/**
 * Resets the singleton (for testing)
 */
export function resetSerperRateLimiter(): void {
  serperRateLimiter = null;
}
```

---

## Files to Modify

### 1. `backend/src/clients/serper.client.ts`

Integrate rate limiter into all Serper API calls.

**Add import and rate limiter integration:**

```typescript
// At top of file
import { getSerperRateLimiter } from '../lib/rateLimiter/serperRateLimiter';

// Modify serperFetch function
async function serperFetch(query: string, numResults: number = 10): Promise<SerperResponse> {
  // Acquire rate limiter token before making request
  const rateLimiter = getSerperRateLimiter();
  await rateLimiter.acquire(1);

  const response = await fetch(SERPER_BASE_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': config.serper.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: numResults,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Also modify searchCompanyWebsite to use rate limiter
export async function searchCompanyWebsite(companyName: string): Promise<string | null> {
  const rateLimiter = getSerperRateLimiter();
  await rateLimiter.acquire(1);

  // ... rest of existing implementation
}
```

### 2. `backend/src/config/index.ts`

Add Serper QPS configuration.

```typescript
// Add to config object
serper: {
  apiKey: process.env.SERPER_API_KEY || '',
  targetQps: parseInt(process.env.SERPER_TARGET_QPS || '300', 10),
},
```

### 3. `backend/src/lib/redis.ts` (if not exists, create)

Ensure Redis client is available for rate limiter.

```typescript
// backend/src/lib/redis.ts

import Redis from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | undefined {
  if (redisClient) {
    return redisClient;
  }

  if (!config.redis?.url) {
    console.warn('Redis URL not configured - rate limiting will use local token bucket');
    return undefined;
  }

  try {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      ...(config.redis.tls && {
        tls: { rejectUnauthorized: false },
      }),
    });

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return undefined;
  }
}

export function closeRedisClient(): Promise<void> {
  if (redisClient) {
    return redisClient.quit().then(() => {
      redisClient = null;
    });
  }
  return Promise.resolve();
}
```

---

## Integration Points for Other Phases

### Phase 1 Integration

Phase 1's `batchProcessor.ts` accepts a `rateLimiter` parameter:

```typescript
// In scrape.service.ts (Phase 1)
import { getSerperRateLimiter } from '../lib/rateLimiter/serperRateLimiter';

await processBatch({
  items,
  batchSize: QPS_CONFIG.BATCH_SIZE,
  rateLimiter: getSerperRateLimiter(), // Inject rate limiter
  // ... rest of options
});
```

### Phase 3 Integration

Phase 3's adaptive rate limiting can adjust the target QPS:

```typescript
// Phase 3 will add this function
export function adjustSerperTargetQps(newTargetQps: number): void {
  // Recreate rate limiter with new target
  resetSerperRateLimiter();
  // Next call to getSerperRateLimiter() will use new config
}
```

---

## API for Monitoring

### Health Check Endpoint

Add rate limiter stats to health check.

```typescript
// backend/src/api/routes/health.ts

import { getSerperRateLimiter } from '../../lib/rateLimiter/serperRateLimiter';

router.get('/health/rate-limiter', async (req, res) => {
  const limiter = getSerperRateLimiter();
  const stats = await limiter.getStats?.();

  res.json({
    status: 'ok',
    rateLimiter: {
      ...stats,
      type: stats ? 'redis' : 'local',
    },
  });
});
```

---

## Testing Checklist

### Unit Tests

- [ ] `TokenBucket` - refills at correct rate
- [ ] `TokenBucket` - blocks when empty, resumes when refilled
- [ ] `TokenBucket` - handles concurrent acquires correctly
- [ ] `RedisRateLimiter` - sliding window works correctly
- [ ] `RedisRateLimiter` - distributed across multiple clients
- [ ] `RedisRateLimiter` - handles Redis failures gracefully
- [ ] Factory - creates correct limiter type based on env
- [ ] Factory - falls back to local when Redis unavailable

### Integration Tests

- [ ] Rate limiter enforces QPS limit under load
- [ ] Multiple workers share rate limit via Redis
- [ ] Serper client respects rate limits
- [ ] No requests exceed 300 QPS in any 1-second window

### Load Tests

- [ ] Sustained 300 QPS for 5 minutes
- [ ] Burst handling (500 requests in 100ms)
- [ ] Recovery after rate limit backoff
- [ ] Redis failover to local bucket

---

## Rollout Plan

1. **Deploy rate limiter modules** (no impact - not yet used)
2. **Deploy Redis lib updates**
3. **Deploy config updates** with `SERPER_TARGET_QPS=300`
4. **Deploy Serper client changes** - rate limiting now active
5. **Monitor:**
   - Rate limiter queue length
   - Request latency distribution
   - Serper API error rates
6. **Tune:**
   - Adjust `burstMultiplier` if needed
   - Adjust `targetQps` if Serper has issues

---

## Expected Behavior

| Scenario | Behavior |
|----------|----------|
| < 300 QPS | Requests pass through immediately |
| = 300 QPS | Smooth distribution, minimal waiting |
| > 300 QPS | Requests queue, ~3.3ms avg wait per excess request |
| Redis down | Falls back to local token bucket (per-process limiting) |
| Burst (500 req) | First 360 immediate (burst buffer), rest queued |

---

## Environment Variables

```env
# Required
SERPER_API_KEY=your_api_key

# Optional (defaults shown)
SERPER_TARGET_QPS=300
REDIS_URL=redis://localhost:6379
REDIS_TLS=false
```
