// Database steps for the on-ramp run-through (.impeccable/onramp-e2e.mjs). Throwaway accounts only.
//   npx tsx .impeccable/onramp-e2e-db.ts prepare <email>   pass every on-ramp drill, finish lessons 1-5
//   npx tsx .impeccable/onramp-e2e-db.ts noage <email>     a verified, unonboarded account with no age on record
//   npx tsx .impeccable/onramp-e2e-db.ts cleanup <email>...
import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const [command, ...emails] = process.argv.slice(2);
  if (command === "prepare") {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: emails[0]! }, select: { id: true } });
    const lessons = await prisma.lesson.findMany({
      where: { archivedAt: null, module: { track: { slug: "start" } } },
      orderBy: { order: "asc" },
      select: { id: true, exercises: { where: { archivedAt: null }, select: { id: true } } },
    });
    await prisma.exerciseSubmission.createMany({
      data: lessons.flatMap((l) => l.exercises.map((e) => ({ userId: user.id, exerciseId: e.id, code: "", passed: true, testResults: "[]" }))),
    });
    await prisma.progress.createMany({
      data: lessons.slice(0, 5).map((l) => ({ userId: user.id, lessonId: l.id, completed: true, completedAt: new Date() })),
    });
    const python1 = await prisma.module.findFirstOrThrow({ where: { track: { slug: "python" }, order: 1 }, select: { id: true } });
    console.log(JSON.stringify({ lesson6: lessons[5]!.id, python1: python1.id }));
  } else if (command === "noage") {
    await prisma.user.create({
      data: { email: emails[0]!, name: "No Age", password: await hash("E2e-Onramp-2026", 12), emailVerified: new Date() },
    });
    console.log("created");
  } else if (command === "cleanup") {
    const { count } = await prisma.user.deleteMany({ where: { email: { in: emails } } });
    console.log(`deleted ${count}`);
  }
  await prisma.$disconnect();
}
void main();
