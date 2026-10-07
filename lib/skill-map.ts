import { prisma } from "@/lib/prisma";
import { getCurriculumState, type TrackGrade } from "@/lib/curriculum-state";
import { drillStrength, reviewEligible } from "@/lib/mastery-rules";

/**
 * The skill map: how firmly the learner holds each open module and its most
 * common topics. A drill counts 0 until solved, 0.4 once solved, and climbs to
 * 1 as it survives spaced reviews (lib/mastery-rules.ts drillStrength). Warm-ups
 * and predict drills don't count, the same as for review.
 */

export interface SkillModule {
  id: string;
  title: string;
  order: number;
  track: string;
  grade: TrackGrade;
  strength: number;
  solved: number;
  drills: number;
  passed: boolean;
}

export interface SkillTag {
  tag: string;
  strength: number;
  drills: number;
}

export interface SkillMap {
  modules: SkillModule[];
  tags: SkillTag[];
}

/** A topic needs this many drills in the open modules to appear */
const MIN_TAG_DRILLS = 4;
const MAX_TAGS = 18;

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export async function getSkillMap(userId: string): Promise<SkillMap> {
  const tracks = await getCurriculumState(userId);
  const open = tracks.flatMap((t) => t.modules.filter((m) => m.unlocked).map((m) => ({ m, t })));
  const moduleIds = open.map((o) => o.m.id);
  if (moduleIds.length === 0) return { modules: [], tags: [] };

  const [drills, solved, reviews] = await Promise.all([
    prisma.exercise.findMany({
      where: { archivedAt: null, lesson: { archivedAt: null, moduleId: { in: moduleIds } } },
      select: { id: true, tags: true, difficulty: true, type: true, lesson: { select: { moduleId: true } } },
    }),
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: true },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    }),
    prisma.reviewItem.findMany({ where: { userId }, select: { exerciseId: true, stage: true } }),
  ]);
  const solvedIds = new Set(solved.map((s) => s.exerciseId));
  const stages = new Map(reviews.map((r) => [r.exerciseId, r.stage]));

  const byModule = new Map<string, number[]>();
  const byTag = new Map<string, number[]>();
  const solvedByModule = new Map<string, number>();
  for (const d of drills) {
    if (!reviewEligible(d)) continue;
    const isSolved = solvedIds.has(d.id);
    const strength = drillStrength(isSolved, stages.get(d.id) ?? null);
    const mid = d.lesson.moduleId;
    byModule.set(mid, [...(byModule.get(mid) ?? []), strength]);
    if (isSolved) solvedByModule.set(mid, (solvedByModule.get(mid) ?? 0) + 1);
    // Tags are free-form in content; fold case so "Decimal" and "decimal" meet
    for (const tag of new Set(d.tags.map((t) => t.toLowerCase()))) byTag.set(tag, [...(byTag.get(tag) ?? []), strength]);
  }

  const modules: SkillModule[] = open
    .filter(({ m }) => byModule.has(m.id))
    .map(({ m, t }) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      track: t.slug,
      grade: t.grade,
      strength: mean(byModule.get(m.id)!),
      solved: solvedByModule.get(m.id) ?? 0,
      drills: byModule.get(m.id)!.length,
      passed: m.passed,
    }));

  const tags: SkillTag[] = [...byTag.entries()]
    .filter(([, xs]) => xs.length >= MIN_TAG_DRILLS)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_TAGS)
    .map(([tag, xs]) => ({ tag, strength: mean(xs), drills: xs.length }))
    .sort((a, b) => b.strength - a.strength || b.drills - a.drills);

  return { modules, tags };
}
