/**
 * The roadmap's weekly check-in (AI_Automation_Roadmap, section 07), as text to
 * paste into a chat with Claude or a mentor. Pure, so the log page can build it
 * in the browser.
 */

export interface CheckInFields {
  phase: string;
  week: number;
  hours: number;
  built: string;
  learned: string;
  stuck: string;
  nextGoal: string;
  question: string;
}

const oneLine = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("; ");

export function formatCheckIn(c: CheckInFields): string {
  const lines = [
    "ROADMAP CHECK-IN",
    `Phase: ${c.phase}        Week: ${c.week}`,
    `Hours this week: ${c.hours}`,
    `Built/finished: ${oneLine(c.built) || "nothing finished yet"}`,
    `Learned: ${oneLine(c.learned) || "-"}`,
    `Stuck on: ${oneLine(c.stuck) || "nothing"}`,
    `Next week's goal: ${oneLine(c.nextGoal) || "-"}`,
  ];
  if (c.question.trim()) lines.push(`Question for Claude: ${oneLine(c.question)}`);
  return lines.join("\n");
}
