/**
 * Test data for the end-to-end suite, run with tsx (the fixtures call it; the generated Prisma
 * client is ESM, which Playwright's own loader doesn't run). Throwaway accounts only, always on
 * @example.invalid, deleted by the fixture after each test.
 *
 *   npx tsx tests/e2e/support/seed.ts learner <email> <developer|black-belt>
 *   npx tsx tests/e2e/support/seed.ts module-id <order>      a Python module's id
 *   npx tsx tests/e2e/support/seed.ts delete <email>...
 *
 * Prints one line of JSON.
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { BLACK_BELT } from "@/lib/black-belt";
import { REVIEW_MAX_STAGE } from "@/lib/mastery-rules";
import { E2E_PASSWORD } from "./constants";

/** An onboarded working developer who has passed one drill: the dashboard suggests testing out */
async function developer(email: string) {
  const fix = await prisma.exercise.findFirstOrThrow({ where: { type: "fix", archivedAt: null }, select: { id: true } });
  return prisma.user.create({
    data: {
      email,
      name: "Grace Tester",
      password: await hash(E2E_PASSWORD, 12),
      emailVerified: new Date(),
      ageConfirmedAt: new Date(),
      onboardedAt: new Date(),
      experience: "python",
      goal: "python",
      weeklyHours: 5,
      exerciseSubmissions: { create: { exerciseId: fix.id, code: "", passed: true, testResults: "[]" } },
      streak: { create: { currentStreak: 0, longestStreak: 0, lastActivityDate: new Date() } },
    },
    select: { id: true },
  });
}

/**
 * The black belt by its real rule (lib/black-belt.ts), so the Python certificate goes through the
 * eligibility check: every Python grading passed, every advanced drill solved and held through the
 * last review stage, and three Python capstones approved
 */
async function blackBelt(email: string) {
  const user = await developer(email);
  const modules = await prisma.module.findMany({
    where: { archivedAt: null, track: { slug: "python" } },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  await prisma.checkpointAttempt.createMany({
    data: modules.map((m) => ({ userId: user.id, moduleId: m.id, exerciseIds: [], passedIds: [], placement: true, score: 1, passed: true, submittedAt: new Date() })),
  });
  const advanced = modules.filter((m) => m.order >= BLACK_BELT.advancedModules.from && m.order <= BLACK_BELT.advancedModules.to);
  const drills = await prisma.exercise.findMany({
    where: { archivedAt: null, lesson: { archivedAt: null, moduleId: { in: advanced.map((m) => m.id) } } },
    select: { id: true },
  });
  await prisma.exerciseSubmission.createMany({
    data: drills.map((d) => ({ userId: user.id, exerciseId: d.id, code: "", passed: true, testResults: "[]" })),
  });
  await prisma.reviewItem.createMany({
    data: drills.map((d) => ({ userId: user.id, exerciseId: d.id, stage: REVIEW_MAX_STAGE, reviews: REVIEW_MAX_STAGE, dueAt: new Date(Date.now() + 90 * 86_400_000) })),
  });
  const capstones = await prisma.project.findMany({
    where: { archivedAt: null, module: { track: { slug: "python" } } },
    orderBy: { module: { order: "asc" } },
    take: BLACK_BELT.capstonesNeeded,
    select: { id: true },
  });
  await prisma.projectSubmission.createMany({
    data: capstones.map((p) => ({ userId: user.id, projectId: p.id, files: "[]", status: "approved", evaluatedAt: new Date() })),
  });
  return user;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  let out: unknown;
  if (command === "learner") {
    const [email, kind] = args;
    if (!email?.endsWith("@example.invalid")) throw new Error("Test accounts must be @example.invalid");
    out = kind === "black-belt" ? await blackBelt(email) : await developer(email);
  } else if (command === "module-id") {
    out = await prisma.module.findFirstOrThrow({
      where: { order: Number(args[0]), archivedAt: null, track: { slug: "python" } },
      select: { id: true, title: true },
    });
  } else if (command === "delete") {
    const emails = args.filter((e) => e.endsWith("@example.invalid"));
    out = await prisma.user.deleteMany({ where: { email: { in: emails } } });
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
  console.log(JSON.stringify(out));
  await prisma.$disconnect();
  process.exit(0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
