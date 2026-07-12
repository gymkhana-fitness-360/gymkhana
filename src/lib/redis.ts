/**
 * Redis Cache Client
 * 
 * Simple in-memory cache fallback when Redis is not available.
 * For production, replace with actual Redis client (ioredis or @upstash/redis).
 */

import { createLogger } from "./logger";

const logger = createLogger("redis-cache");

interface CacheEntry {
  value: string;
  expiresAt: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /** Stops the periodic cleanup timer (e.g. on process shutdown or tests). */
  dispose(): void {
    clearInterval(this.cleanupInterval);
  }

  private cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug("Cache cleanup completed", { cleaned, remaining: this.cache.size });
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    logger.debug("Cache hit", { key });
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.cache.set(key, {
      value,
      expiresAt,
    });

    logger.debug("Cache set", { key, ttl: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    logger.debug("Cache delete", { key });
  }

  async clear(): Promise<void> {
    this.cache.clear();
    logger.info("Cache cleared");
  }

  getStats() {
    return {
      size: this.cache.size,
      type: "in-memory",
    };
  }
}

// Singleton instance
let cacheInstance: InMemoryCache | null = null;
let exitHookRegistered = false;

export function disposeCache(): void {
  if (cacheInstance) {
    cacheInstance.dispose();
    cacheInstance = null;
    logger.debug("Cache disposed");
  }
}

export function getCache(): InMemoryCache {
  if (!cacheInstance) {
    cacheInstance = new InMemoryCache();
    logger.info("Cache initialized", { type: "in-memory" });
    if (typeof process !== "undefined" && !exitHookRegistered) {
      exitHookRegistered = true;
      process.once("beforeExit", () => {
        disposeCache();
      });
    }
  }

  return cacheInstance;
}

/**
 * Cache helper for API responses
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cache = getCache();

  // Try to get from cache
  const cached = await cache.get(key);
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch (e) {
      logger.warn("Failed to parse cached value", { key, error: String(e) });
    }
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  try {
    await cache.set(key, JSON.stringify(data), ttlSeconds);
  } catch (e) {
    logger.error("Failed to cache data", e as Error, { key });
  }

  return data;
}

export const redis = getCache();
