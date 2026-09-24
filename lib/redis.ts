import { Redis } from "@upstash/redis";
import { isRedisConfigured, env } from "@/lib/env";

/**
 * Redis client for caching (Upstash REST, works on Vercel serverless).
 *
 * When Upstash isn't configured, a no-op client is used instead so the app
 * keeps working without a cache rather than erroring on every call.
 */

type RedisLike = Pick<Redis, "get" | "set" | "setex" | "del" | "keys" | "exists" | "expire">;

const noopRedis: RedisLike = {
  get: (async () => null) as unknown as Redis["get"],
  set: (async () => "OK") as unknown as Redis["set"],
  setex: (async () => "OK") as unknown as Redis["setex"],
  del: (async () => 0) as unknown as Redis["del"],
  keys: (async () => []) as unknown as Redis["keys"],
  exists: (async () => 0) as unknown as Redis["exists"],
  expire: (async () => 0) as unknown as Redis["expire"],
};

function createRedis(): RedisLike {
  if (!isRedisConfigured()) {
    if (env().NODE_ENV !== "test") {
      console.warn("[redis] Upstash not configured; caching is disabled.");
    }
    return noopRedis;
  }
  return new Redis({
    url: env().UPSTASH_REDIS_REST_URL!,
    token: env().UPSTASH_REDIS_REST_TOKEN!,
  });
}

export const redis = createRedis();
