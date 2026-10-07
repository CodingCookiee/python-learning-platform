import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as register } from "@/app/api/auth/register/route";
import { saveOnboarding } from "@/lib/onboarding";
import { getOnRamp } from "@/lib/onramp";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { getSequentialModuleUnlockMap } from "@/lib/module-access";
import { getLearnerRank } from "@/lib/learner-rank";
import { makeLearner } from "./helpers";

const created: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: created } } });
});

function signUp(body: Record<string, unknown>) {
  const email = `onramp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
  created.push(email);
  const request = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.9.${created.length}.1` },
    body: JSON.stringify({ name: "Ada Learner", email, password: "Correct-Horse-1", confirmPassword: "Correct-Horse-1", ...body }),
  });
  return { email, response: register(request) };
}

describe("signing up (16 and over)", () => {
  it("is refused without confirming the age, and creates no account", async () => {
    const { email, response } = signUp({});
    expect((await response).status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("records when the age was confirmed", async () => {
    const { email, response } = signUp({ ageConfirmed: true });
    expect((await response).status).toBe(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.ageConfirmedAt).toBeInstanceOf(Date);
  });
});

describe("onboarding", () => {
  const answers = { experience: "new" as const, goal: "python" as const, weeklyHours: 5 };

  it("asks for the age when the account has none on record (GitHub or Google sign-ins)", async () => {
    const learner = await makeLearner("onboard-age", { ageConfirmedAt: null });
    try {
      const refused = await saveOnboarding(learner.user.id, answers);
      expect(refused).toMatchObject({ ok: false, status: 400 });
      const saved = await saveOnboarding(learner.user.id, { ...answers, ageConfirmed: true });
      expect(saved.ok).toBe(true);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } });
      expect(user.ageConfirmedAt).toBeInstanceOf(Date);
      expect(user.onboardedAt).toBeInstanceOf(Date);
    } finally {
      await learner.cleanup();
    }
  });

  it("sends a beginner to the on-ramp and everyone else to the dashboard", async () => {
    const learner = await makeLearner("onboard-route");
    try {
      const onRampModule = await prisma.module.findFirstOrThrow({ where: { track: { slug: "start" } }, select: { id: true } });
      expect(await saveOnboarding(learner.user.id, answers)).toEqual({ ok: true, next: `/modules/${onRampModule.id}` });
      expect(await saveOnboarding(learner.user.id, { ...answers, experience: "python" })).toEqual({ ok: true, next: "/dashboard" });
    } finally {
      await learner.cleanup();
    }
  });

  it("doesn't ask again once the age is on record", async () => {
    const learner = await makeLearner("onboard-known");
    try {
      expect((await saveOnboarding(learner.user.id, answers)).ok).toBe(true);
    } finally {
      await learner.cleanup();
    }
  });
});

describe("the on-ramp's state", () => {
  async function startLessons() {
    return prisma.lesson.findMany({
      where: { archivedAt: null, module: { track: { slug: "start" } } },
      orderBy: { order: "asc" },
      select: { id: true },
    });
  }
  const complete = (userId: string, lessonIds: string[]) =>
    prisma.progress.createMany({ data: lessonIds.map((lessonId) => ({ userId, lessonId, completed: true, completedAt: new Date() })) });

  it("is on the dashboard for a beginner who hasn't started", async () => {
    const learner = await makeLearner("onramp-new", { experience: "new", onboardedAt: new Date() });
    try {
      const onRamp = (await getOnRamp(learner.user.id))!;
      expect(onRamp).toMatchObject({ started: false, finished: false, showOnDashboard: true });
      expect(onRamp.next?.number).toBe(1);
    } finally {
      await learner.cleanup();
    }
  });

  it("stays off a developer's dashboard unless they start it", async () => {
    const learner = await makeLearner("onramp-dev", { experience: "python", onboardedAt: new Date() });
    try {
      expect((await getOnRamp(learner.user.id))!.showOnDashboard).toBe(false);
      const [first] = await startLessons();
      await complete(learner.user.id, [first!.id]);
      expect(await getOnRamp(learner.user.id)).toMatchObject({ started: true, showOnDashboard: true });
    } finally {
      await learner.cleanup();
    }
  });

  it("leaves the dashboard once every lesson is done", async () => {
    const learner = await makeLearner("onramp-done", { experience: "new", onboardedAt: new Date() });
    try {
      await complete(learner.user.id, (await startLessons()).map((l) => l.id));
      expect(await getOnRamp(learner.user.id)).toMatchObject({ finished: true, showOnDashboard: false, next: null });
    } finally {
      await learner.cleanup();
    }
  });
});

describe("the on-ramp's rewards", () => {
  it("arrive at the right lessons, and leave the rank and module 1 alone", async () => {
    const learner = await makeLearner("onramp-badges", { experience: "new", onboardedAt: new Date() });
    try {
      const lessons = await prisma.lesson.findMany({
        where: { archivedAt: null, module: { track: { slug: "start" } } },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      expect(lessons).toHaveLength(6);
      const pythonModule1 = await prisma.module.findFirstOrThrow({
        where: { track: { slug: "python" }, order: 1 },
        select: { id: true },
      });
      const earned = new Set<string>();
      const badgesAfter: Record<number, string[]> = {};
      for (const [i, lesson] of lessons.entries()) {
        await prisma.progress.create({ data: { userId: learner.user.id, lessonId: lesson.id, completed: true, completedAt: new Date() } });
        const unlocked = await checkAndUnlockAchievements(learner.user.id, { type: "lesson_complete", lessonId: lesson.id });
        badgesAfter[i + 1] = unlocked.map((a) => a.slug ?? "").filter((s) => ["hello-world", "decision-maker", "in-the-loop", "white-belt-tied"].includes(s));
        unlocked.forEach((a) => a.slug && earned.add(a.slug));
        expect((await getSequentialModuleUnlockMap(learner.user.id)).get(pythonModule1.id)).toBe(true);
      }
      expect(badgesAfter[1]).toEqual(["hello-world"]);
      expect(badgesAfter[4]).toEqual(["decision-maker"]);
      expect(badgesAfter[5]).toEqual(["in-the-loop"]);
      expect(badgesAfter[6]).toEqual(["white-belt-tied"]);
      expect([2, 3].flatMap((n) => badgesAfter[n])).toEqual([]);
      expect((await getLearnerRank(learner.user.id)).label).toBe("16 kyu");
    } finally {
      await learner.cleanup();
    }
  });

  it("include Bug Squasher for a first fix drill, anywhere", async () => {
    const learner = await makeLearner("onramp-bug");
    try {
      const fixDrill = await prisma.exercise.findFirstOrThrow({ where: { type: "fix", archivedAt: null }, select: { id: true } });
      await prisma.exerciseSubmission.create({ data: { userId: learner.user.id, exerciseId: fixDrill.id, code: "", passed: true, testResults: "[]" } });
      const unlocked = await checkAndUnlockAchievements(learner.user.id, { type: "exercise_pass", exerciseId: fixDrill.id });
      expect(unlocked.map((a) => a.slug)).toContain("bug-squasher");
    } finally {
      await learner.cleanup();
    }
  });
});
