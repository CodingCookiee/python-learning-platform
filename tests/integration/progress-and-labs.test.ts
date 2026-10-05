import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getBlackBeltStatus } from "@/lib/black-belt";
import { getLearnerRank } from "@/lib/learner-rank";
import { getCurrentWeek, saveCurrentWeek } from "@/lib/learning-log";
import { formatCheckIn } from "@/lib/learning-log-format";
import { getPace } from "@/lib/pacing";
import { checkFields, ensureLabRun, getLabForUser, recordLabCheck } from "@/lib/labs";
import { getCheckpointAttempt, topicsToReview } from "@/lib/checkpoint";
import { makeLearner, passAllPython } from "./helpers";

let learner: Awaited<ReturnType<typeof makeLearner>>;
let modules: Array<{ id: string; order: number }>;

beforeAll(async () => {
  learner = await makeLearner("progress", { onboardedAt: new Date(Date.now() - 20 * 86_400_000), goal: "python", experience: "python" });
  modules = await passAllPython(learner.user.id);
});
afterAll(() => learner.cleanup());

describe("the black belt", () => {
  it("isn't earned by passing every module alone", async () => {
    const bb = await getBlackBeltStatus(learner.user.id);
    expect(bb.checkpoints).toEqual({ passed: 16, total: 16 });
    expect(bb.topics.length).toBeGreaterThan(5);
    expect(bb.met).toBe(false);
  });

  it("holds the rank at 1 kyu with a full brown belt and lists what's left", async () => {
    const rank = await getLearnerRank(learner.user.id);
    expect(rank.label).toBe("1 kyu");
    expect(rank.stripes).toBe(rank.stripeSlots);
    expect(rank.blackBeltPending?.capstones).toEqual({ approved: 0, needed: 3 });
  });

  it("tells the pacing card the grading is what's left", async () => {
    expect((await getPace(learner.user.id)).blackBeltPending).toBe(true);
  });
});

describe("checkpoint feedback", () => {
  it("lists the missed drills' topics and lessons", async () => {
    const m3 = modules.find((m) => m.order === 3)!;
    const drills = await prisma.exercise.findMany({ where: { lesson: { moduleId: m3.id }, difficulty: "core", type: "function" }, take: 3, select: { id: true } });
    const attempt = await prisma.checkpointAttempt.create({
      data: { userId: learner.user.id, moduleId: m3.id, exerciseIds: drills.map((d) => d.id), passedIds: [drills[0]!.id], score: 1 / 3, submittedAt: new Date() },
    });
    const view = (await getCheckpointAttempt(learner.user.id, attempt.id))!;
    const review = topicsToReview(view.drills);
    expect(review.missed).toHaveLength(2);
    expect(review.topics.length).toBeGreaterThan(0);
    expect(review.lessons.reduce((n, l) => n + l.drills, 0)).toBe(2);
  });
});

describe("the learning log", () => {
  it("drafts the week from activity, in the roadmap's format", async () => {
    const m3 = modules.find((m) => m.order === 3)!;
    const lesson = await prisma.lesson.findFirstOrThrow({ where: { moduleId: m3.id, order: 1 }, select: { id: true } });
    await prisma.progress.create({ data: { userId: learner.user.id, lessonId: lesson.id, completed: true, completedAt: new Date() } });
    const week = await getCurrentWeek(learner.user.id);
    expect(week.saved).toBe(false);
    expect(week.built).toMatch(/^Lessons: /);
    expect(week.hours).toBeGreaterThan(0);
    expect(week.phase).toBe("Python black belt grading");
    expect(week.nextGoal).toMatch(/capstone 1 of 3/);
    expect(formatCheckIn(week)).toMatch(/^ROADMAP CHECK-IN\nPhase: Python black belt grading +Week: \d+\n/);
  });

  it("keeps what the learner saved", async () => {
    const week = await getCurrentWeek(learner.user.id);
    const { hours, built, stuck, nextGoal, question } = week;
    await saveCurrentWeek(learner.user.id, { hours, built, stuck, nextGoal, question, learned: "Closures keep their scope" });
    const again = await getCurrentWeek(learner.user.id);
    expect(again).toMatchObject({ saved: true, learned: "Closures keep their scope", phase: "Python black belt grading" });
  });
});

describe("labs", () => {
  it("verify a webhook body field by field, once, with XP", async () => {
    const lesson = await prisma.lesson.findFirstOrThrow({ where: { slug: "webhooks" }, select: { id: true } });
    const lab = (await getLabForUser(learner.user.id, lesson.id))!;
    expect(lab.spec.kind).toBe("webhook");
    expect(lab.webhookUrl).toMatch(/\/api\/labs\/hook\/[\w-]{10,}$/);

    const run = await ensureLabRun(learner.user.id, lesson.id);
    const wrong = checkFields(lab.spec, { id: "evt_1042", type: "form.submitted", data: { email: "someone@else.com" } });
    expect(wrong.passed).toBe(false);
    expect((await recordLabCheck(run.id, learner.user.id, wrong, "{}")).newlyVerified).toBe(false);

    const xpBefore = (await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).xp;
    const right = checkFields(lab.spec, { id: "evt_1042", type: "form.submitted", data: { email: "amira@example.com" } });
    expect(right.passed).toBe(true);
    expect((await recordLabCheck(run.id, learner.user.id, right, "{}")).newlyVerified).toBe(true);
    expect((await recordLabCheck(run.id, learner.user.id, right, "{}")).newlyVerified).toBe(false);
    const xpAfter = (await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).xp;
    expect(xpAfter - xpBefore).toBeGreaterThanOrEqual(15);
  });
});
