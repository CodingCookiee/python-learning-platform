import { prisma } from "@/lib/prisma";

/**
 * The single source of truth for "where is this learner": every live track and
 * module, with lesson progress, passed state and unlocking. Syllabus, rank,
 * module pages and the progress APIs all derive from this.
 *
 * Rules
 * - A module is passed when every lesson in it is complete (checkpoints will
 *   join this rule in M2).
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
  projectsTotal: number;
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
  const [tracks, completed] = await Promise.all([
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
            lessons: { where: { archivedAt: null }, select: { id: true } },
            _count: { select: { projects: { where: { archivedAt: null } } } },
          },
        },
      },
    }),
    userId
      ? prisma.progress.findMany({ where: { userId, completed: true }, select: { lessonId: true } })
      : Promise.resolve([]),
  ]);

  const done = new Set(completed.map((p) => p.lessonId));
  const result: TrackProgress[] = tracks.map((t) => {
    let priorPassed = true;
    let modulesPassed = 0;
    const modules = t.modules.map((m) => {
      const lessonIds = m.lessons.map((l) => l.id);
      const lessonsDone = lessonIds.filter((id) => done.has(id)).length;
      const passed = lessonIds.length > 0 && lessonsDone === lessonIds.length;
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
        projectsTotal: m._count.projects,
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
  for (const track of tracks) for (const module of track.modules) map.set(module.id, { module, track });
  return map;
}
