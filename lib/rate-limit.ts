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
  // Across every account from one address: password spraying, not one forgetful learner
  signInIp: { limit: 40, windowSec: 15 * 60 },
  register: { limit: 5, windowSec: 60 * 60 },
  emailSend: { limit: 3, windowSec: 60 * 60 },
  // Following an emailed link, per IP: separate from sending, so learners behind one address can all confirm
  emailVerify: { limit: 30, windowSec: 60 * 60 },
  passwordChange: { limit: 5, windowSec: 15 * 60 },
  submit: { limit: 60, windowSec: 60 },
  tutor: { limit: 12, windowSec: 60 },
  sensei: { limit: 12, windowSec: 60 },
  checkpointStart: { limit: 10, windowSec: 60 * 60 },
  labVerify: { limit: 30, windowSec: 60 * 60 },
  projectSubmit: { limit: 10, windowSec: 60 * 60 },
  aiReview: { limit: 6, windowSec: 60 * 60 },
  // The examiner grades many learners' work, so more than one learner's own reviews
  examinerReview: { limit: 30, windowSec: 60 * 60 },
  draftSave: { limit: 120, windowSec: 60 * 60 },
  questEvent: { limit: 60, windowSec: 10 * 60 },
  // Claiming a certificate, fixing its printed name, withdrawing or restoring it
  certificateClaim: { limit: 20, windowSec: 60 * 60 },
  // Different lessons and practice drills opened, per account (lib/reading-pace.ts). A quick learner opens
  // a module's worth (about 40) in a long day; these are paces only a script copying the course reaches
  contentRead: { limit: 80, windowSec: 60 * 60 },
  contentReadDay: { limit: 250, windowSec: 24 * 60 * 60 },
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

/**
 * Whether `subject` has already used up `name`'s limit, without counting a hit. For limits that
 * count only failures: check this first, and call rateLimit() when an attempt fails.
 */
export async function limitReached(name: LimitName, subject: string): Promise<boolean> {
  const { limit, windowSec } = LIMITS[name];
  const key = `rl:${name}:${subject}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const r = redis();
  if (r) {
    try {
      return Number((await r.get<number>(key)) ?? 0) >= limit;
    } catch {
      // As in rateLimit: a Redis outage falls back to this process's counts
    }
  }
  const entry = memory.get(key);
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= limit);
}

const memorySets = new Map<string, { members: Set<string>; resetAt: number }>();

/**
 * Like rateLimit, but counts different `member`s in the window rather than hits: opening the same page
 * again is always allowed and counts once, so only new ones run into the limit.
 */
export async function distinctLimit(name: LimitName, subject: string, member: string): Promise<LimitResult> {
  const { limit, windowSec } = LIMITS[name];
  const key = `rl:${name}:${subject}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const retryAfter = windowSec - (Math.floor(Date.now() / 1000) % windowSec);
  const r = redis();
  if (r) {
    try {
      const [seen, size] = await r.pipeline().sismember(key, member).scard(key).exec<[number, number]>();
      if (seen) return { ok: true, remaining: Math.max(0, limit - size), retryAfter };
      if (size >= limit) return { ok: false, remaining: 0, retryAfter };
      await r.pipeline().sadd(key, member).expire(key, windowSec).exec();
      return { ok: true, remaining: limit - size - 1, retryAfter };
    } catch (e) {
      // As in rateLimit: a Redis outage falls back to this process's counts
      console.warn("[rate-limit] Redis unavailable, using memory:", (e as Error).message);
    }
  }
  const now = Date.now();
  let entry = memorySets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { members: new Set(), resetAt: now + windowSec * 1000 };
    memorySets.set(key, entry);
    if (memorySets.size > 10_000) for (const [k, v] of memorySets) if (v.resetAt <= now) memorySets.delete(k);
  }
  if (!entry.members.has(member)) {
    if (entry.members.size >= limit) return { ok: false, remaining: 0, retryAfter };
    entry.members.add(member);
  }
  return { ok: true, remaining: Math.max(0, limit - entry.members.size), retryAfter };
}

export function tooManyRequests(result: LimitResult, message = "Too many requests. Try again shortly."): NextResponse {
  const minutes = Math.ceil(result.retryAfter / 60);
  return NextResponse.json(
    { error: `${message} You can try again in ${minutes <= 1 ? "a minute" : `${minutes} minutes`}.` },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}

/**
 * The caller's IP. Vercel sets x-real-ip itself (a client can't choose it), so it comes first;
 * the first X-Forwarded-For entry is only a fallback for other hosts (security review M-1)
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return req.headers.get("x-real-ip")?.trim() || forwarded?.split(",")[0]?.trim() || "unknown";
}
