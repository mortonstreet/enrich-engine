# QPS Optimization Phase 1: Job Processing & Batching

**Module Owner:** Terminal 1
**Status:** Pending
**Dependencies:** None (can be implemented independently)
**Parallel Safe:** Yes - creates new utilities, modifies scrape.service.ts and scrape.queue.ts

---

## Overview

This phase focuses on increasing throughput by parallelizing item processing within jobs and increasing queue concurrency. Target: **10x improvement (10 QPS → 100 QPS)**

### Goals
- Increase queue concurrency from 1 to 10 concurrent jobs
- Batch process items with `Promise.all()` (20 items per batch)
- Add in-memory domain memoization within each job
- Reduce base delay from 100ms to 25ms (with rate limiter integration point)

---

## New Files to Create

### 1. `backend/src/utils/batchProcessor.ts`

Generic batch processing utility with concurrency control.

```typescript
// backend/src/utils/batchProcessor.ts

export interface BatchProcessorOptions<T, R> {
  items: T[];
  batchSize: number;
  processor: (item: T, index: number) => Promise<R>;
  onItemComplete?: (result: R, item: T, index: number) => void;
  onBatchComplete?: (results: R[], batchIndex: number) => void;
  delayBetweenItems?: number;  // ms delay between items within a batch
  delayBetweenBatches?: number; // ms delay between batches
  rateLimiter?: RateLimiterInterface; // Optional rate limiter integration
}

export interface RateLimiterInterface {
  acquire(tokens?: number): Promise<void>;
}

export interface BatchProcessorResult<R> {
  results: R[];
  successCount: number;
  errorCount: number;
  totalTimeMs: number;
}

export async function processBatch<T, R>(
  options: BatchProcessorOptions<T, R>
): Promise<BatchProcessorResult<R>> {
  const {
    items,
    batchSize,
    processor,
    onItemComplete,
    onBatchComplete,
    delayBetweenItems = 0,
    delayBetweenBatches = 0,
    rateLimiter,
  } = options;

  const results: R[] = [];
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  // Split items into batches
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    // Process batch items in parallel
    const batchPromises = batch.map(async (item, itemIndex) => {
      const globalIndex = batchIndex * batchSize + itemIndex;

      // Optional rate limiter integration
      if (rateLimiter) {
        await rateLimiter.acquire();
      }

      // Stagger requests within batch
      if (delayBetweenItems > 0 && itemIndex > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenItems * itemIndex));
      }

      try {
        const result = await processor(item, globalIndex);
        successCount++;
        onItemComplete?.(result, item, globalIndex);
        return result;
      } catch (error) {
        errorCount++;
        throw error;
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    // Extract successful results
    const successfulResults = batchResults
      .filter((r): r is PromiseFulfilledResult<R> => r.status === 'fulfilled')
      .map(r => r.value);

    results.push(...successfulResults);
    onBatchComplete?.(successfulResults, batchIndex);

    // Delay between batches
    if (delayBetweenBatches > 0 && batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return {
    results,
    successCount,
    errorCount,
    totalTimeMs: Date.now() - startTime,
  };
}
```

### 2. `backend/src/utils/domainMemo.ts`

In-memory domain memoization for within-job deduplication.

```typescript
// backend/src/utils/domainMemo.ts

export class DomainMemo {
  private cache: Map<string, string | null> = new Map();
  private pending: Map<string, Promise<string | null>> = new Map();

  /**
   * Normalizes company name for consistent cache keys
   */
  private normalizeKey(company: string): string {
    return company.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Gets cached domain or returns undefined if not cached
   */
  get(company: string): string | null | undefined {
    const key = this.normalizeKey(company);
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    return undefined;
  }

  /**
   * Sets domain in cache
   */
  set(company: string, domain: string | null): void {
    const key = this.normalizeKey(company);
    this.cache.set(key, domain);
    this.pending.delete(key);
  }

  /**
   * Gets or fetches domain with deduplication of in-flight requests
   */
  async getOrFetch(
    company: string,
    fetcher: () => Promise<string | null>
  ): Promise<string | null> {
    const key = this.normalizeKey(company);

    // Return cached value
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Return pending request if one exists
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Start new fetch
    const fetchPromise = fetcher().then(domain => {
      this.cache.set(key, domain);
      this.pending.delete(key);
      return domain;
    }).catch(error => {
      this.pending.delete(key);
      throw error;
    });

    this.pending.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Returns cache statistics
   */
  getStats(): { cacheSize: number; pendingCount: number } {
    return {
      cacheSize: this.cache.size,
      pendingCount: this.pending.size,
    };
  }

  /**
   * Clears the cache
   */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }
}
```

### 3. `backend/src/config/qps.config.ts`

Centralized QPS configuration.

```typescript
// backend/src/config/qps.config.ts

export const QPS_CONFIG = {
  // Target QPS for Serper API
  TARGET_QPS: 300,

  // Queue settings
  QUEUE_CONCURRENCY: 10, // Number of concurrent jobs

  // Batch processing settings
  BATCH_SIZE: 20, // Items to process in parallel per batch
  DELAY_BETWEEN_ITEMS_MS: 25, // Stagger within batch
  DELAY_BETWEEN_BATCHES_MS: 100, // Delay between batches

  // Rate limiting (for Phase 2 integration)
  RATE_LIMITER_ENABLED: false, // Will be enabled when Phase 2 is ready

  // Domain caching
  DOMAIN_CACHE_ENABLED: true,

  // Calculated values
  get EFFECTIVE_ITEMS_PER_SECOND() {
    // batch_size / (delay_between_items * batch_size + delay_between_batches)
    // With rate limiter, this is controlled externally
    return this.BATCH_SIZE / ((this.DELAY_BETWEEN_ITEMS_MS * this.BATCH_SIZE + this.DELAY_BETWEEN_BATCHES_MS) / 1000);
  },

  get EFFECTIVE_QPS_PER_JOB() {
    // ~2 API calls per item (LinkedIn + domain, minus cache hits)
    return this.EFFECTIVE_ITEMS_PER_SECOND * 1.5; // Assuming 50% domain cache hits
  },
} as const;
```

---

## Files to Modify

### 1. `backend/src/queues/scrape.queue.ts`

**Change:** Increase worker concurrency from 1 to 10.

**Current (line ~69):**
```typescript
const worker = new Worker<ScrapeEvent>(
  SCRAPE_QUEUE_NAME,
  async (job: Job<ScrapeEvent>) => {
    // ...
  },
  {
    connection: redisConnection,
    concurrency: 1,  // <-- CHANGE THIS
  }
);
```

**New:**
```typescript
import { QPS_CONFIG } from '../config/qps.config';

const worker = new Worker<ScrapeEvent>(
  SCRAPE_QUEUE_NAME,
  async (job: Job<ScrapeEvent>) => {
    // ...
  },
  {
    connection: redisConnection,
    concurrency: QPS_CONFIG.QUEUE_CONCURRENCY, // Now 10
  }
);
```

### 2. `backend/src/services/scrape.service.ts`

**Major refactor of `processScrapeJob` function.**

**Current pattern (simplified):**
```typescript
for (const item of items) {
  // Process one item
  const result = await serperClient.searchLinkedIn(query);
  if (linkedinUrl && inputData.company) {
    companyDomain = await serperClient.searchCompanyWebsite(inputData.company);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

**New pattern:**
```typescript
import { processBatch } from '../utils/batchProcessor';
import { DomainMemo } from '../utils/domainMemo';
import { QPS_CONFIG } from '../config/qps.config';

export async function processScrapeJob(jobId: string): Promise<void> {
  const job = await scrapeJobRepository.findById(jobId);
  if (!job) throw new Error('Job not found');

  await scrapeJobRepository.update(jobId, { status: 'processing' });
  await scrapeJobRepository.resetStuckItems(jobId);

  const items = await scrapeJobRepository.findPendingItems(jobId);
  if (items.length === 0) {
    await scrapeJobRepository.update(jobId, {
      status: 'completed',
      completedAt: new Date()
    });
    return;
  }

  // Initialize domain memo for this job
  const domainMemo = new DomainMemo();

  // Track used LinkedIn URLs for role-based deduplication
  const usedLinkedInUrls = new Set<string>();

  // Process items in batches
  await processBatch({
    items,
    batchSize: QPS_CONFIG.BATCH_SIZE,
    delayBetweenItems: QPS_CONFIG.DELAY_BETWEEN_ITEMS_MS,
    delayBetweenBatches: QPS_CONFIG.DELAY_BETWEEN_BATCHES_MS,

    processor: async (item) => {
      return processItem(item, job, domainMemo, usedLinkedInUrls);
    },

    onItemComplete: async (result, item, index) => {
      // Update progress periodically (every 10 items)
      if (index % 10 === 0) {
        await updateJobProgress(jobId);
      }
    },

    onBatchComplete: async (results, batchIndex) => {
      // Sync results to list periodically
      if (batchIndex % 3 === 0) { // Every 3 batches (60 items)
        await createOrUpdateResultList(jobId, job.organizationId, job.name);
      }
      logger.info(`Batch ${batchIndex + 1} complete`, {
        jobId,
        successCount: results.length,
        domainCacheStats: domainMemo.getStats()
      });
    },
  });

  // Final sync and completion
  await createOrUpdateResultList(jobId, job.organizationId, job.name);
  await scrapeJobRepository.update(jobId, {
    status: 'completed',
    completedAt: new Date(),
  });
}

async function processItem(
  item: ScrapeJobItem,
  job: ScrapeJob,
  domainMemo: DomainMemo,
  usedLinkedInUrls: Set<string>
): Promise<ProcessItemResult> {
  const inputData = item.inputData as Record<string, string>;

  try {
    await scrapeJobRepository.updateItem(item.id, { status: 'processing' });

    // Build and execute LinkedIn search
    const query = buildSearchQuery(job.inputType, inputData);
    const searchResponse = await serperClient.searchLinkedIn(query);

    // Extract LinkedIn URL (with deduplication for role-based)
    let linkedinUrl = extractLinkedInUrl(searchResponse, usedLinkedInUrls);

    if (linkedinUrl) {
      usedLinkedInUrls.add(normalizeLinkedInUrl(linkedinUrl));
    }

    // Get company domain with memoization
    let companyDomain: string | null = null;
    if (linkedinUrl && inputData.company && QPS_CONFIG.DOMAIN_CACHE_ENABLED) {
      companyDomain = await domainMemo.getOrFetch(
        inputData.company,
        () => serperClient.searchCompanyWebsite(inputData.company)
      );
    } else if (linkedinUrl && inputData.company) {
      companyDomain = await serperClient.searchCompanyWebsite(inputData.company);
    }

    // Update item with results
    await scrapeJobRepository.updateItem(item.id, {
      status: linkedinUrl ? 'completed' : 'no_result',
      linkedinUrl,
      companyDomain,
      serperResponse: searchResponse,
      processedAt: new Date(),
    });

    return { success: true, linkedinUrl, companyDomain };
  } catch (error) {
    await scrapeJobRepository.updateItem(item.id, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      processedAt: new Date(),
    });
    return { success: false, error };
  }
}
```

---

## Integration Points for Other Phases

### Rate Limiter Interface (Phase 2)

The `batchProcessor.ts` accepts an optional `rateLimiter` parameter implementing:

```typescript
interface RateLimiterInterface {
  acquire(tokens?: number): Promise<void>;
}
```

When Phase 2 is complete, update `qps.config.ts`:
```typescript
RATE_LIMITER_ENABLED: true,
```

And inject the rate limiter into `processBatch()` calls.

### Domain Cache Interface (Phase 3)

The `DomainMemo` class can be replaced with Redis-backed cache from Phase 3.
Create adapter interface:

```typescript
interface DomainCacheInterface {
  get(company: string): Promise<string | null | undefined>;
  set(company: string, domain: string | null): Promise<void>;
  getOrFetch(company: string, fetcher: () => Promise<string | null>): Promise<string | null>;
}
```

---

## Testing Checklist

### Unit Tests
- [ ] `batchProcessor.ts` - processes batches correctly
- [ ] `batchProcessor.ts` - respects delays between items/batches
- [ ] `batchProcessor.ts` - handles errors in individual items
- [ ] `batchProcessor.ts` - calls callbacks correctly
- [ ] `domainMemo.ts` - caches values correctly
- [ ] `domainMemo.ts` - deduplicates in-flight requests
- [ ] `domainMemo.ts` - normalizes company names

### Integration Tests
- [ ] Multiple jobs can process simultaneously
- [ ] Domain memoization reduces API calls
- [ ] Progress updates are accurate
- [ ] Result list syncing works with batches

### Load Tests
- [ ] 10 concurrent jobs don't cause issues
- [ ] Memory usage is stable with large batches
- [ ] No race conditions in item updates

---

## Rollout Plan

1. **Deploy config first** - `qps.config.ts` with conservative values
2. **Deploy utilities** - `batchProcessor.ts`, `domainMemo.ts`
3. **Deploy service changes** - Updated `scrape.service.ts`
4. **Gradual concurrency increase:**
   - Day 1: `QUEUE_CONCURRENCY: 3`
   - Day 2: `QUEUE_CONCURRENCY: 5`
   - Day 3: `QUEUE_CONCURRENCY: 10`
5. **Monitor:**
   - Serper API error rates
   - Job completion times
   - Memory usage

---

## Expected Improvement

| Metric | Before | After |
|--------|--------|-------|
| Items/sec/job | 10 | 40-50 |
| Concurrent jobs | 1 | 10 |
| API calls/sec (theoretical) | 20 | 150-200 |
| Domain API calls saved | 0% | 30-50% |

**Note:** Actual QPS will be capped by Phase 2 rate limiter once integrated.
