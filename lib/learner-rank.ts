import { AUTOMATION_TRACK, getCurriculumState, PYTHON_TRACK, type TrackProgress } from "@/lib/curriculum-state";
import { rankFor, TOTAL_PYTHON_MODULES, type Rank } from "@/lib/ranks";
import { blackBeltIfDue, type BlackBeltStatus } from "@/lib/black-belt";

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
  /** Every Python module passed but the black belt's other requirements aren't met yet */
  blackBeltPending: BlackBeltStatus | null;
}

/**
 * A learner's current rank: Python modules passed in order give kyu grades; the
 * black belt also needs the advanced-confident requirements (lib/black-belt.ts),
 * so pass `blackBelt` once every Python module is passed. Each automation module
 * passed after the black belt adds a dan.
 */
export function rankFromTracks(tracks: TrackProgress[], blackBelt: BlackBeltStatus | null = null): LearnerRank {
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

  // Last module passed, black belt not yet earned: 1 kyu with a full brown belt
  if (pythonPassed >= TOTAL_PYTHON_MODULES && blackBelt && !blackBelt.met) {
    const brown = rankFor(TOTAL_PYTHON_MODULES - 1);
    return { ...brown, stripes: brown.stripeSlots, modulesPassed: pythonPassed, nextModule: null, blackBeltPending: blackBelt };
  }

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
      blackBeltPending: null,
    };
  }
  return { ...base, modulesPassed: pythonPassed, nextModule: nextOf(python), blackBeltPending: null };
}

export async function getLearnerRank(userId: string): Promise<LearnerRank> {
  const tracks = await getCurriculumState(userId);
  return rankFromTracks(tracks, await blackBeltIfDue(userId, tracks));
}
