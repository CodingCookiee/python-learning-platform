/**
 * Whether a learner has earned a certificate, read from the curriculum state and the black belt's
 * status, with what's left said in a line. Pure, but server-side: it uses the curriculum's constants.
 */
import { AUTOMATION_TRACK, AUTOMATION_UNLOCK_AFTER, type TrackProgress } from "@/lib/curriculum-state";

/** Every module of the AI automation track passed: the 9th dan */
export function automationComplete(tracks: TrackProgress[]): boolean {
  const automation = tracks.find((t) => t.slug === AUTOMATION_TRACK);
  return Boolean(automation && automation.modules.length > 0 && automation.modulesPassed === automation.modules.length);
}

/** What's left before the automation certificate, in a line (null once it's earned) */
export function automationLeft(tracks: TrackProgress[]): string | null {
  const automation = tracks.find((t) => t.slug === AUTOMATION_TRACK);
  if (!automation || automation.modules.length === 0) return "The AI automation track isn't published yet.";
  if (!automation.unlocked) return `Opens after Python module ${AUTOMATION_UNLOCK_AFTER}.`;
  const left = automation.modules.length - automation.modulesPassed;
  if (left <= 0) return null;
  return `Pass ${left} more automation ${left === 1 ? "module" : "modules"} for the 9th dan.`;
}

/** What's left before the black belt, in a line, from its status (null once it's met) */
export function blackBeltLeft(status: {
  met: boolean;
  checkpoints: { passed: number; total: number };
  topics: unknown[];
  topicsMet: number;
  capstones: { approved: number; needed: number };
}): string | null {
  if (status.met) return null;
  const modules = status.checkpoints.total - status.checkpoints.passed;
  if (modules > 0) return `Pass ${modules} more ${modules === 1 ? "module" : "modules"} for the black belt.`;
  const topics = status.topics.length - status.topicsMet;
  if (topics > 0) return `Hold ${topics} more advanced ${topics === 1 ? "topic" : "topics"} at 80% through review.`;
  const capstones = status.capstones.needed - status.capstones.approved;
  return `Have ${capstones} more capstone ${capstones === 1 ? "project" : "projects"} approved.`;
}
