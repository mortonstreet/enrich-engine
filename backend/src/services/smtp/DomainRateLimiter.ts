import { getRedis } from '@/lib/redis';
import logger from '@/lib/logger';
import { DEFAULT_RATE_LIMITS, type DomainRateLimitConfig } from '@shared/types/src';

// ============================================
// Domain-Specific Rate Limiter
// ============================================

const RATE_LIMIT_PREFIX = 'smtp_rate:';

// Extended rate limits for known email providers
const PROVIDER_RATE_LIMITS: Record<string, DomainRateLimitConfig> = {
  ...DEFAULT_RATE_LIMITS,
  // Google
  'gmail.com': { domain: 'gmail.com', maxConcurrent: 2, delayMs: 1000, maxPerMinute: 3 },
  'googlemail.com': { domain: 'googlemail.com', maxConcurrent: 2, delayMs: 1000, maxPerMinute: 3 },
  // Microsoft
  'outlook.com': { domain: 'outlook.com', maxConcurrent: 3, delayMs: 500, maxPerMinute: 8 },
  'hotmail.com': { domain: 'hotmail.com', maxConcurrent: 3, delayMs: 500, maxPerMinute: 8 },
  'live.com': { domain: 'live.com', maxConcurrent: 3, delayMs: 500, maxPerMinute: 8 },
  // Yahoo
  'yahoo.com': { domain: 'yahoo.com', maxConcurrent: 3, delayMs: 400, maxPerMinute: 10 },
  'yahoo.co.uk': { domain: 'yahoo.co.uk', maxConcurrent: 3, delayMs: 400, maxPerMinute: 10 },
  // Apple
  'icloud.com': { domain: 'icloud.com', maxConcurrent: 2, delayMs: 600, maxPerMinute: 5 },
  'me.com': { domain: 'me.com', maxConcurrent: 2, delayMs: 600, maxPerMinute: 5 },
  // Proton
  'protonmail.com': { domain: 'protonmail.com', maxConcurrent: 2, delayMs: 500, maxPerMinute: 6 },
  'proton.me': { domain: 'proton.me', maxConcurrent: 2, delayMs: 500, maxPerMinute: 6 },
};

export function getRateLimitConfig(domain: string): DomainRateLimitConfig {
  const lowerDomain = domain.toLowerCase();
  return PROVIDER_RATE_LIMITS[lowerDomain] || PROVIDER_RATE_LIMITS['default'];
}

export async function acquireSlot(domain: string): Promise<boolean> {
  const config = getRateLimitConfig(domain);
  const key = `${RATE_LIMIT_PREFIX}${domain.toLowerCase()}`;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  const redis = getRedis();

  try {
    // Use transaction for atomicity
    const pipeline = redis.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Get concurrent count (entries within last 2 seconds - approximating concurrent)
    pipeline.zcount(key, now - 2000, '+inf');

    const results = await pipeline.exec();

    const requestsInWindow = (results?.[1]?.[1] as number) || 0;
    const concurrentCount = (results?.[2]?.[1] as number) || 0;

    // Check both rate limits
    if (requestsInWindow >= config.maxPerMinute) {
      logger.debug({ domain, requestsInWindow, limit: config.maxPerMinute }, 'Rate limit: max per minute exceeded');
      return false;
    }

    if (concurrentCount >= config.maxConcurrent) {
      logger.debug({ domain, concurrentCount, limit: config.maxConcurrent }, 'Rate limit: max concurrent exceeded');
      return false;
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random().toString(36)}`);
    await redis.expire(key, 120); // 2 minute TTL

    return true;
  } catch (error) {
    logger.error({ domain, error }, 'Rate limiter error - allowing request');
    return true; // Fail open
  }
}

export async function waitForSlot(domain: string, maxWaitMs: number = 30000): Promise<boolean> {
  const config = getRateLimitConfig(domain);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await acquireSlot(domain)) {
      return true;
    }

    // Wait before retrying
    await sleep(config.delayMs);
  }

  logger.warn({ domain, waitedMs: Date.now() - startTime }, 'Timed out waiting for rate limit slot');
  return false;
}

export async function releaseSlot(domain: string): Promise<void> {
  // Slots auto-release based on time, but we can mark completion
  // This is useful for tracking concurrent connections more accurately
  const key = `${RATE_LIMIT_PREFIX}concurrent:${domain.toLowerCase()}`;

  try {
    await getRedis().decr(key);
  } catch (error) {
    logger.error({ domain, error }, 'Error releasing slot');
  }
}

export function getDelayForDomain(domain: string): number {
  const config = getRateLimitConfig(domain);
  return config.delayMs;
}

export async function getRateLimitStats(domain: string): Promise<{
  requestsInWindow: number;
  maxPerMinute: number;
  delayMs: number;
}> {
  const config = getRateLimitConfig(domain);
  const key = `${RATE_LIMIT_PREFIX}${domain.toLowerCase()}`;
  const now = Date.now();
  const windowStart = now - 60000;

  const requestsInWindow = await getRedis().zcount(key, windowStart, '+inf');

  return {
    requestsInWindow,
    maxPerMinute: config.maxPerMinute,
    delayMs: config.delayMs,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
