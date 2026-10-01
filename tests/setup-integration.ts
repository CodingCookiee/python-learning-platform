// Integration tests: the real database from DATABASE_URL (.env locally, the Postgres service in CI).
// Email, Redis and outside APIs stay off; tests that need GitHub or a model mock fetch.
import "dotenv/config";

process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.GMAIL_USER;
delete process.env.GMAIL_APP_PASSWORD;
delete process.env.RESEND_API_KEY;
if (!process.env.DATABASE_URL) throw new Error("Integration tests need DATABASE_URL (a database with migrations applied and content synced)");

// The pg pool lib/prisma.ts creates on import would keep the process alive
import { afterAll } from "vitest";
afterAll(async () => {
  const g = globalThis as { prisma?: { $disconnect(): Promise<void> }; pool?: { end(): Promise<void> } };
  await g.prisma?.$disconnect();
  await g.pool?.end().catch(() => {});
});
