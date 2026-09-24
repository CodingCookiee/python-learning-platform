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

  GRADING_MODE: z.enum(["client", "server"]).default("client"),
  ENCRYPTION_KEY: optional,
  LAB_SIGNING_SECRET: optional,
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

export function isRedisConfigured(): boolean {
  const e = env();
  return Boolean(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN);
}

export function isBootstrapAdmin(email: string | null | undefined): boolean {
  const bootstrap = env().ADMIN_BOOTSTRAP_EMAIL;
  return Boolean(email && bootstrap && email.trim().toLowerCase() === bootstrap.toLowerCase());
}
