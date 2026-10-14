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
