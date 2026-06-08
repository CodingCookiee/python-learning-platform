import { Redis } from "@upstash/redis";

/**
 * Redis client for caching
 * Uses Upstash Redis for Vercel deployment
 */

// Create Redis client using REST API (works with Vercel serverless)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

/**
 * Cache utility functions
 */

export const cache = {
  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data as T | null;
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  },

  /**
   * Set data in cache with optional TTL (in seconds)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await redis.setex(key, ttl, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error("Redis SET error:", error);
      return false;
    }
  },

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error("Redis DELETE error:", error);
      return false;
    }
  },

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<boolean> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error("Redis DELETE PATTERN error:", error);
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis EXISTS error:", error);
      return false;
    }
  },

  /**
   * Set expiration time on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error("Redis EXPIRE error:", error);
      return false;
    }
  },
};

/**
 * Cache key generators for consistent naming
 */
export const cacheKeys = {
  // Content caching
  module: (id: string) => `module:${id}`,
  modules: () => "modules:all",
  lesson: (id: string) => `lesson:${id}`,
  lessons: (moduleId: string) => `lessons:module:${moduleId}`,
  exercise: (id: string) => `exercise:${id}`,

  // User progress caching
  userProgress: (userId: string) => `progress:user:${userId}`,
  userStreak: (userId: string) => `streak:user:${userId}`,
  userAchievements: (userId: string) => `achievements:user:${userId}`,

  // Session caching
  session: (sessionId: string) => `session:${sessionId}`,
};

/**
 * Cache TTL constants (in seconds)
 */
export const cacheTTL = {
  SHORT: 60 * 5, // 5 minutes
  MEDIUM: 60 * 30, // 30 minutes
  LONG: 60 * 60, // 1 hour
  DAY: 60 * 60 * 24, // 24 hours
  WEEK: 60 * 60 * 24 * 7, // 7 days
};
