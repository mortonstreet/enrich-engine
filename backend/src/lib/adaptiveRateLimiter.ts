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
