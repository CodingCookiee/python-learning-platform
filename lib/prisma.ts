import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClass: typeof PrismaClient | undefined;
  pool: Pool | undefined;
};

if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    keepAlive: true,
    ...(process.env.NODE_ENV !== "production" && {
      idleTimeoutMillis: 4 * 60_000,
      allowExitOnIdle: true,
    }),
  });
  globalForPrisma.pool.on("error", (error) => {
    console.warn("[db] An idle connection was closed:", error.message);
  });
}

const pool = globalForPrisma.pool;
const adapter = new PrismaPg(pool);

const cached = globalForPrisma.prismaClass === PrismaClient ? globalForPrisma.prisma : undefined;

export const prisma = cached ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClass = PrismaClient;
}
