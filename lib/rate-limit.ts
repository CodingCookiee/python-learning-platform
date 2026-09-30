import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { env, isRedisConfigured } from "@/lib/env";

/**
 * Fixed-window rate limits. With Upstash configured the counters live in Redis and
 * hold across serverless instances; without it, an in-memory map keeps a single
 * process honest (fine in development, per-instance only in production).
 */

export interface LimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets */
  retryAfter: number;
}

/** The limits in one place, so they're easy to tune */
export const LIMITS = {
  signIn: { limit: 10, windowSec: 15 * 60 },
  register: { limit: 5, windowSec: 60 * 60 },
  emailSend: { limit: 3, windowSec: 60 * 60 },
  passwordChange: { limit: 5, windowSec: 15 * 60 },
  submit: { limit: 60, windowSec: 60 },
  tutor: { limit: 12, windowSec: 60 },
  checkpointStart: { limit: 10, windowSec: 60 * 60 },
  labVerify: { limit: 30, windowSec: 60 * 60 },
  projectSubmit: { limit: 10, windowSec: 60 * 60 },
  aiReview: { limit: 6, windowSec: 60 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

let client: Redis | null | undefined;
function redis(): Redis | null {
  if (client === undefined) {
    client = isRedisConfigured()
      ? new Redis({ url: env().UPSTASH_REDIS_REST_URL!, token: env().UPSTASH_REDIS_REST_TOKEN! })
      : null;
  }
  return client;
}

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, windowSec: number): { count: number; ttl: number } {
  const now = Date.now();
  let entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowSec * 1000 };
    memory.set(key, entry);
    // Keep the map from growing without bound
    if (memory.size > 10_000) for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }
  entry.count++;
  return { count: entry.count, ttl: Math.ceil((entry.resetAt - now) / 1000) };
}

/** Count one hit against `name` for `subject` (a user id, email or IP). */
export async function rateLimit(name: LimitName, subject: string): Promise<LimitResult> {
  const { limit, windowSec } = LIMITS[name];
  const window = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rl:${name}:${subject}:${window}`;
  let count: number;
  let ttl: number;
  const r = redis();
  if (r) {
    try {
      count = await r.incr(key);
      if (count === 1) await r.expire(key, windowSec);
      ttl = windowSec - (Math.floor(Date.now() / 1000) % windowSec);
    } catch (e) {
      // A Redis outage shouldn't lock everyone out; fall back to this process's counts
      console.warn("[rate-limit] Redis unavailable, using memory:", (e as Error).message);
      ({ count, ttl } = memoryHit(key, windowSec));
    }
  } else {
    ({ count, ttl } = memoryHit(key, windowSec));
  }
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: ttl };
}

export function tooManyRequests(result: LimitResult, message = "Too many requests. Try again shortly."): NextResponse {
  const minutes = Math.ceil(result.retryAfter / 60);
  return NextResponse.json(
    { error: `${message} You can try again in ${minutes <= 1 ? "a minute" : `${minutes} minutes`}.` },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}

/** The caller's IP, as far as the proxy chain tells us */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
