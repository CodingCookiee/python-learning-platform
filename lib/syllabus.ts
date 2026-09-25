import { getCurriculumState, PYTHON_TRACK, type TrackProgress } from "@/lib/curriculum-state";

export type ModuleState = "passed" | "current" | "open" | "locked";

export interface SyllabusModule {
  id: string;
  order: number;
  title: string;
  description: string;
  duration: number;
  lessonsTotal: number;
  lessonsDone: number;
  projectsTotal: number;
  state: ModuleState;
}

/** A track's modules as syllabus rows. "current" is the first unlocked module not yet passed. */
export function toSyllabus(track: TrackProgress): SyllabusModule[] {
  let currentAssigned = false;
  return track.modules.map((m) => {
    let state: ModuleState;
    if (!m.unlocked) state = "locked";
    else if (m.passed) state = "passed";
    else if (!currentAssigned) {
      state = "current";
      currentAssigned = true;
    } else state = "open";
    return {
      id: m.id,
      order: m.order,
      title: m.title,
      description: m.summary || m.description,
      duration: m.duration,
      lessonsTotal: m.lessonsTotal,
      lessonsDone: m.lessonsDone,
      projectsTotal: m.projectsTotal,
      state,
    };
  });
}

/** The Python track's modules with the learner's progress, in syllabus order. */
export async function getSyllabusProgress(userId: string): Promise<SyllabusModule[]> {
  const tracks = await getCurriculumState(userId);
  const python = tracks.find((t) => t.slug === PYTHON_TRACK);
  return python ? toSyllabus(python) : [];
}
