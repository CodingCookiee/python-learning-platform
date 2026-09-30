import "dotenv/config";
import { writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";
import { ensureLabRun, webhookUrl } from "../lib/labs";

// A learner with every Python module passed (by placement), so automation lessons and their labs are open
const EMAIL = "m4-labs@example.invalid";

async function main() {
  if (process.argv[2] === "cleanup") {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    console.log("cleaned");
    return;
  }
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Lab Tester",
      password: await hash("LabTester!2026", 12),
      emailVerified: new Date(),
      onboardedAt: new Date(),
      experience: "python",
      goal: "automation",
      weeklyHours: 10,
    },
  });
  const python = await prisma.module.findMany({ where: { archivedAt: null, track: { slug: "python" } }, select: { id: true } });
  await prisma.checkpointAttempt.createMany({
    data: python.map((m) => ({ userId: user.id, moduleId: m.id, exerciseIds: [], passedIds: [], placement: true, score: 1, passed: true, submittedAt: new Date() })),
  });
  const lessons = await prisma.lesson.findMany({
    where: { slug: { in: ["webhooks", "code-quality-tools"] } },
    select: { id: true, slug: true },
  });
  const ids = Object.fromEntries(lessons.map((l) => [l.slug, l.id]));
  const run = await ensureLabRun(user.id, ids.webhooks!);
  writeFileSync(process.env.TEMP + "/m4-labs.json", JSON.stringify({ ...ids, hook: webhookUrl(run.token) }));
  console.log("SETUP OK", python.length, "python modules passed");
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
