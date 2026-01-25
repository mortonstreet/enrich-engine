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
        const index = this.waitQueue.findIndex((w) => w.resolve === resolve);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
        }
        reject(new Error("Rate limiter timeout"));
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
