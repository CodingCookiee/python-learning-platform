import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  /** The client class the cached instance was built from */
  prismaClass: typeof PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create or reuse the pool
if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon suspends an idle database and closes its connections. Give up on a connect that hangs
    // (a cold start takes a few seconds, not minutes), and keep live connections from going stale
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  });
  // A connection that drops while idle in the pool emits "error" on the pool, which would crash the
  // process if nothing listened. The pool replaces it on the next query, so a log line is enough
  globalForPrisma.pool.on("error", (error) => {
    console.warn("[db] An idle connection was closed:", error.message);
  });
}

const pool = globalForPrisma.pool;
const adapter = new PrismaPg(pool);

// In dev the instance survives hot reloads. After `prisma generate` the reloaded module brings a new
// client class, so a cached instance from the old one (missing new models) is replaced, not reused
const cached = globalForPrisma.prismaClass === PrismaClient ? globalForPrisma.prisma : undefined;

export const prisma = cached ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClass = PrismaClient;
}
