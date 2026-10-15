// Database steps for the quest run-through (.impeccable/quest-e2e.mjs). Throwaway accounts only.
//   npx tsx .impeccable/quest-e2e-db.ts drill <exerciseId>      a drill's type, main file and reference solution
//   npx tsx .impeccable/quest-e2e-db.ts drill-id <slug>             a drill's id
//   npx tsx .impeccable/quest-e2e-db.ts lesson-id <slug> / module-id <order>   ids for the run-throughs
//   npx tsx .impeccable/quest-e2e-db.ts expire-checkpoints <email>   the learner's open checkpoints run out of time on the server
//   npx tsx .impeccable/quest-e2e-db.ts fresh <email> <name>      a verified 16+ account, not onboarded yet
//   npx tsx .impeccable/quest-e2e-db.ts existing <email>        an onboarded developer from before the quest, one fix drill passed
//   npx tsx .impeccable/quest-e2e-db.ts examiner <email> / capstone-submission <learnerEmail>   a throwaway admin with a dummy AI key; a pending submission to grade
//   npx tsx .impeccable/quest-e2e-db.ts tutor <email>           an onboarded learner with a dummy AI key (the page's tutor shows; tests intercept /api/tutor, no provider is called)
//   npx tsx .impeccable/quest-e2e-db.ts tour <email>            an onboarded learner on the quest's step 5 (the dashboard tour)
//   npx tsx .impeccable/quest-e2e-db.ts quest <email>           the account's quest row
//   npx tsx .impeccable/quest-e2e-db.ts certificate-ready <email>   every Python and automation module passed: the automation certificate is earned
//   npx tsx .impeccable/quest-e2e-db.ts black-belt-ready <email>   the black belt by its real rule: the Python certificate is earned
//   npx tsx .impeccable/quest-e2e-db.ts certificate-issue <email> <python|automation> <name>   a certificate issued directly (prints its code)
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
  } else if (command === "pass-lesson") {
    // Every drill of a lesson passed, so its "Mark lesson complete" opens
    const user = await prisma.user.findUniqueOrThrow({ where: { email: args[0]! }, select: { id: true } });
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { slug: args[1]!, archivedAt: null },
      select: { exercises: { where: { archivedAt: null }, select: { id: true } } },
    });
    await prisma.exerciseSubmission.createMany({
      data: lesson.exercises.map((e) => ({ userId: user.id, exerciseId: e.id, code: "", passed: true, testResults: "[]" })),
    });
    console.log("passed");
  } else if (command === "pass-all-but-last") {
    // Every required drill of a lesson passed except the last, whose id is printed: passing it in
    // the browser should complete the lesson
    const user = await prisma.user.findUniqueOrThrow({ where: { email: args[0]! }, select: { id: true } });
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { slug: args[1]!, archivedAt: null },
      select: { exercises: { where: { archivedAt: null, required: true }, orderBy: { order: "asc" }, select: { id: true } } },
    });
    const last = lesson.exercises.at(-1)!;
    await prisma.exerciseSubmission.createMany({
      data: lesson.exercises.slice(0, -1).map((e) => ({ userId: user.id, exerciseId: e.id, code: "", passed: true, testResults: "[]" })),
    });
    console.log(last.id);
  } else if (command === "pass-modules") {
    // The first N Python modules passed as placement checkpoints, then the real unlock check: belts,
    // module patches and the rest land as they would
    const { checkAndUnlockAchievements } = await import("@/lib/achievements");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: args[0]! }, select: { id: true } });
    const modules = await prisma.module.findMany({
      where: { archivedAt: null, track: { slug: "python" } },
      orderBy: { order: "asc" },
      take: Number(args[1] ?? 3),
      select: { id: true },
    });
    await prisma.checkpointAttempt.createMany({
      data: modules.map((m) => ({ userId: user.id, moduleId: m.id, exerciseIds: [], passedIds: [], placement: true, score: 1, passed: true, submittedAt: new Date() })),
    });
    const unlocked = await checkAndUnlockAchievements(user.id);
    console.log(unlocked.map((a) => a.slug).join(","));
  } else if (command === "certificate-ready") {
    // Every Python and AI automation module passed (placement checkpoints): the automation certificate
    // is earned. No capstones, so not the black belt
    const user = await prisma.user.findUniqueOrThrow({ where: { email: args[0]! }, select: { id: true } });
    const modules = await prisma.module.findMany({
      where: { archivedAt: null, track: { slug: { in: ["python", "automation"] } } },
      select: { id: true },
    });
    await prisma.checkpointAttempt.createMany({
      data: modules.map((m) => ({ userId: user.id, moduleId: m.id, exerciseIds: [], passedIds: [], placement: true, score: 1, passed: true, submittedAt: new Date() })),
    });
    console.log(`passed ${modules.length}`);
  } else if (command === "black-belt-ready") {
    // The black belt by its real rule (lib/black-belt.ts), so the Python certificate is claimed through
    // the eligibility check: every Python grading passed, every advanced drill (modules 8 to 13)
    // solved and held through the last review stage, and three Python capstones approved
    const { BLACK_BELT } = await import("@/lib/black-belt");
    const { REVIEW_MAX_STAGE } = await import("@/lib/mastery-rules");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: args[0]! }, select: { id: true } });
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
      data: drills.map((d) => ({ userId: user.id, exerciseId: d.id, stage: REVIEW_MAX_STAGE, dueAt: new Date(Date.now() + 90 * 86_400_000), reviews: REVIEW_MAX_STAGE })),
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
    console.log(`passed ${modules.length} gradings, ${drills.length} advanced drills held, ${capstones.length} capstones approved`);
  } else if (command === "certificate-issue") {
    // A certificate issued straight into the database (no eligibility check), to look at a design
    const { newCertificateCode } = await import("@/lib/certificate-rules");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: args[0]! }, select: { id: true } });
    const track = args[1] === "automation" ? "automation" : "python";
    const cert = await prisma.certificate.create({
      data: { userId: user.id, track, name: args.slice(2).join(" ") || "Test Learner", code: newCertificateCode(track) },
    });
    console.log(cert.code);
  } else if (command === "lesson-id") {
    console.log((await prisma.lesson.findFirstOrThrow({ where: { slug: args[0]!, archivedAt: null }, select: { id: true } })).id);
  } else if (command === "expire-checkpoints") {
    // The learner's open checkpoints run out of time, as far as the server is concerned
    const user = await prisma.user.findUniqueOrThrow({ where: { email: args[0]! }, select: { id: true } });
    const { count } = await prisma.checkpointAttempt.updateMany({
      where: { userId: user.id, submittedAt: null },
      data: { startedAt: new Date(Date.now() - 24 * 3600_000) },
    });
    console.log(`expired ${count}`);
  } else if (command === "module-id") {
    // The Python track's module at this order
    console.log((await prisma.module.findFirstOrThrow({ where: { order: Number(args[0]), track: { slug: "python" } }, select: { id: true } })).id);
  } else if (command === "fresh") {
    // A verified 16+ account that hasn't onboarded: sign-up without the sign-up rate limit
    await prisma.user.create({
      data: {
        email: args[0]!,
        name: args[1] ?? "Quest Learner",
        password: await hash("E2e-Quest-2026", 12),
        emailVerified: new Date(),
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
        onboardedAt: new Date(),
        experience: "python",
        goal: "python",
        streak: { create: { currentStreak: 0, longestStreak: 0, lastActivityDate: new Date() } },
      },
    });
    // Not a real key: it only makes the tutor panel appear; the run-through answers /api/tutor itself
    await saveCredential(user.id, { provider: "anthropic", model: "claude-opus-5-5", apiKey: "dummy-key-for-ui-test" });
    console.log("created");
  } else if (command === "examiner") {
    // A throwaway examiner (admin role) with a dummy AI key: the run-through answers the AI review itself.
    // Deleted by cleanup like any test account; the real admin account is never used
    const user = await prisma.user.create({
      data: {
        email: args[0]!,
        name: "Test Examiner",
        role: "SUPER_ADMIN",
        password: await hash("E2e-Quest-2026", 12),
        emailVerified: new Date(),
        onboardedAt: new Date(),
        experience: "python",
        goal: "python",
      },
    });
    await saveCredential(user.id, { provider: "anthropic", model: "claude-opus-5-5", apiKey: "dummy-key-for-ui-test" });
    console.log("created");
  } else if (command === "capstone-submission") {
    // A pending capstone submission from this learner, for the examiner to grade: one small uploaded file
    const user = await prisma.user.findUniqueOrThrow({ where: { email: args[0]! }, select: { id: true } });
    const project = await prisma.project.findFirstOrThrow({ where: { archivedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true } });
    const files = [{ name: "main.py", size: 15, type: "text/x-python", content: Buffer.from("print('hello')\n").toString("base64") }];
    const submission = await prisma.projectSubmission.create({
      data: { userId: user.id, projectId: project.id, status: "pending", files: JSON.stringify({ type: "files", files, notes: "My first try." }) },
    });
    console.log(submission.id);
  } else if (command === "submission-project") {
    console.log((await prisma.projectSubmission.findUniqueOrThrow({ where: { id: args[0]! }, select: { projectId: true } })).projectId);
  } else if (command === "submission-status") {
    console.log((await prisma.projectSubmission.findUniqueOrThrow({ where: { id: args[0]! }, select: { status: true } })).status);
  } else if (command === "tour") {
    // An onboarded learner whose quest is on step 5, the dashboard tour
    await prisma.user.create({
      data: {
        email: args[0]!,
        name: "Tour Learner",
        password: await hash("E2e-Quest-2026", 12),
        emailVerified: new Date(),
        onboardedAt: new Date(),
        experience: "python",
        goal: "python",
        streak: { create: { currentStreak: 0, longestStreak: 0, lastActivityDate: new Date() } },
        quests: { create: { quest: "first-session", completed: ["run-code", "scratchpad", "first-drill", "fix-bug"] } },
      },
    });
    console.log("created");
  } else if (command === "quest") {
    const row = await prisma.questProgress.findFirst({ where: { user: { email: args[0]! } } });
    console.log(JSON.stringify(row));
  } else if (command === "cleanup-prefix") {
    // Throwaway accounts a crashed run left behind: only ever @example.invalid addresses
    const { count } = await prisma.user.deleteMany({ where: { email: { startsWith: args[0]!, endsWith: "@example.invalid" } } });
    console.log(`deleted ${count}`);
  } else if (command === "cleanup") {
    const { count } = await prisma.user.deleteMany({ where: { email: { in: args } } });
    console.log(`deleted ${count}`);
  }
  await prisma.$disconnect();
}
void main();
