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
    const successfulResults: R[] = [];
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      }
    }

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
