import { Redis } from "ioredis";

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
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }

    throw new Error("Rate limiter: max attempts exceeded");
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
    await this.redis.zremrangebyscore(key, "-inf", windowStart);
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
