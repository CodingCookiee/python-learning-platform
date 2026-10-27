// Puts a throwaway account at its hourly reading pace, and prints a lesson and a practice drill to open
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { LIMITS, distinctLimit } from "../lib/rate-limit";

async function main() {
  const email = process.argv[2]!;
  if (!email.endsWith("@example.invalid")) throw new Error("throwaway accounts only");
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  const lesson = await prisma.lesson.findFirstOrThrow({ where: { archivedAt: null }, orderBy: { order: "asc" }, select: { id: true } });
  for (let i = 0; i < LIMITS.contentRead.limit; i++) await distinctLimit("contentRead", user.id, `filler:${i}`);
  console.log(JSON.stringify({ lesson: lesson.id }));
}
main().finally(() => prisma.$disconnect());
