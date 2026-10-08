// Database steps for the quest run-through (.impeccable/quest-e2e.mjs). Throwaway accounts only.
//   npx tsx .impeccable/quest-e2e-db.ts drill <exerciseId>      a drill's type, main file and reference solution
//   npx tsx .impeccable/quest-e2e-db.ts drill-id <slug>             a drill's id
//   npx tsx .impeccable/quest-e2e-db.ts fresh <email> <name>      a verified 16+ account, not onboarded yet
//   npx tsx .impeccable/quest-e2e-db.ts existing <email>        an onboarded developer from before the quest, one fix drill passed
//   npx tsx .impeccable/quest-e2e-db.ts tutor <email>           an onboarded learner with a dummy AI key (the page's tutor shows; tests intercept /api/tutor, no provider is called)
//   npx tsx .impeccable/quest-e2e-db.ts quest <email>           the account's quest row
//   npx tsx .impeccable/quest-e2e-db.ts cleanup <email>...
import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { saveCredential } from "@/lib/ai/credentials";

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "drill") {
    const drill = await prisma.exercise.findUniqueOrThrow({
      where: { id: args[0]! },
      select: { slug: true, type: true, solution: true, mainFile: true, files: true },
    });
    console.log(JSON.stringify(drill));
  } else if (command === "drill-id") {
    console.log((await prisma.exercise.findFirstOrThrow({ where: { slug: args[0]!, archivedAt: null }, select: { id: true } })).id);
  } else if (command === "fresh") {
    // A verified 16+ account that hasn't onboarded: sign-up without the sign-up rate limit
    await prisma.user.create({
      data: {
        email: args[0]!,
        name: args[1] ?? "Quest Learner",
        password: await hash("E2e-Quest-2026", 12),
        emailVerified: new Date(),
        ageConfirmedAt: new Date(),
        streak: { create: { currentStreak: 0, longestStreak: 0, lastActivityDate: new Date() } },
      },
    });
    console.log("created");
  } else if (command === "existing") {
    const fix = await prisma.exercise.findFirstOrThrow({ where: { type: "fix", archivedAt: null }, select: { id: true } });
    await prisma.user.create({
      data: {
        email: args[0]!,
        name: "Existing Learner",
        password: await hash("E2e-Quest-2026", 12),
        emailVerified: new Date(),
        ageConfirmedAt: new Date(),
        onboardedAt: new Date(),
        experience: "python",
        goal: "python",
        weeklyHours: 5,
        exerciseSubmissions: { create: { exerciseId: fix.id, code: "", passed: true, testResults: "[]" } },
        streak: { create: { currentStreak: 0, longestStreak: 0, lastActivityDate: new Date() } },
      },
    });
    console.log("created");
  } else if (command === "tutor") {
    const user = await prisma.user.create({
      data: {
        email: args[0]!,
        name: "Tutor Learner",
        password: await hash("E2e-Quest-2026", 12),
        emailVerified: new Date(),
        ageConfirmedAt: new Date(),
        onboardedAt: new Date(),
        experience: "python",
        goal: "python",
        streak: { create: { currentStreak: 0, longestStreak: 0, lastActivityDate: new Date() } },
      },
    });
    // Not a real key: it only makes the tutor panel appear; the run-through answers /api/tutor itself
    await saveCredential(user.id, { provider: "anthropic", model: "claude-opus-5-5", apiKey: "dummy-key-for-ui-test" });
    console.log("created");
  } else if (command === "quest") {
    const row = await prisma.questProgress.findFirst({ where: { user: { email: args[0]! } } });
    console.log(JSON.stringify(row));
  } else if (command === "cleanup") {
    const { count } = await prisma.user.deleteMany({ where: { email: { in: args } } });
    console.log(`deleted ${count}`);
  }
  await prisma.$disconnect();
}
void main();
