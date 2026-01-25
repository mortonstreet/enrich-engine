// backend/src/utils/domainMemo.ts

export class DomainMemo {
  private cache: Map<string, string | null> = new Map();
  private pending: Map<string, Promise<string | null>> = new Map();

  /**
   * Normalizes company name for consistent cache keys
   */
  private normalizeKey(company: string): string {
    return company.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Gets cached domain or returns undefined if not cached
   */
  get(company: string): string | null | undefined {
    const key = this.normalizeKey(company);
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    return undefined;
  }

  /**
   * Sets domain in cache
   */
  set(company: string, domain: string | null): void {
    const key = this.normalizeKey(company);
    this.cache.set(key, domain);
    this.pending.delete(key);
  }

  /**
   * Gets or fetches domain with deduplication of in-flight requests
   */
  async getOrFetch(
    company: string,
    fetcher: () => Promise<string | null>
  ): Promise<string | null> {
    const key = this.normalizeKey(company);

    // Return cached value
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Return pending request if one exists
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Start new fetch
    const fetchPromise = fetcher().then(domain => {
      this.cache.set(key, domain);
      this.pending.delete(key);
      return domain;
    }).catch(error => {
      this.pending.delete(key);
      throw error;
    });

    this.pending.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Returns cache statistics
   */
  getStats(): { cacheSize: number; pendingCount: number } {
    return {
      cacheSize: this.cache.size,
      pendingCount: this.pending.size,
    };
  }

  /**
   * Clears the cache
   */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }
}
