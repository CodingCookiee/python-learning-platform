import { prisma } from "@/lib/prisma";
import { inCheckpointPool } from "@/lib/mastery-rules";

/**
 * The single source of truth for "where is this learner": every live track and
 * module, with lesson progress, passed state and unlocking. Syllabus, rank,
 * module pages and the progress APIs all derive from this.
 *
 * Rules
 * - A module is passed when its checkpoint is passed. The checkpoint opens once
 *   every lesson is complete, or earlier as a placement test ("test out"). A
 *   module with nothing to draw a checkpoint from passes on its lessons alone.
 * - Within a track, modules unlock in order: each opens once all earlier ones pass.
 * - The automation track opens once Python module AUTOMATION_UNLOCK_AFTER is
 *   passed (modules 9, 12 and 14 cover Pydantic, asyncio and httpx, the
 *   roadmap's Phase 0), and fully once the Python black belt is earned.
 */

export const PYTHON_TRACK = "python";
export const AUTOMATION_TRACK = "automation";
export const AUTOMATION_UNLOCK_AFTER = 14;

export interface ModuleProgress {
  id: string;
  slug: string | null;
  order: number;
  title: string;
  summary: string;
  description: string;
  duration: number;
  phase: string;
  lessonIds: string[];
  lessonsDone: number;
  lessonsTotal: number;
  lessonsComplete: boolean;
  projectsTotal: number;
  checkpoint: {
    /** Drills the checkpoint can draw from; 0 means the module has no checkpoint */
    poolSize: number;
    pick: number;
    passMark: number;
    passed: boolean;
    /** Passed as a placement test, before the lessons were finished */
    placement: boolean;
  };
  passed: boolean;
  unlocked: boolean;
}

export interface TrackProgress {
  id: string;
  slug: string;
  title: string;
  summary: string;
  grade: "kyu" | "dan";
  order: number;
  unlocked: boolean;
  modules: ModuleProgress[];
  modulesPassed: number;
}

export async function getCurriculumState(userId: string | null): Promise<TrackProgress[]> {
  const [tracks, completed, checkpoints] = await Promise.all([
    prisma.track.findMany({
      where: { archivedAt: null },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        grade: true,
        order: true,
        modules: {
          where: { archivedAt: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            slug: true,
            order: true,
            title: true,
            summary: true,
            description: true,
            duration: true,
            phase: true,
            checkpointPick: true,
            checkpointPassMark: true,
            checkpointPool: true,
            lessons: {
              where: { archivedAt: null },
              select: {
                id: true,
                exercises: { where: { archivedAt: null }, select: { slug: true, difficulty: true, type: true } },
              },
            },
            _count: { select: { projects: { where: { archivedAt: null } } } },
          },
        },
      },
    }),
    userId
      ? prisma.progress.findMany({ where: { userId, completed: true }, select: { lessonId: true } })
      : Promise.resolve([]),
    userId
      ? prisma.checkpointAttempt.findMany({
          where: { userId, passed: true },
          select: { moduleId: true, placement: true },
          orderBy: { submittedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const done = new Set(completed.map((p) => p.lessonId));
  // The first pass decides whether it was a placement
  const passedCheckpoints = new Map<string, { placement: boolean }>();
  for (const c of checkpoints) if (!passedCheckpoints.has(c.moduleId)) passedCheckpoints.set(c.moduleId, c);
  const result: TrackProgress[] = tracks.map((t) => {
    let priorPassed = true;
    let modulesPassed = 0;
    const modules = t.modules.map((m) => {
      const lessonIds = m.lessons.map((l) => l.id);
      const lessonsDone = lessonIds.filter((id) => done.has(id)).length;
      const lessonsComplete = lessonIds.length > 0 && lessonsDone === lessonIds.length;
      const poolSize = m.lessons
        .flatMap((l) => l.exercises)
        .filter((e) => inCheckpointPool(e, m.checkpointPool)).length;
      const checkpoint = passedCheckpoints.get(m.id);
      const passed = lessonIds.length > 0 && (poolSize > 0 ? Boolean(checkpoint) : lessonsComplete);
      const unlocked = priorPassed;
      priorPassed = priorPassed && passed;
      if (priorPassed) modulesPassed++;
      return {
        id: m.id,
        slug: m.slug,
        order: m.order,
        title: m.title,
        summary: m.summary,
        description: m.description,
        duration: m.duration,
        phase: m.phase,
        lessonIds,
        lessonsDone,
        lessonsTotal: lessonIds.length,
        lessonsComplete,
        projectsTotal: m._count.projects,
        checkpoint: {
          poolSize,
          pick: Math.min(m.checkpointPick, poolSize),
          passMark: m.checkpointPassMark,
          passed: Boolean(checkpoint),
          placement: checkpoint?.placement ?? false,
        },
        passed,
        unlocked,
      };
    });
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      grade: t.grade === "dan" ? "dan" : "kyu",
      order: t.order,
      unlocked: true,
      modules,
      modulesPassed,
    };
  });

  // Tracks after the first gate on progress in Python
  const python = result.find((t) => t.slug === PYTHON_TRACK);
  const automationOpen = !python || python.modulesPassed >= AUTOMATION_UNLOCK_AFTER;
  for (const t of result) {
    if (t.slug === AUTOMATION_TRACK && !automationOpen) {
      t.unlocked = false;
      t.modules.forEach((m) => (m.unlocked = false));
    }
  }
  return result;
}

/** Flat lookup: module id → its progress and track */
export function indexModules(tracks: TrackProgress[]) {
  const map = new Map<string, { module: ModuleProgress; track: TrackProgress }>();
  for (const track of tracks) for (const m of track.modules) map.set(m.id, { module: m, track });
  return map;
}
