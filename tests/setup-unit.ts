// Unit and Python tests: no .env, no database, no network. Just enough env for lib/env.ts.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/unused";
process.env.AUTH_SECRET ??= "unit-test-secret-that-is-at-least-32-characters";
process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.GMAIL_USER;
delete process.env.GMAIL_APP_PASSWORD;
delete process.env.RESEND_API_KEY;

// The pg pool lib/prisma.ts creates on import would keep the process alive
import { afterAll } from "vitest";
afterAll(async () => {
  const g = globalThis as { prisma?: { $disconnect(): Promise<void> }; pool?: { end(): Promise<void> } };
  await g.prisma?.$disconnect();
  await g.pool?.end().catch(() => {});
});
