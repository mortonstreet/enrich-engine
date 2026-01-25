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
