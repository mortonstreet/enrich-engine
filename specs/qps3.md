# QPS Optimization Phase 3: Caching & Connection Optimization

**Module Owner:** Terminal 3
**Status:** Pending
**Dependencies:** None (can be implemented independently)
**Parallel Safe:** Yes - creates new modules, touches different files than Phase 1/2

---

## Overview

This phase focuses on reducing redundant API calls through caching and optimizing HTTP connections. Target: **30-50% reduction in API calls + faster response times**

### Goals
- Implement Redis-based domain cache (cross-job persistence)
- Add HTTP connection pooling with keep-alive
- Implement adaptive rate limiting based on Serper response headers
- Create cache warming for common company domains

---

## New Files to Create

### 1. `backend/src/lib/cache/domainCache.ts`

Redis-backed domain cache with TTL and statistics.

```typescript
// backend/src/lib/cache/domainCache.ts

import { Redis } from 'ioredis';

export interface DomainCacheOptions {
  redis: Redis;
  keyPrefix?: string;
  ttlSeconds?: number; // Default: 7 days
  maxSize?: number; // Max entries (for memory management)
}

export interface DomainCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

export class DomainCache {
  private redis: Redis;
  private keyPrefix: string;
  private ttlSeconds: number;
  private statsKey: string;

  // Local in-flight request deduplication
  private pending: Map<string, Promise<string | null>> = new Map();

  constructor(options: DomainCacheOptions) {
    this.redis = options.redis;
    this.keyPrefix = options.keyPrefix ?? 'domain_cache';
    this.ttlSeconds = options.ttlSeconds ?? 60 * 60 * 24 * 7; // 7 days
    this.statsKey = `${this.keyPrefix}:stats`;
  }

  /**
   * Normalizes company name for cache key
   */
  private normalizeKey(company: string): string {
    return company
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 100); // Limit key length
  }

  /**
   * Gets full Redis key
   */
  private getKey(company: string): string {
    return `${this.keyPrefix}:${this.normalizeKey(company)}`;
  }

  /**
   * Gets domain from cache
   * Returns: domain string, null (explicitly no domain), or undefined (not cached)
   */
  async get(company: string): Promise<string | null | undefined> {
    const key = this.getKey(company);

    try {
      const value = await this.redis.get(key);

      if (value === null) {
        await this.incrementStat('misses');
        return undefined; // Not in cache
      }

      await this.incrementStat('hits');

      // "NULL" sentinel value means we cached "no domain found"
      if (value === '__NULL__') {
        return null;
      }

      return value;
    } catch (error) {
      console.error('DomainCache.get error:', error);
      return undefined;
    }
  }

  /**
   * Sets domain in cache
   */
  async set(company: string, domain: string | null): Promise<void> {
    const key = this.getKey(company);

    try {
      // Use sentinel value for null domains
      const value = domain ?? '__NULL__';
      await this.redis.setex(key, this.ttlSeconds, value);
    } catch (error) {
      console.error('DomainCache.set error:', error);
    }
  }

  /**
   * Gets or fetches with deduplication of in-flight requests
   */
  async getOrFetch(
    company: string,
    fetcher: () => Promise<string | null>
  ): Promise<string | null> {
    // Check cache first
    const cached = await this.get(company);
    if (cached !== undefined) {
      return cached;
    }

    // Check for pending request
    const normalizedKey = this.normalizeKey(company);
    const pendingRequest = this.pending.get(normalizedKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Start new fetch
    const fetchPromise = fetcher()
      .then(async (domain) => {
        await this.set(company, domain);
        this.pending.delete(normalizedKey);
        return domain;
      })
      .catch((error) => {
        this.pending.delete(normalizedKey);
        throw error;
      });

    this.pending.set(normalizedKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Batch get multiple domains
   */
  async getMany(companies: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    if (companies.length === 0) {
      return results;
    }

    const keys = companies.map(c => this.getKey(c));

    try {
      const values = await this.redis.mget(...keys);

      for (let i = 0; i < companies.length; i++) {
        const value = values[i];
        if (value !== null) {
          results.set(companies[i], value === '__NULL__' ? null : value);
        }
      }
    } catch (error) {
      console.error('DomainCache.getMany error:', error);
    }

    return results;
  }

  /**
   * Batch set multiple domains
   */
  async setMany(entries: Array<{ company: string; domain: string | null }>): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();

      for (const { company, domain } of entries) {
        const key = this.getKey(company);
        const value = domain ?? '__NULL__';
        pipeline.setex(key, this.ttlSeconds, value);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('DomainCache.setMany error:', error);
    }
  }

  /**
   * Warms cache with known domains
   */
  async warmCache(entries: Array<{ company: string; domain: string }>): Promise<number> {
    let warmed = 0;

    for (const { company, domain } of entries) {
      const cached = await this.get(company);
      if (cached === undefined) {
        await this.set(company, domain);
        warmed++;
      }
    }

    return warmed;
  }

  /**
   * Gets cache statistics
   */
  async getStats(): Promise<DomainCacheStats> {
    try {
      const [hits, misses] = await Promise.all([
        this.redis.hget(this.statsKey, 'hits'),
        this.redis.hget(this.statsKey, 'misses'),
      ]);

      const hitsNum = parseInt(hits ?? '0', 10);
      const missesNum = parseInt(misses ?? '0', 10);
      const total = hitsNum + missesNum;

      // Get approximate cache size
      const keys = await this.redis.keys(`${this.keyPrefix}:*`);
      const size = keys.filter(k => k !== this.statsKey).length;

      return {
        hits: hitsNum,
        misses: missesNum,
        hitRate: total > 0 ? hitsNum / total : 0,
        size,
      };
    } catch (error) {
      console.error('DomainCache.getStats error:', error);
      return { hits: 0, misses: 0, hitRate: 0, size: 0 };
    }
  }

  /**
   * Increments a stat counter
   */
  private async incrementStat(stat: 'hits' | 'misses'): Promise<void> {
    try {
      await this.redis.hincrby(this.statsKey, stat, 1);
    } catch (error) {
      // Non-critical, ignore
    }
  }

  /**
   * Clears the cache (for testing)
   */
  async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    this.pending.clear();
  }
}
```

### 2. `backend/src/lib/cache/index.ts`

Cache singleton and exports.

```typescript
// backend/src/lib/cache/index.ts

import { DomainCache } from './domainCache';
import { getRedisClient } from '../redis';

export { DomainCache, type DomainCacheStats } from './domainCache';

let domainCacheInstance: DomainCache | null = null;

/**
 * Gets or creates the domain cache singleton
 */
export function getDomainCache(): DomainCache | null {
  if (domainCacheInstance) {
    return domainCacheInstance;
  }

  const redis = getRedisClient();
  if (!redis) {
    console.warn('Redis not available - domain caching disabled');
    return null;
  }

  domainCacheInstance = new DomainCache({
    redis,
    keyPrefix: 'domain_cache',
    ttlSeconds: 60 * 60 * 24 * 7, // 7 days
  });

  return domainCacheInstance;
}

/**
 * Resets the cache singleton (for testing)
 */
export function resetDomainCache(): void {
  domainCacheInstance = null;
}
```

### 3. `backend/src/lib/httpAgent.ts`

HTTP agent with connection pooling and keep-alive.

```typescript
// backend/src/lib/httpAgent.ts

import https from 'https';
import http from 'http';

export interface HttpAgentOptions {
  maxSockets?: number;
  maxFreeSockets?: number;
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: HttpAgentOptions = {
  maxSockets: 100, // Max concurrent connections per host
  maxFreeSockets: 20, // Keep 20 connections warm
  keepAlive: true,
  keepAliveMsecs: 30000, // 30 second keep-alive
  timeout: 30000, // 30 second timeout
};

// Singleton agents
let httpsAgent: https.Agent | null = null;
let httpAgent: http.Agent | null = null;

/**
 * Gets the HTTPS agent with connection pooling
 */
export function getHttpsAgent(options?: HttpAgentOptions): https.Agent {
  if (httpsAgent) {
    return httpsAgent;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  httpsAgent = new https.Agent({
    maxSockets: opts.maxSockets,
    maxFreeSockets: opts.maxFreeSockets,
    keepAlive: opts.keepAlive,
    keepAliveMsecs: opts.keepAliveMsecs,
    timeout: opts.timeout,
  });

  return httpsAgent;
}

/**
 * Gets the HTTP agent with connection pooling
 */
export function getHttpAgent(options?: HttpAgentOptions): http.Agent {
  if (httpAgent) {
    return httpAgent;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  httpAgent = new http.Agent({
    maxSockets: opts.maxSockets,
    maxFreeSockets: opts.maxFreeSockets,
    keepAlive: opts.keepAlive,
    keepAliveMsecs: opts.keepAliveMsecs,
    timeout: opts.timeout,
  });

  return httpAgent;
}

/**
 * Gets agent stats for monitoring
 */
export function getAgentStats(): {
  https: { sockets: number; freeSockets: number; requests: number };
  http: { sockets: number; freeSockets: number; requests: number };
} {
  const countSockets = (obj: Record<string, unknown[]> | undefined) =>
    Object.values(obj ?? {}).reduce((sum, arr) => sum + arr.length, 0);

  return {
    https: {
      sockets: countSockets(httpsAgent?.sockets),
      freeSockets: countSockets(httpsAgent?.freeSockets),
      requests: countSockets(httpsAgent?.requests),
    },
    http: {
      sockets: countSockets(httpAgent?.sockets),
      freeSockets: countSockets(httpAgent?.freeSockets),
      requests: countSockets(httpAgent?.requests),
    },
  };
}

/**
 * Destroys all agents (for graceful shutdown)
 */
export function destroyAgents(): void {
  httpsAgent?.destroy();
  httpAgent?.destroy();
  httpsAgent = null;
  httpAgent = null;
}
```

### 4. `backend/src/lib/adaptiveRateLimiter.ts`

Adaptive rate limiting based on API response headers.

```typescript
// backend/src/lib/adaptiveRateLimiter.ts

export interface RateLimitHeaders {
  'x-ratelimit-limit'?: string;
  'x-ratelimit-remaining'?: string;
  'x-ratelimit-reset'?: string;
  'retry-after'?: string;
}

export interface AdaptiveRateLimiterConfig {
  baseTargetQps: number;
  minTargetQps: number;
  maxTargetQps: number;
  adjustmentFactor: number; // 0.1 = adjust by 10%
  cooldownMs: number; // Wait before adjusting again
  onAdjust?: (newTargetQps: number, reason: string) => void;
}

export class AdaptiveRateLimiter {
  private currentTargetQps: number;
  private config: AdaptiveRateLimiterConfig;
  private lastAdjustmentTime: number = 0;
  private consecutiveSuccesses: number = 0;
  private consecutiveThrottles: number = 0;

  constructor(config: Partial<AdaptiveRateLimiterConfig> = {}) {
    this.config = {
      baseTargetQps: config.baseTargetQps ?? 300,
      minTargetQps: config.minTargetQps ?? 50,
      maxTargetQps: config.maxTargetQps ?? 300,
      adjustmentFactor: config.adjustmentFactor ?? 0.1,
      cooldownMs: config.cooldownMs ?? 5000,
      onAdjust: config.onAdjust,
    };

    this.currentTargetQps = this.config.baseTargetQps;
  }

  /**
   * Processes response headers and adjusts rate if needed
   */
  processResponse(headers: RateLimitHeaders, statusCode: number): void {
    const now = Date.now();

    // Handle rate limit errors
    if (statusCode === 429) {
      this.consecutiveThrottles++;
      this.consecutiveSuccesses = 0;

      if (this.canAdjust(now)) {
        this.decreaseRate('429 response');
      }

      // Check retry-after header
      const retryAfter = headers['retry-after'];
      if (retryAfter) {
        const waitMs = parseInt(retryAfter, 10) * 1000;
        console.log(`Rate limited - waiting ${waitMs}ms`);
      }

      return;
    }

    // Success - consider increasing rate
    if (statusCode >= 200 && statusCode < 300) {
      this.consecutiveSuccesses++;
      this.consecutiveThrottles = 0;

      // Check remaining quota
      const remaining = headers['x-ratelimit-remaining'];
      const limit = headers['x-ratelimit-limit'];

      if (remaining && limit) {
        const remainingNum = parseInt(remaining, 10);
        const limitNum = parseInt(limit, 10);
        const utilizationPercent = ((limitNum - remainingNum) / limitNum) * 100;

        // If we're using less than 70% of limit, try increasing
        if (utilizationPercent < 70 && this.consecutiveSuccesses >= 100 && this.canAdjust(now)) {
          this.increaseRate('Low utilization');
        }

        // If we're over 95% of limit, decrease
        if (utilizationPercent > 95 && this.canAdjust(now)) {
          this.decreaseRate('High utilization');
        }
      }
    }
  }

  /**
   * Checks if enough time has passed since last adjustment
   */
  private canAdjust(now: number): boolean {
    return now - this.lastAdjustmentTime >= this.config.cooldownMs;
  }

  /**
   * Decreases target QPS
   */
  private decreaseRate(reason: string): void {
    const decrease = Math.ceil(this.currentTargetQps * this.config.adjustmentFactor);
    const newTarget = Math.max(this.config.minTargetQps, this.currentTargetQps - decrease);

    if (newTarget !== this.currentTargetQps) {
      this.currentTargetQps = newTarget;
      this.lastAdjustmentTime = Date.now();
      this.config.onAdjust?.(newTarget, `Decreased: ${reason}`);
    }
  }

  /**
   * Increases target QPS
   */
  private increaseRate(reason: string): void {
    const increase = Math.ceil(this.currentTargetQps * this.config.adjustmentFactor);
    const newTarget = Math.min(this.config.maxTargetQps, this.currentTargetQps + increase);

    if (newTarget !== this.currentTargetQps) {
      this.currentTargetQps = newTarget;
      this.lastAdjustmentTime = Date.now();
      this.consecutiveSuccesses = 0; // Reset counter
      this.config.onAdjust?.(newTarget, `Increased: ${reason}`);
    }
  }

  /**
   * Gets current target QPS
   */
  getTargetQps(): number {
    return this.currentTargetQps;
  }

  /**
   * Gets current state for monitoring
   */
  getState(): {
    currentTargetQps: number;
    consecutiveSuccesses: number;
    consecutiveThrottles: number;
  } {
    return {
      currentTargetQps: this.currentTargetQps,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveThrottles: this.consecutiveThrottles,
    };
  }

  /**
   * Resets to base configuration
   */
  reset(): void {
    this.currentTargetQps = this.config.baseTargetQps;
    this.consecutiveSuccesses = 0;
    this.consecutiveThrottles = 0;
    this.lastAdjustmentTime = 0;
  }
}
```

### 5. `backend/src/lib/cache/cacheWarmer.ts`

Pre-warms domain cache with popular companies.

```typescript
// backend/src/lib/cache/cacheWarmer.ts

import { DomainCache } from './domainCache';

/**
 * Common companies with known domains
 * Add more as needed based on your user base
 */
const KNOWN_DOMAINS: Array<{ company: string; domain: string }> = [
  { company: 'Google', domain: 'google.com' },
  { company: 'Microsoft', domain: 'microsoft.com' },
  { company: 'Apple', domain: 'apple.com' },
  { company: 'Amazon', domain: 'amazon.com' },
  { company: 'Meta', domain: 'meta.com' },
  { company: 'Facebook', domain: 'facebook.com' },
  { company: 'Netflix', domain: 'netflix.com' },
  { company: 'Salesforce', domain: 'salesforce.com' },
  { company: 'Oracle', domain: 'oracle.com' },
  { company: 'IBM', domain: 'ibm.com' },
  { company: 'Intel', domain: 'intel.com' },
  { company: 'Cisco', domain: 'cisco.com' },
  { company: 'Adobe', domain: 'adobe.com' },
  { company: 'SAP', domain: 'sap.com' },
  { company: 'Stripe', domain: 'stripe.com' },
  { company: 'Shopify', domain: 'shopify.com' },
  { company: 'Slack', domain: 'slack.com' },
  { company: 'Zoom', domain: 'zoom.us' },
  { company: 'Twitter', domain: 'twitter.com' },
  { company: 'X', domain: 'x.com' },
  { company: 'LinkedIn', domain: 'linkedin.com' },
  { company: 'Uber', domain: 'uber.com' },
  { company: 'Lyft', domain: 'lyft.com' },
  { company: 'Airbnb', domain: 'airbnb.com' },
  { company: 'Square', domain: 'squareup.com' },
  { company: 'Block', domain: 'block.xyz' },
  { company: 'PayPal', domain: 'paypal.com' },
  { company: 'Intuit', domain: 'intuit.com' },
  { company: 'HubSpot', domain: 'hubspot.com' },
  { company: 'Atlassian', domain: 'atlassian.com' },
  { company: 'Twilio', domain: 'twilio.com' },
  { company: 'Datadog', domain: 'datadoghq.com' },
  { company: 'Snowflake', domain: 'snowflake.com' },
  { company: 'MongoDB', domain: 'mongodb.com' },
  { company: 'Cloudflare', domain: 'cloudflare.com' },
  { company: 'Okta', domain: 'okta.com' },
  { company: 'Zscaler', domain: 'zscaler.com' },
  { company: 'CrowdStrike', domain: 'crowdstrike.com' },
  { company: 'Palo Alto Networks', domain: 'paloaltonetworks.com' },
  { company: 'ServiceNow', domain: 'servicenow.com' },
  { company: 'Workday', domain: 'workday.com' },
  { company: 'Splunk', domain: 'splunk.com' },
  { company: 'Tableau', domain: 'tableau.com' },
  { company: 'GitHub', domain: 'github.com' },
  { company: 'GitLab', domain: 'gitlab.com' },
  { company: 'Vercel', domain: 'vercel.com' },
  { company: 'Netlify', domain: 'netlify.com' },
  { company: 'Heroku', domain: 'heroku.com' },
  { company: 'DigitalOcean', domain: 'digitalocean.com' },
];

/**
 * Warms the domain cache with known company domains
 */
export async function warmDomainCache(cache: DomainCache): Promise<{
  warmed: number;
  skipped: number;
}> {
  let warmed = 0;
  let skipped = 0;

  for (const { company, domain } of KNOWN_DOMAINS) {
    const existing = await cache.get(company);

    if (existing === undefined) {
      await cache.set(company, domain);
      warmed++;
    } else {
      skipped++;
    }
  }

  console.log(`Domain cache warmed: ${warmed} new entries, ${skipped} already cached`);

  return { warmed, skipped };
}

/**
 * Extracts unique companies from scrape job items for cache warming
 */
export function extractCompaniesFromItems(
  items: Array<{ inputData: Record<string, string> }>
): string[] {
  const companies = new Set<string>();

  for (const item of items) {
    if (item.inputData.company) {
      companies.add(item.inputData.company);
    }
  }

  return Array.from(companies);
}

/**
 * Pre-fetches domains for companies that aren't cached
 */
export async function prefetchDomains(
  cache: DomainCache,
  companies: string[],
  fetcher: (company: string) => Promise<string | null>,
  concurrency: number = 10
): Promise<{ cached: number; fetched: number; failed: number }> {
  let cached = 0;
  let fetched = 0;
  let failed = 0;

  // Check which companies need fetching
  const toFetch: string[] = [];

  for (const company of companies) {
    const existing = await cache.get(company);
    if (existing === undefined) {
      toFetch.push(company);
    } else {
      cached++;
    }
  }

  // Fetch in batches
  for (let i = 0; i < toFetch.length; i += concurrency) {
    const batch = toFetch.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async (company) => {
        const domain = await fetcher(company);
        await cache.set(company, domain);
        return domain;
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        fetched++;
      } else {
        failed++;
      }
    }
  }

  return { cached, fetched, failed };
}
```

---

## Files to Modify

### 1. `backend/src/clients/serper.client.ts`

Integrate HTTP agent and adaptive rate limiting.

```typescript
// Add imports
import { getHttpsAgent } from '../lib/httpAgent';
import { AdaptiveRateLimiter, RateLimitHeaders } from '../lib/adaptiveRateLimiter';
import { getDomainCache } from '../lib/cache';

// Create adaptive rate limiter instance
const adaptiveRateLimiter = new AdaptiveRateLimiter({
  baseTargetQps: 300,
  minTargetQps: 50,
  maxTargetQps: 300,
  onAdjust: (newQps, reason) => {
    console.log(`[Serper] Rate adjusted to ${newQps} QPS: ${reason}`);
    // TODO: Update the actual rate limiter (Phase 2 integration)
  },
});

// Modify serperFetch to use connection pooling
async function serperFetch(query: string, numResults: number = 10): Promise<SerperResponse> {
  // Rate limiting (Phase 2 handles this, but we track headers here)
  const rateLimiter = getSerperRateLimiter();
  await rateLimiter.acquire(1);

  const agent = getHttpsAgent();

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
    // @ts-ignore - fetch supports agent in Node.js
    agent,
  });

  // Extract rate limit headers for adaptive limiting
  const rateLimitHeaders: RateLimitHeaders = {
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') ?? undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') ?? undefined,
    'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') ?? undefined,
    'retry-after': response.headers.get('retry-after') ?? undefined,
  };

  adaptiveRateLimiter.processResponse(rateLimitHeaders, response.status);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Modify searchCompanyWebsite to use domain cache
export async function searchCompanyWebsite(companyName: string): Promise<string | null> {
  // Check Redis cache first
  const cache = getDomainCache();
  if (cache) {
    const cached = await cache.get(companyName);
    if (cached !== undefined) {
      return cached; // Return cached value (including null)
    }
  }

  // Rate limit and fetch
  const rateLimiter = getSerperRateLimiter();
  await rateLimiter.acquire(1);

  const agent = getHttpsAgent();

  // ... existing fetch logic ...

  const domain = extractDomainFromResults(/* ... */);

  // Cache the result
  if (cache) {
    await cache.set(companyName, domain);
  }

  return domain;
}

// Export for monitoring
export function getAdaptiveRateLimiterState() {
  return adaptiveRateLimiter.getState();
}
```

### 2. `backend/src/worker.ts`

Initialize cache warming on startup.

```typescript
// Add import
import { getDomainCache } from './lib/cache';
import { warmDomainCache } from './lib/cache/cacheWarmer';
import { destroyAgents } from './lib/httpAgent';

export async function startWorker() {
  // Warm domain cache on startup
  const cache = getDomainCache();
  if (cache) {
    await warmDomainCache(cache);
  }

  // ... existing worker setup ...

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    destroyAgents();
    // ... other cleanup
  });
}
```

### 3. `backend/src/services/scrape.service.ts`

Use Redis domain cache instead of in-memory (replaces Phase 1 DomainMemo when cache available).

```typescript
// Add import
import { getDomainCache } from '../lib/cache';
import { prefetchDomains, extractCompaniesFromItems } from '../lib/cache/cacheWarmer';

export async function processScrapeJob(jobId: string): Promise<void> {
  // ... existing setup ...

  const items = await scrapeJobRepository.findPendingItems(jobId);

  // Pre-fetch domains for all companies in this job
  const cache = getDomainCache();
  if (cache) {
    const companies = extractCompaniesFromItems(items);
    const prefetchResult = await prefetchDomains(
      cache,
      companies,
      (company) => serperClient.searchCompanyWebsite(company),
      20 // Prefetch 20 at a time
    );
    logger.info('Domain prefetch complete', { jobId, ...prefetchResult });
  }

  // Use Phase 1's DomainMemo as fallback, or pass cache to processor
  const domainCache = cache ?? new DomainMemo();

  // ... rest of processing ...
}
```

---

## Integration Points for Other Phases

### Phase 1 Integration

Phase 1's `DomainMemo` can be replaced with Redis cache:

```typescript
// In scrape.service.ts
const cache = getDomainCache();

// If Redis cache available, use it; otherwise fall back to DomainMemo
const domainMemo = cache
  ? {
      getOrFetch: (company: string, fetcher: () => Promise<string | null>) =>
        cache.getOrFetch(company, fetcher),
      getStats: () => cache.getStats(),
    }
  : new DomainMemo();
```

### Phase 2 Integration

Adaptive rate limiter can adjust Phase 2's rate limiter:

```typescript
// In adaptiveRateLimiter.ts onAdjust callback
onAdjust: (newQps, reason) => {
  // Call Phase 2's adjustment function
  adjustSerperTargetQps(newQps);
}
```

---

## API for Monitoring

### Cache Stats Endpoint

```typescript
// backend/src/api/routes/health.ts

import { getDomainCache } from '../../lib/cache';
import { getAgentStats } from '../../lib/httpAgent';
import { getAdaptiveRateLimiterState } from '../../clients/serper.client';

router.get('/health/cache', async (req, res) => {
  const cache = getDomainCache();
  const cacheStats = cache ? await cache.getStats() : null;
  const agentStats = getAgentStats();
  const adaptiveStats = getAdaptiveRateLimiterState();

  res.json({
    domainCache: cacheStats,
    httpAgent: agentStats,
    adaptiveRateLimiter: adaptiveStats,
  });
});
```

---

## Testing Checklist

### Unit Tests

- [ ] `DomainCache` - get/set works correctly
- [ ] `DomainCache` - handles null domains (no result)
- [ ] `DomainCache` - getOrFetch deduplicates in-flight requests
- [ ] `DomainCache` - batch operations work
- [ ] `AdaptiveRateLimiter` - decreases on 429
- [ ] `AdaptiveRateLimiter` - increases on low utilization
- [ ] `AdaptiveRateLimiter` - respects cooldown
- [ ] `HttpAgent` - connection reuse works

### Integration Tests

- [ ] Domain cache persists across jobs
- [ ] Cache warming loads known domains
- [ ] Prefetch reduces API calls for batch jobs
- [ ] HTTP connections are reused

### Load Tests

- [ ] Cache hit rate > 30% after warmup
- [ ] Connection pool handles 100+ concurrent requests
- [ ] Adaptive limiter responds to 429s appropriately

---

## Rollout Plan

1. **Deploy cache modules** (no impact - not yet used)
2. **Deploy HTTP agent** (no impact - not yet used)
3. **Deploy cache warming** on worker startup
4. **Enable domain cache** in Serper client
5. **Enable HTTP agent** in Serper client
6. **Enable adaptive rate limiting**
7. **Monitor:**
   - Cache hit rate
   - Connection pool utilization
   - Rate adjustment events

---

## Expected Improvement

| Metric | Before | After |
|--------|--------|-------|
| Domain API calls | 100% | 50-70% (30-50% cache hits) |
| Connection overhead | High (new per request) | Low (reused) |
| Response latency | ~200ms | ~150ms (connection reuse) |
| Rate limit errors | Occasional | Near zero (adaptive) |

---

## Environment Variables

```env
# Required (from Phase 2)
REDIS_URL=redis://localhost:6379

# Optional
DOMAIN_CACHE_TTL_DAYS=7
HTTP_AGENT_MAX_SOCKETS=100
HTTP_AGENT_KEEP_ALIVE_MS=30000
```
