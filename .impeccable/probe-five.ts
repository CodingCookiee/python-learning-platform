import "dotenv/config";
import { writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";
import { getBlackBeltStatus } from "../lib/black-belt";
import { getLearnerRank } from "../lib/learner-rank";
import { getCurrentWeek } from "../lib/learning-log";
import { formatCheckIn } from "../lib/learning-log-format";
import { getAiUsageReport } from "../lib/ai/usage-report";

// A throwaway admin learner with every Python module passed, for checking the five new features
const EMAIL = "five-probe@example.invalid";
let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 260)}` : ""}`);
};

async function main() {
  if (process.argv[2] === "cleanup") {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    console.log("cleaned");
    return;
  }
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: {
      email: EMAIL, name: "Five Probe", role: "ADMIN", password: await hash("FiveProbe!2026", 12),
      emailVerified: new Date(), onboardedAt: new Date(Date.now() - 20 * 86_400_000), experience: "python", goal: "python",
    },
  });
  const python = await prisma.module.findMany({ where: { archivedAt: null, track: { slug: "python" } }, orderBy: { order: "asc" }, select: { id: true, order: true } });

  // Black belt: modules passed but nothing else yet → 1 kyu, grading pending
  await prisma.checkpointAttempt.createMany({
    data: python.map((m) => ({ userId: user.id, moduleId: m.id, exerciseIds: [], passedIds: [], placement: true, score: 1, passed: true, submittedAt: new Date() })),
  });
  const bb = await getBlackBeltStatus(user.id);
  check("all checkpoints count", bb.checkpoints.passed === bb.checkpoints.total && bb.checkpoints.total === 16, bb.checkpoints);
  check("advanced topics listed from modules 8-13", bb.topics.length > 5 && bb.topicsMet === 0, { n: bb.topics.length, sample: bb.topics.slice(0, 4) });
  check("black belt not met yet", !bb.met);
  const rank = await getLearnerRank(user.id);
  check("rank holds at 1 kyu, grading pending", rank.label === "1 kyu" && rank.blackBeltPending !== null && rank.stripes === rank.stripeSlots, { label: rank.label, stripes: rank.stripes });

  // Checkpoint feedback: a failed attempt on module 3 with one of three drills passed
  const m3 = python.find((m) => m.order === 3)!;
  const drills = await prisma.exercise.findMany({ where: { lesson: { moduleId: m3.id }, difficulty: "core", type: "function" }, take: 3, select: { id: true } });
  const failed = await prisma.checkpointAttempt.create({
    data: { userId: user.id, moduleId: m3.id, exerciseIds: drills.map((d) => d.id), passedIds: [drills[0]!.id], score: 1 / 3, passed: false, submittedAt: new Date(Date.now() - 2 * 3_600_000) },
  });

  // Learning log activity this week: a lesson done and a drill passed
  const lesson = await prisma.lesson.findFirstOrThrow({ where: { moduleId: m3.id, order: 1 }, select: { id: true } });
  await prisma.progress.create({ data: { userId: user.id, lessonId: lesson.id, completed: true, completedAt: new Date() } });
  await prisma.exerciseSubmission.create({ data: { userId: user.id, exerciseId: drills[1]!.id, code: "x", passed: true, testResults: "{}" } });
  await prisma.exerciseSubmission.create({ data: { userId: user.id, exerciseId: drills[2]!.id, code: "x", passed: false, testResults: "{}" } });
  const week = await getCurrentWeek(user.id);
  check("log is drafted from activity", !week.saved && /Lessons:/.test(week.built) && week.hours > 0 && week.phase === "Python black belt grading" && /capstone 1 of 3/.test(week.nextGoal), week);
  check("stuck lists the drill never passed", week.stuck.length > 0, week.stuck);
  const text = formatCheckIn(week);
  check("check-in text matches the roadmap template", /^ROADMAP CHECK-IN\nPhase: .+Week: \d+\nHours this week: /.test(text), text);

  // AI usage for the admin dashboard
  const day = 86_400_000;
  await prisma.llmUsage.createMany({
    data: [
      { userId: user.id, feature: "tutor", provider: "anthropic", model: "claude-sonnet-5", inputTokens: 1800, outputTokens: 220, cachedTokens: 1200, createdAt: new Date() },
      { userId: user.id, feature: "tutor", provider: "anthropic", model: "claude-sonnet-5", inputTokens: 1500, outputTokens: 180, cachedTokens: 1100, createdAt: new Date(Date.now() - day) },
      { userId: user.id, feature: "explain", provider: "anthropic", model: "claude-sonnet-5", inputTokens: 900, outputTokens: 300, cachedTokens: 0, createdAt: new Date(Date.now() - 3 * day) },
      { userId: user.id, feature: "review", provider: "openai", model: "gpt-5-mini", inputTokens: 9000, outputTokens: 1400, cachedTokens: 0, createdAt: new Date(Date.now() - 6 * day) },
    ],
  });
  const report = await getAiUsageReport(30);
  check("usage report totals", report.totals.calls >= 4 && report.byFeature.length >= 3 && report.daily.length === 30, report.totals);
  check("today counted", report.today.calls >= 1, report.today);

  const split = await prisma.exercise.findUniqueOrThrow({ where: { slug: "imports-split-pricing" }, select: { id: true } });
  const pkg = await prisma.exercise.findUniqueOrThrow({ where: { slug: "imports-package-reexport" }, select: { id: true } });
  writeFileSync(process.env.TEMP + "/five-ids.json", JSON.stringify({ failedCheckpoint: failed.id, split: split.id, pkg: pkg.id }));
  console.log(failures === 0 ? "SETUP OK" : `${failures} FAILED`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
