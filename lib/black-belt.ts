import { prisma } from "@/lib/prisma";
import { getCurriculumState, PYTHON_TRACK, type TrackProgress } from "@/lib/curriculum-state";
import { drillStrength, reviewEligible } from "@/lib/mastery-rules";

/**
 * The black belt (1st dan) is "advanced-confident" Python, not just the last
 * module passed (docs/ARCHITECTURE.md §6.6). It takes all three:
 * - every Python module's checkpoint passed;
 * - every advanced topic held at 80% or more: the tags taught in the green and
 *   blue belt modules (8–13, the advanced language and how Python works), with
 *   the same strength as the skill map, so it needs solved drills that have
 *   survived spaced reviews;
 * - three Python capstones approved by the examiner.
 */

export const BLACK_BELT = {
  masteryTarget: 0.8,
  capstonesNeeded: 3,
  advancedModules: { from: 8, to: 13 },
  /** A tag counts as a topic once it has this many drills in those modules */
  minTopicDrills: 4,
} as const;

export interface BlackBeltStatus {
  met: boolean;
  checkpoints: { passed: number; total: number };
  /** Weakest first */
  topics: Array<{ tag: string; strength: number; drills: number }>;
  topicsMet: number;
  capstones: { approved: number; needed: number };
}

export async function getBlackBeltStatus(userId: string, tracks?: TrackProgress[]): Promise<BlackBeltStatus> {
  const state = tracks ?? (await getCurriculumState(userId));
  const python = state.find((t) => t.slug === PYTHON_TRACK);
  const modules = python?.modules ?? [];
  const advancedIds = modules
    .filter((m) => m.order >= BLACK_BELT.advancedModules.from && m.order <= BLACK_BELT.advancedModules.to)
    .map((m) => m.id);

  const [drills, solved, stages, capstones] = await Promise.all([
    prisma.exercise.findMany({
      where: { archivedAt: null, lesson: { archivedAt: null, moduleId: { in: advancedIds } } },
      select: { id: true, tags: true, difficulty: true, type: true },
    }),
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: true, exercise: { lesson: { moduleId: { in: advancedIds } } } },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    }),
    prisma.reviewItem.findMany({ where: { userId }, select: { exerciseId: true, stage: true } }),
    prisma.projectSubmission.findMany({
      where: { userId, status: "approved", project: { archivedAt: null, module: { track: { slug: PYTHON_TRACK } } } },
      distinct: ["projectId"],
      select: { projectId: true },
    }),
  ]);

  const solvedIds = new Set(solved.map((s) => s.exerciseId));
  const stageOf = new Map(stages.map((s) => [s.exerciseId, s.stage]));
  const byTag = new Map<string, number[]>();
  for (const d of drills) {
    if (!reviewEligible(d)) continue;
    const strength = drillStrength(solvedIds.has(d.id), stageOf.get(d.id) ?? null);
    for (const tag of new Set(d.tags.map((t) => t.toLowerCase()))) byTag.set(tag, [...(byTag.get(tag) ?? []), strength]);
  }
  const topics = [...byTag.entries()]
    .filter(([, xs]) => xs.length >= BLACK_BELT.minTopicDrills)
    .map(([tag, xs]) => ({ tag, strength: xs.reduce((a, b) => a + b, 0) / xs.length, drills: xs.length }))
    .sort((a, b) => a.strength - b.strength || b.drills - a.drills);
  const topicsMet = topics.filter((t) => t.strength + 1e-9 >= BLACK_BELT.masteryTarget).length;

  const checkpoints = { passed: modules.filter((m) => m.passed).length, total: modules.length };
  const capstonesApproved = capstones.length;
  return {
    met:
      checkpoints.total > 0 &&
      checkpoints.passed === checkpoints.total &&
      topicsMet === topics.length &&
      capstonesApproved >= BLACK_BELT.capstonesNeeded,
    checkpoints,
    topics,
    topicsMet,
    capstones: { approved: capstonesApproved, needed: BLACK_BELT.capstonesNeeded },
  };
}

/** Only worth computing once every Python module is passed (it's the last gate) */
export async function blackBeltIfDue(userId: string, tracks: TrackProgress[]): Promise<BlackBeltStatus | null> {
  const python = tracks.find((t) => t.slug === PYTHON_TRACK);
  const allPassed = python ? python.modules.length > 0 && python.modules.every((m) => m.passed) : false;
  return allPassed ? getBlackBeltStatus(userId, tracks) : null;
}
