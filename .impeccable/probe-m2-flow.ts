import "dotenv/config";
import { prisma } from "../lib/prisma";
import { getCurriculumState } from "../lib/curriculum-state";
import {
  getCheckpointSummary,
  startCheckpoint,
  recordCheckpointRun,
  getCheckpointAttempt,
  handInCheckpoint,
} from "../lib/checkpoint";
import { getDrillForUser } from "../lib/drills";
import { addToReview, recordReview, getReviewQueue } from "../lib/review";
import { getSkillMap } from "../lib/skill-map";

const EMAIL = "m2-probe@example.invalid";
let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== undefined ? ` ${JSON.stringify(detail)}` : ""}`);
}

async function main() {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({ data: { email: EMAIL, name: "M2 Probe" } });
  const uid = user.id;
  try {
    let tracks = await getCurriculumState(uid);
    const py = tracks.find((t) => t.slug === "python")!;
    const [m1, m2] = py.modules;
    check("module 1 open, not passed", m1!.unlocked && !m1!.passed);
    check("module 2 locked", !m2!.unlocked);
    check("module 1 has a checkpoint pool", m1!.checkpoint.poolSize > 0, m1!.checkpoint);

    let summary = await getCheckpointSummary(uid, m1!.id);
    check("status is placement before lessons", summary?.status === "placement", summary?.status);
    const locked = await startCheckpoint(uid, m2!.id);
    check("can't start a locked module's checkpoint", !locked.ok);

    const started = await startCheckpoint(uid, m1!.id);
    check("start placement checkpoint", started.ok);
    if (!started.ok) return;
    const again = await startCheckpoint(uid, m1!.id);
    check("starting again resumes the same attempt", again.ok && again.attemptId === started.attemptId);

    const view = (await getCheckpointAttempt(uid, started.attemptId))!;
    check("draws `pick` drills", view.drills.length === m1!.checkpoint.pick, view.drills.length);
    check("drawn drills span lessons", new Set(view.drills.map((d) => d.lessonTitle)).size > 1);
    check("placement flag set", view.placement);

    const first = view.drills[0]!;
    const drill = await getDrillForUser(first.id, uid);
    check("drill served in checkpoint mode", drill?.mode.kind === "checkpoint", drill?.mode.kind);
    check("no hints in checkpoint", drill?.hints.length === 0);
    check("no solution in checkpoint", drill?.solution === null);

    // Fail one, pass the rest but one: 4/6 < 0.8 → hand in → fail
    const ids = view.drills.map((d) => d.id);
    await recordCheckpointRun(uid, started.attemptId, ids[0]!, false);
    for (const id of ids.slice(0, -2)) await recordCheckpointRun(uid, started.attemptId, id, true);
    const failed = await handInCheckpoint(uid, started.attemptId);
    check("hand-in with too few passes fails", failed?.passed === false, failed);
    summary = await getCheckpointSummary(uid, m1!.id);
    check("cooldown after a fail", summary?.status === "cooldown", summary?.status);

    // Skip the cooldown by back-dating the failed attempt
    await prisma.checkpointAttempt.update({
      where: { id: started.attemptId },
      data: { submittedAt: new Date(Date.now() - 3_600_000) },
    });
    const second = await startCheckpoint(uid, m1!.id);
    check("fresh attempt after cooldown", second.ok && second.attemptId !== started.attemptId);
    if (!second.ok) return;
    const view2 = (await getCheckpointAttempt(uid, second.attemptId))!;
    let last: Awaited<ReturnType<typeof recordCheckpointRun>> | null = null;
    for (const d of view2.drills) last = await recordCheckpointRun(uid, second.attemptId, d.id, true);
    check("passing every drill closes and passes", last?.ok === true && last.finished?.passed === true, last);
    check("checkpoint XP awarded", last?.ok === true && last.finished?.xpGained === 100);

    tracks = await getCurriculumState(uid);
    const py2 = tracks.find((t) => t.slug === "python")!;
    check("module 1 passed via placement", py2.modules[0]!.passed && py2.modules[0]!.checkpoint.placement);
    check("module 2 now open", py2.modules[1]!.unlocked);
    const after = await getDrillForUser(first.id, uid);
    check("drill back to practice after the checkpoint", after?.mode.kind === "practice");

    // Review scheduling
    const ex = await prisma.exercise.findFirstOrThrow({ where: { id: first.id } });
    await addToReview(uid, ex);
    const early = await recordReview(uid, ex.id, { passed: true, hintsUsed: 0 });
    check("an early review doesn't count", !early.counted);
    await prisma.reviewItem.update({
      where: { userId_exerciseId: { userId: uid, exerciseId: ex.id } },
      data: { dueAt: new Date(Date.now() - 1000) },
    });
    const pass = await recordReview(uid, ex.id, { passed: true, hintsUsed: 0 });
    const days = pass.nextDueAt ? Math.round((new Date(pass.nextDueAt).getTime() - Date.now()) / 86_400_000) : null;
    check("due review pass → stage 1, 3 days", pass.counted && pass.stage === 1 && days === 3, { ...pass, days });
    const dup = await recordReview(uid, ex.id, { passed: true, hintsUsed: 0 });
    check("second submission doesn't double-count", !dup.counted);
    await prisma.reviewItem.update({
      where: { userId_exerciseId: { userId: uid, exerciseId: ex.id } },
      data: { dueAt: new Date(Date.now() - 1000) },
    });
    const lapse = await recordReview(uid, ex.id, { passed: false, hintsUsed: 0 });
    const item = await prisma.reviewItem.findUniqueOrThrow({ where: { userId_exerciseId: { userId: uid, exerciseId: ex.id } } });
    check("fail → stage 0, one lapse", lapse.counted && item.stage === 0 && item.lapses === 1);
    const reviewDrill = await getDrillForUser(ex.id, uid, "review");
    check("review mode: no solution, hints kept", reviewDrill?.mode.kind === "review" && reviewDrill.solution === null && reviewDrill.hints.length > 0);

    // Backfill from practice passes
    const other = await prisma.exercise.findFirstOrThrow({
      where: { lesson: { moduleId: m1!.id }, difficulty: "core", type: "function", id: { notIn: ids } },
    });
    await prisma.exerciseSubmission.create({
      data: { userId: uid, exerciseId: other.id, code: "x", passed: true, testResults: "{}", submittedAt: new Date(Date.now() - 2 * 86_400_000) },
    });
    const queue = await getReviewQueue(uid);
    check("backfilled drill is due", queue.due.some((d) => d.exerciseId === other.id), { due: queue.due.length, deck: queue.deckSize });

    const map = await getSkillMap(uid);
    const mod1 = map.modules.find((m) => m.id === m1!.id);
    check("skill map has module 1 with some strength", !!mod1 && mod1.strength > 0, mod1);
    check("skill map tags", map.tags.length > 0, map.tags.slice(0, 5));
  } finally {
    await prisma.user.delete({ where: { id: uid } });
  }
  console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
