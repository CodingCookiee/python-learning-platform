import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSyllabusProgress } from "@/lib/syllabus";
import { getNextStep } from "@/lib/next-step";
import { makeLearner } from "./helpers";

let learner: Awaited<ReturnType<typeof makeLearner>>;
let first: { id: string; title: string; exercises: Array<{ id: string; title: string }> };
let moduleId: string;
beforeAll(async () => {
  learner = await makeLearner("next-step", { experience: "python", onboardedAt: new Date() });
  const mod = await prisma.module.findFirstOrThrow({ where: { archivedAt: null, order: 1, track: { slug: "python" } }, select: { id: true } });
  moduleId = mod.id;
  first = await prisma.lesson.findFirstOrThrow({
    where: { moduleId, archivedAt: null },
    orderBy: { order: "asc" },
    select: { id: true, title: true, exercises: { where: { archivedAt: null, required: true }, orderBy: { order: "asc" }, select: { id: true, title: true } } },
  });
});
afterAll(() => learner.cleanup());

const next = async (reviewsDue = 0) => getNextStep(learner.user.id, await getSyllabusProgress(learner.user.id), reviewsDue);

describe("the dashboard's next step", () => {
  it("starts with the first lesson of the current module", async () => {
    expect(await next()).toMatchObject({ kind: "lesson", lessonId: first.id, index: 1 });
  });

  it("goes straight to the next drill once the lesson's drills are under way, and says when a draft is waiting", async () => {
    expect(first.exercises.length).toBeGreaterThan(1);
    await prisma.exerciseSubmission.create({ data: { userId: learner.user.id, exerciseId: first.exercises[0]!.id, code: "", passed: true, testResults: "[]" } });
    expect(await next()).toMatchObject({ kind: "drill", exerciseId: first.exercises[1]!.id, index: 2, total: first.exercises.length, draft: false });
    await prisma.drillDraft.create({ data: { userId: learner.user.id, exerciseId: first.exercises[1]!.id, code: "print('half done')" } });
    expect(await next()).toMatchObject({ kind: "drill", draft: true });
  });

  it("puts due reviews first, and a running checkpoint before the lesson", async () => {
    expect(await next(3)).toEqual({ kind: "reviews", count: 3 });
    const attempt = await prisma.checkpointAttempt.create({
      data: { userId: learner.user.id, moduleId, exerciseIds: [first.exercises[0]!.id], passedIds: [], placement: true },
    });
    expect(await next()).toMatchObject({ kind: "checkpoint-open", attemptId: attempt.id, moduleOrder: 1 });
    // Once its time is up it isn't "open" any more
    await prisma.checkpointAttempt.update({ where: { id: attempt.id }, data: { startedAt: new Date(Date.now() - 24 * 3600_000) } });
    expect((await next()).kind).toBe("drill");
  });
});
