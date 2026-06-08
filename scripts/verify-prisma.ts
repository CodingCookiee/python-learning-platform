import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyConnection() {
  try {
    console.log("🔍 Testing Prisma database connection...");
    console.log("Using DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 40) + "...");

    // Test connection with a simple query
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Try to query the User table (should exist from schema)
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible (${userCount} users)`);

    // Check all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log("✅ Database tables:");
    console.log(tables);

    await prisma.$disconnect();
    await pool.end();
    console.log("\n✅ All checks passed! Prisma is ready to use.");
  } catch (error) {
    console.error("❌ Connection failed:", error);
    await pool.end();
    process.exit(1);
  }
}

verifyConnection();
