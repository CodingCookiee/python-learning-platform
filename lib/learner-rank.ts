import { AUTOMATION_TRACK, getCurriculumState, PYTHON_TRACK, type TrackProgress } from "@/lib/curriculum-state";
import { rankFor, TOTAL_PYTHON_MODULES, type Rank } from "@/lib/ranks";

export interface LearnerRank extends Rank {
  modulesPassed: number;
  /** The module whose grading earns the next stripe or dan (null when nothing is left) */
  nextModule: {
    id: string;
    order: number;
    title: string;
    lessonsDone: number;
    lessonsTotal: number;
  } | null;
}

/**
 * A learner's current rank: Python modules passed in order give kyu grades and
 * the black belt; each automation module passed after that adds a dan.
 */
export function rankFromTracks(tracks: TrackProgress[]): LearnerRank {
  const python = tracks.find((t) => t.slug === PYTHON_TRACK);
  const automation = tracks.find((t) => t.slug === AUTOMATION_TRACK);
  const pythonPassed = python?.modulesPassed ?? 0;
  const base = rankFor(pythonPassed);

  const nextOf = (t: TrackProgress | undefined) => {
    const next = t?.modules.find((m) => !m.passed && m.unlocked) ?? null;
    return next
      ? { id: next.id, order: next.order, title: next.title, lessonsDone: next.lessonsDone, lessonsTotal: next.lessonsTotal }
      : null;
  };

  if (pythonPassed >= TOTAL_PYTHON_MODULES) {
    const dans = automation?.modulesPassed ?? 0;
    const dan = 1 + dans;
    const suffix = dan === 1 ? "st" : dan === 2 ? "nd" : dan === 3 ? "rd" : "th";
    return {
      ...base,
      label: `${dan}${suffix} dan`,
      numeral: String(dan),
      modulesPassed: pythonPassed + dans,
      nextModule: nextOf(automation),
    };
  }
  return { ...base, modulesPassed: pythonPassed, nextModule: nextOf(python) };
}

export async function getLearnerRank(userId: string): Promise<LearnerRank> {
  return rankFromTracks(await getCurriculumState(userId));
}
