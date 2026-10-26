import { redis } from "./redis";

/**
 * Cache utility functions with Redis
 */

const DEFAULT_TTL = 3600; // 1 hour in seconds

export async function getCached<T>(
  key: string,
  fallback: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  try {
    // Try to get from cache
    // Use redis.get<string> because we store serialized JSON strings via setex
    const cached = await redis.get<string>(key);

    if (cached) {
      return JSON.parse(cached) as T;
    }

    // Cache miss - fetch from source
    const data = await fallback();

    // Store in cache
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error("Cache error:", error);
    // If Redis fails, just return the data without caching
    return fallback();
  }
}

/**
 * Drop one cached key. Exact keys only: a wildcard would need KEYS, which scans the whole keyspace on
 * every call and slows down as the cache grows, so per-learner data is either cached under exact keys
 * or not cached at all.
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

/**
 * The cached values: each is read by one place (named here) and cleared by the writes that change it
 */
export const CacheKeys = {
  /** GET /api/modules */
  modules: (userId: string) => `modules:${userId}`,
  /** lib/project-detail.ts (the capstone page); everything that changes a submission must invalidate this */
  project: (projectId: string, userId: string) => `project:v6:${projectId}:${userId}`,
  /** lib/progress-summary.ts. v2: summaries cached before it held whole capstone submissions */
  userProgress: (userId: string) => `progress:v2:${userId}`,
};

/** Clear the learner's progress-dependent caches when their progress changes */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([invalidateCache(CacheKeys.modules(userId)), invalidateCache(CacheKeys.userProgress(userId))]);
}
