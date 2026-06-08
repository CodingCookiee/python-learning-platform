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

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // For simple keys
    if (!pattern.includes("*")) {
      await redis.del(pattern);
      return;
    }

    // For pattern matching
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    // Use redis.get<string> because we store serialized JSON strings
    const cached = await redis.get<string>(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

/**
 * Generate cache keys
 */
export const CacheKeys = {
  modules: (userId: string) => `modules:${userId}`,
  module: (moduleId: string, userId: string) => `module:${moduleId}:${userId}`,
  lesson: (lessonId: string, userId: string) => `lesson:${lessonId}:${userId}`,
  exercise: (exerciseId: string, userId: string) => `exercise:${exerciseId}:${userId}`,
  userProgress: (userId: string) => `progress:${userId}`,
  moduleProgress: (moduleId: string, userId: string) => `progress:module:${moduleId}:${userId}`,
};

/**
 * Invalidate user-specific caches when progress changes
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    invalidateCache(CacheKeys.modules(userId)),
    invalidateCache(`module:*:${userId}`),
    invalidateCache(`lesson:*:${userId}`),
    invalidateCache(CacheKeys.userProgress(userId)),
    invalidateCache(`progress:module:*:${userId}`),
  ]);
}
