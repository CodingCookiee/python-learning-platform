import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getCurriculumState } from "@/lib/curriculum-state";
import {
  getBeltTestOut,
  getCheckpointAttempt,
  getCheckpointSummary,
  handInCheckpoint,
  recordCheckpointRun,
  startBeltTestOut,
} from "@/lib/checkpoint";
import { BELT_DRILLS_PER_MODULE, CHECKPOINT_MINUTES_PER_DRILL, CHECKPOINT_XP } from "@/lib/mastery-rules";
import { makeLearner } from "./helpers";

let learner: Awaited<ReturnType<typeof makeLearner>>;
/** The Python modules, in order */
let modules: Array<{ id: string; order: number }>;
const byOrder = (order: number) => modules.find((m) => m.order === order)!.id;

beforeAll(async () => {
  learner = await makeLearner("belt-test-out");
  modules = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!.modules;
});
afterAll(() => learner.cleanup());

describe("a belt test-out", () => {
  it("is offered for the belt the learner has reached, from any of its module pages", async () => {
    const offer = (await getBeltTestOut(learner.user.id, byOrder(1)))!;
    expect(offer).toMatchObject({ belt: { key: "white" }, status: "available" });
    expect(offer.modules.map((m) => m.order)).toEqual([1, 2, 3]);
    expect(offer.drills).toBe(3 * BELT_DRILLS_PER_MODULE);
    expect(offer.minutes).toBe(offer.drills * CHECKPOINT_MINUTES_PER_DRILL);
    // Module 3 is still locked, but its page offers the same test-out
    expect((await getBeltTestOut(learner.user.id, byOrder(3)))?.belt.key).toBe("white");
    // The yellow belt isn't reached yet
    expect(await getBeltTestOut(learner.user.id, byOrder(4))).toBeNull();
  });

  it("draws two drills from each module, and keeps out of the modules' own gradings", async () => {
    const started = await startBeltTestOut(learner.user.id, byOrder(2));
    expect(started.ok).toBe(true);
    const id = started.ok ? started.attemptId : "";
    const view = (await getCheckpointAttempt(learner.user.id, id))!;
    expect(view.belt).toMatchObject({ key: "white", label: "White belt" });
    expect(view.belt!.modules.map((m) => m.order)).toEqual([1, 2, 3]);
    expect(view.drills).toHaveLength(3 * BELT_DRILLS_PER_MODULE);
    // Resuming returns the same attempt
    const again = await startBeltTestOut(learner.user.id, byOrder(1));
    expect(again.ok && again.attemptId).toBe(id);
    // Module 1's own grading isn't "open" because a belt test-out is
    expect((await getCheckpointSummary(learner.user.id, byOrder(1)))?.status).toBe("placement");

    // A miss: the belt cools down, module 1's own grading doesn't
    expect((await handInCheckpoint(learner.user.id, id))?.passed).toBe(false);
    expect((await getBeltTestOut(learner.user.id, byOrder(1)))?.status).toBe("cooldown");
    expect((await getCheckpointSummary(learner.user.id, byOrder(1)))?.status).toBe("placement");
    await prisma.checkpointAttempt.update({ where: { id }, data: { submittedAt: new Date(Date.now() - 3_600_000) } });
  });

  it("passes every module it covers, with each module's XP, and opens the next belt", async () => {
    const xpBefore = (await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).xp;
    const started = await startBeltTestOut(learner.user.id, byOrder(1));
    const id = started.ok ? started.attemptId : "";
    const view = (await getCheckpointAttempt(learner.user.id, id))!;
    let last;
    for (const d of view.drills) last = await recordCheckpointRun(learner.user.id, id, d.id, true);
    expect(last?.ok && last.finished).toMatchObject({ passed: true, xpGained: 3 * CHECKPOINT_XP });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).xp).toBeGreaterThanOrEqual(xpBefore + 3 * CHECKPOINT_XP);

    const python = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!;
    for (const order of [1, 2, 3]) {
      expect(python.modules.find((m) => m.order === order)).toMatchObject({ passed: true, checkpoint: { placement: true } });
    }
    expect(python.modules.find((m) => m.order === 4)!.unlocked).toBe(true);
    expect((await getCheckpointSummary(learner.user.id, byOrder(2)))?.status).toBe("passed");

    // White is done; the yellow belt (modules 4 to 7) is on offer now
    expect(await getBeltTestOut(learner.user.id, byOrder(1))).toBeNull();
    const yellow = (await getBeltTestOut(learner.user.id, byOrder(4)))!;
    expect(yellow.modules.map((m) => m.order)).toEqual([4, 5, 6, 7]);
    expect(yellow.drills).toBe(4 * BELT_DRILLS_PER_MODULE);
  });
});
