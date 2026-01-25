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
