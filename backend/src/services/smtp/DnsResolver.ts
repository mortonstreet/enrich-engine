import dns from 'dns';
import { promisify } from 'util';
import { getRedis } from '@/lib/redis';
import logger from '@/lib/logger';
import type { MxRecord } from '@shared/types/src';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

// ============================================
// DNS Resolver with Redis Caching
// ============================================

const MX_CACHE_TTL = 86400; // 24 hours in seconds
const MX_CACHE_PREFIX = 'mx_cache:';
const NEGATIVE_CACHE_TTL = 3600; // 1 hour for failed lookups

interface CachedMxData {
  mxRecords: MxRecord[];
  timestamp: number;
  error?: string;
}

export async function getMxRecords(domain: string): Promise<MxRecord[]> {
  const cacheKey = `${MX_CACHE_PREFIX}${domain.toLowerCase()}`;

  try {
    // Check cache first
    const cached = await getRedis().get(cacheKey);
    if (cached) {
      const data: CachedMxData = JSON.parse(cached);

      // If cached error, throw it
      if (data.error) {
        throw new Error(data.error);
      }

      return data.mxRecords;
    }
  } catch (cacheError) {
    // If it's a cached error (not a Redis error), rethrow
    if (cacheError instanceof Error && cacheError.message !== 'ENOTFOUND') {
      logger.debug({ domain, error: cacheError }, 'MX cache miss or error');
    }
  }

  try {
    // Perform DNS lookup
    const records = await resolveMx(domain);

    // Sort by priority (lower is higher priority)
    const sortedRecords: MxRecord[] = records
      .sort((a, b) => a.priority - b.priority)
      .map(r => ({
        host: r.exchange,
        priority: r.priority,
      }));

    // Cache the result
    const cacheData: CachedMxData = {
      mxRecords: sortedRecords,
      timestamp: Date.now(),
    };

    await getRedis().setex(cacheKey, MX_CACHE_TTL, JSON.stringify(cacheData));

    logger.debug({ domain, records: sortedRecords.length }, 'MX records resolved');

    return sortedRecords;
  } catch (error: any) {
    // Cache negative result for shorter duration
    const cacheData: CachedMxData = {
      mxRecords: [],
      timestamp: Date.now(),
      error: error.code || error.message || 'DNS_ERROR',
    };

    await getRedis().setex(cacheKey, NEGATIVE_CACHE_TTL, JSON.stringify(cacheData));

    logger.warn({ domain, error: error.message }, 'MX lookup failed');
    throw error;
  }
}

export async function getPrimaryMxHost(domain: string): Promise<string | null> {
  try {
    const records = await getMxRecords(domain);
    return records[0]?.host || null;
  } catch {
    return null;
  }
}

export async function hasSPF(domain: string): Promise<boolean> {
  try {
    const txtRecords = await resolveTxt(domain);
    return txtRecords.some(record =>
      record.some(txt => txt.toLowerCase().startsWith('v=spf1'))
    );
  } catch {
    return false;
  }
}

export async function hasDMARC(domain: string): Promise<boolean> {
  try {
    const txtRecords = await resolveTxt(`_dmarc.${domain}`);
    return txtRecords.some(record =>
      record.some(txt => txt.toLowerCase().startsWith('v=dmarc1'))
    );
  } catch {
    return false;
  }
}

export async function invalidateMxCache(domain: string): Promise<void> {
  const cacheKey = `${MX_CACHE_PREFIX}${domain.toLowerCase()}`;
  await getRedis().del(cacheKey);
}

export async function getMxCacheStats(): Promise<{
  cachedDomains: number;
  oldestEntry: number | null;
}> {
  const redis = getRedis();
  const keys = await redis.keys(`${MX_CACHE_PREFIX}*`);

  let oldestEntry: number | null = null;

  for (const key of keys.slice(0, 100)) { // Sample first 100
    const data = await redis.get(key);
    if (data) {
      const parsed: CachedMxData = JSON.parse(data);
      if (!oldestEntry || parsed.timestamp < oldestEntry) {
        oldestEntry = parsed.timestamp;
      }
    }
  }

  return {
    cachedDomains: keys.length,
    oldestEntry,
  };
}
