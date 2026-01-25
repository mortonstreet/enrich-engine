// backend/src/lib/cache/index.ts

import { DomainCache } from './domainCache';
import { getRedis } from '../redis';

export { DomainCache, type DomainCacheStats } from './domainCache';

let domainCacheInstance: DomainCache | null = null;

/**
 * Gets or creates the domain cache singleton
 */
export function getDomainCache(): DomainCache | null {
  if (domainCacheInstance) {
    return domainCacheInstance;
  }

  try {
    const redis = getRedis();
    if (!redis) {
      console.warn('Redis not available - domain caching disabled');
      return null;
    }

    domainCacheInstance = new DomainCache({
      redis,
      keyPrefix: 'domain_cache',
      ttlSeconds: 60 * 60 * 24 * 7, // 7 days
    });

    return domainCacheInstance;
  } catch (error) {
    console.warn('Failed to initialize domain cache:', error);
    return null;
  }
}

/**
 * Resets the cache singleton (for testing)
 */
export function resetDomainCache(): void {
  domainCacheInstance = null;
}
