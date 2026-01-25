import {
  createRateLimiter,
  withMetrics,
  RateLimiterInterface,
} from "./rateLimiterFactory";
import { getRedis } from "@/lib/redis";
import { config } from "@/config";
import logger from "@/lib/logger";

let serperRateLimiter: RateLimiterInterface | null = null;

/**
 * Gets or creates the Serper rate limiter singleton
 */
export function getSerperRateLimiter(): RateLimiterInterface {
  if (serperRateLimiter) {
    return serperRateLimiter;
  }

  const targetQps = config.serper.targetQps;

  let redis;
  try {
    redis = getRedis();
  } catch (error) {
    logger.warn(
      { error },
      "Redis unavailable - rate limiting will use local token bucket"
    );
    redis = undefined;
  }

  const baseLimiter = createRateLimiter({
    targetQps,
    redis,
    keyPrefix: "serper_rate_limiter",
    burstMultiplier: 1.2, // Allow small bursts
  });

  serperRateLimiter = withMetrics(baseLimiter, {
    name: "Serper",
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
