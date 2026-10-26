import { describe, expect, it } from "vitest";
import { productionProblems, type ServerEnv } from "@/lib/env";

const base: ServerEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://example",
  AUTH_SECRET: "x".repeat(32),
  ADMIN_BOOTSTRAP_EMAIL: "owner@example.invalid",
  AUTH_GITHUB_ID: undefined,
  AUTH_GITHUB_SECRET: undefined,
  AUTH_GOOGLE_ID: undefined,
  AUTH_GOOGLE_SECRET: undefined,
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  UPSTASH_REDIS_REST_TOKEN: "token",
  GMAIL_USER: undefined,
  GMAIL_APP_PASSWORD: undefined,
  RESEND_API_KEY: "re_example",
  EMAIL_FROM: "pylearn <hello@example.invalid>",
  CONTACT_EMAIL: "hello@example.invalid",
  GRADING_MODE: "client",
  ENCRYPTION_KEY: "k".repeat(44),
  GITHUB_TOKEN: undefined,
};

describe("the production startup check", () => {
  it("passes a complete, safe setup", () => {
    expect(productionProblems(base)).toEqual({ fatal: [], missing: [] });
  });

  it("refuses server grading until the sandbox exists", () => {
    expect(productionProblems({ ...base, GRADING_MODE: "server" }).fatal).toHaveLength(1);
  });

  it("names each missing launch setting", () => {
    const { missing } = productionProblems({ ...base, UPSTASH_REDIS_REST_URL: undefined, RESEND_API_KEY: undefined, ENCRYPTION_KEY: undefined });
    expect(missing.map((m) => m.split(":")[0])).toEqual([
      "UPSTASH_REDIS_REST_URL/TOKEN",
      "RESEND_API_KEY or GMAIL_USER/GMAIL_APP_PASSWORD",
      "ENCRYPTION_KEY",
    ]);
  });

  it("stays quiet outside production", () => {
    expect(productionProblems({ ...base, NODE_ENV: "development", GRADING_MODE: "server", UPSTASH_REDIS_REST_URL: undefined })).toEqual({ fatal: [], missing: [] });
  });
});
