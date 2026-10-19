import { z } from "zod";

/**
 * Server-side environment, validated once on first access.
 * See .env.example and docs/ARCHITECTURE.md §11 for what each variable does.
 */

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),

  ADMIN_BOOTSTRAP_EMAIL: optional,

  AUTH_GITHUB_ID: optional,
  AUTH_GITHUB_SECRET: optional,
  AUTH_GOOGLE_ID: optional,
  AUTH_GOOGLE_SECRET: optional,

  UPSTASH_REDIS_REST_URL: optional,
  UPSTASH_REDIS_REST_TOKEN: optional,

  GMAIL_USER: optional,
  GMAIL_APP_PASSWORD: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  CONTACT_EMAIL: optional,

  GRADING_MODE: z.enum(["client", "server"]).default("client"),
  ENCRYPTION_KEY: optional,
  LAB_SIGNING_SECRET: optional,
  // Raises GitHub's API limit for confirming learners' Actions runs (lib/ci/github.ts)
  GITHUB_TOKEN: optional,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}\nSee .env.example.`);
  }

  cached = parsed.data;
  return cached;
}

/**
 * Production settings that are missing or unsafe, checked once at startup (instrumentation.ts).
 * `fatal` stops the server; `missing` is logged, so a deploy without them is easy to spot.
 */
export function productionProblems(e: ServerEnv = env()): { fatal: string[]; missing: string[] } {
  const fatal: string[] = [];
  const missing: string[] = [];
  if (e.NODE_ENV !== "production") return { fatal, missing };
  // Server grading runs learner code inside this process until the execution sandbox exists (C-2)
  if (e.GRADING_MODE === "server") fatal.push("GRADING_MODE=server isn't safe yet: keep it on client (security report C-2).");
  if (!(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN))
    missing.push("UPSTASH_REDIS_REST_URL/TOKEN: rate limits only hold per instance without them.");
  if (!e.RESEND_API_KEY && !(e.GMAIL_USER && e.GMAIL_APP_PASSWORD))
    missing.push("RESEND_API_KEY or GMAIL_USER/GMAIL_APP_PASSWORD: without email, sign-ups aren't verified and password reset is off.");
  if (!e.ENCRYPTION_KEY) missing.push("ENCRYPTION_KEY: learners can't save their AI keys.");
  if (!e.CONTACT_EMAIL) missing.push("CONTACT_EMAIL: the Contact and Privacy pages have no address.");
  if (!e.ADMIN_BOOTSTRAP_EMAIL) missing.push("ADMIN_BOOTSTRAP_EMAIL: no account can become the first admin.");
  return { fatal, missing };
}

export function isRedisConfigured(): boolean {
  const e = env();
  return Boolean(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN);
}
