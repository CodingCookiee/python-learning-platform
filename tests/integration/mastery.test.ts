import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getCurriculumState } from "@/lib/curriculum-state";
import { getCheckpointAttempt, getCheckpointSummary, handInCheckpoint, recordCheckpointRun, startCheckpoint } from "@/lib/checkpoint";
import { getDrillForUser } from "@/lib/drills";
import { addToReview, getReviewQueue, recordReview } from "@/lib/review";
import { getSkillMap } from "@/lib/skill-map";
import { makeLearner } from "./helpers";

let learner: Awaited<ReturnType<typeof makeLearner>>;
let m1: { id: string; checkpoint: { pick: number } };
let m2Id: string;

beforeAll(async () => {
  learner = await makeLearner("mastery");
  const python = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!;
  m1 = python.modules[0]!;
  m2Id = python.modules[1]!.id;
});
afterAll(() => learner.cleanup());

describe("checkpoints", () => {
  let attemptId: string;
  let drillIds: string[];

  it("start as a placement test before the lessons, and only for open modules", async () => {
    expect((await getCheckpointSummary(learner.user.id, m1.id))?.status).toBe("placement");
    expect((await startCheckpoint(learner.user.id, m2Id)).ok).toBe(false);
    const started = await startCheckpoint(learner.user.id, m1.id);
    expect(started.ok).toBe(true);
    attemptId = started.ok ? started.attemptId : "";
    const again = await startCheckpoint(learner.user.id, m1.id);
    expect(again.ok && again.attemptId).toBe(attemptId);
  });

  it("draw drills across lessons and serve them without hints or solutions", async () => {
    const view = (await getCheckpointAttempt(learner.user.id, attemptId))!;
    drillIds = view.drills.map((d) => d.id);
    expect(view.drills).toHaveLength(m1.checkpoint.pick);
    expect(new Set(view.drills.map((d) => d.lessonTitle)).size).toBeGreaterThan(1);
    const drill = (await getDrillForUser(drillIds[0]!, learner.user.id))!;
    expect(drill.mode.kind).toBe("checkpoint");
    expect(drill.hints).toEqual([]);
    expect(drill.solution).toBeNull();
  });

  it("fail below the pass mark, then make you wait before a fresh draw", async () => {
    for (const id of drillIds.slice(0, -2)) await recordCheckpointRun(learner.user.id, attemptId, id, true);
    expect((await handInCheckpoint(learner.user.id, attemptId))?.passed).toBe(false);
    expect((await getCheckpointSummary(learner.user.id, m1.id))?.status).toBe("cooldown");
  });

  it("pass the module once every drill passes, with XP, and open the next one", async () => {
    await prisma.checkpointAttempt.update({ where: { id: attemptId }, data: { submittedAt: new Date(Date.now() - 3_600_000) } });
    const second = await startCheckpoint(learner.user.id, m1.id);
    expect(second.ok && second.attemptId !== attemptId).toBe(true);
    const id = second.ok ? second.attemptId : "";
    const view = (await getCheckpointAttempt(learner.user.id, id))!;
    let last;
    for (const d of view.drills) last = await recordCheckpointRun(learner.user.id, id, d.id, true);
    expect(last?.ok && last.finished).toMatchObject({ passed: true, xpGained: 100 });

    const python = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!;
    expect(python.modules[0]).toMatchObject({ passed: true, checkpoint: { placement: true } });
    expect(python.modules[1]!.unlocked).toBe(true);
    expect((await getDrillForUser(drillIds[0]!, learner.user.id))?.mode.kind).toBe("practice");
  });
});

describe("spaced review", () => {
  it("only a due review moves the schedule, once", async () => {
    const ex = await prisma.exercise.findFirstOrThrow({ where: { lesson: { moduleId: m1.id }, difficulty: "core", type: "function" } });
    await addToReview(learner.user.id, ex);
    expect((await recordReview(learner.user.id, ex.id, { passed: true, hintsUsed: 0 })).counted).toBe(false);

    const due = () =>
      prisma.reviewItem.update({
        where: { userId_exerciseId: { userId: learner.user.id, exerciseId: ex.id } },
        data: { dueAt: new Date(Date.now() - 1000) },
      });
    await due();
    const pass = await recordReview(learner.user.id, ex.id, { passed: true, hintsUsed: 0 });
    expect(pass).toMatchObject({ counted: true, stage: 1 });
    expect(Math.round((new Date(pass.nextDueAt!).getTime() - Date.now()) / 86_400_000)).toBe(3);
    expect((await recordReview(learner.user.id, ex.id, { passed: true, hintsUsed: 0 })).counted).toBe(false);

    await due();
    await recordReview(learner.user.id, ex.id, { passed: false, hintsUsed: 0 });
    const item = await prisma.reviewItem.findUniqueOrThrow({ where: { userId_exerciseId: { userId: learner.user.id, exerciseId: ex.id } } });
    expect(item).toMatchObject({ stage: 0, lapses: 1 });

    const reviewDrill = (await getDrillForUser(ex.id, learner.user.id, "review"))!;
    expect(reviewDrill.mode.kind).toBe("review");
    expect(reviewDrill.solution).toBeNull();
  });

  it("backfills drills solved before review existed", async () => {
    const other = await prisma.exercise.findFirstOrThrow({
      where: { lesson: { moduleId: m1.id }, difficulty: "core", type: "function", reviewItems: { none: { userId: learner.user.id } } },
    });
    await prisma.exerciseSubmission.create({
      data: { userId: learner.user.id, exerciseId: other.id, code: "x", passed: true, testResults: "{}", submittedAt: new Date(Date.now() - 2 * 86_400_000) },
    });
    const queue = await getReviewQueue(learner.user.id);
    expect(queue.due.some((d) => d.exerciseId === other.id)).toBe(true);
  });
});

describe("the skill map", () => {
  it("shows open modules and their common topics", async () => {
    const map = await getSkillMap(learner.user.id);
    const mod1 = map.modules.find((m) => m.id === m1.id);
    expect(mod1?.strength).toBeGreaterThan(0);
    expect(map.tags.length).toBeGreaterThan(0);
  });
});
