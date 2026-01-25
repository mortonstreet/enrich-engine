import { Redis } from "ioredis";
import { TokenBucket } from "./tokenBucket";
import { RedisRateLimiter } from "./redisRateLimiter";

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
export function createRateLimiter(
  options: RateLimiterFactoryOptions
): RateLimiterInterface {
  const {
    targetQps,
    redis,
    keyPrefix = "rate_limiter",
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
  process.on("beforeExit", () => clearInterval(intervalId));

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
