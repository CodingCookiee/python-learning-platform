// Write %TEMP%/review-ids.json for capture-app.mjs: the receipt-printer and job-tracker capstones,
// and whether the design-review account exists.  npx tsx .impeccable/review-ids.ts
import "dotenv/config";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "design-review@pylearn.local" }, select: { id: true } });
  const project = await prisma.project.findFirstOrThrow({ where: { slug: "receipt-printer" }, select: { id: true } });
  const jobTracker = await prisma.project.findFirstOrThrow({ where: { slug: "job-tracker" }, select: { id: true } });
  const ids = { project: project.id, jobTracker: jobTracker.id };
  writeFileSync(path.join(process.env.TEMP ?? ".", "review-ids.json"), JSON.stringify(ids));
  console.log("review account:", user ? "exists" : "MISSING", ids);
  await prisma.$disconnect();
}
void main();
