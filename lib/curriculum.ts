export type CurriculumPhaseKey = "foundation" | "intermediate" | "advanced" | "applied";

const curriculumPhases: Array<{
  key: CurriculumPhaseKey;
  label: string;
  phase: string;
  modules: string;
  weeks: string;
}> = [
  {
    key: "foundation",
    label: "Foundation",
    phase: "Phase 1",
    modules: "Modules 1-3",
    weeks: "Week 1",
  },
  {
    key: "intermediate",
    label: "Intermediate",
    phase: "Phase 2",
    modules: "Modules 4-7",
    weeks: "Week 2",
  },
  {
    key: "advanced",
    label: "Advanced Python",
    phase: "Phase 3",
    modules: "Modules 8-10",
    weeks: "Week 3",
  },
  {
    key: "applied",
    label: "Applied Python",
    phase: "Phase 4",
    modules: "Modules 11-16",
    weeks: "Week 4",
  },
];

function normalizePhaseValue(phase: string): CurriculumPhaseKey | null {
  const value = phase.trim().toLowerCase();
  if (value === "1" || value.includes("foundation")) return "foundation";
  if (value === "2" || value.includes("intermediate")) return "intermediate";
  if (value === "3" || value.includes("advanced")) return "advanced";
  if (value === "4" || value.includes("applied")) return "applied";
  return null;
}

export function getCurriculumPhaseKey(phase: string): CurriculumPhaseKey | null {
  return normalizePhaseValue(phase);
}

export function getCurriculumPhaseLabel(phase: string): string {
  const key = normalizePhaseValue(phase);
  if (!key) return phase.trim() || "Unknown";

  const phaseEntry = curriculumPhases.find((item) => item.key === key);
  return phaseEntry?.label ?? (phase.trim() || "Unknown");
}

export function getCurriculumPhaseOrder(phase: string): number {
  const key = normalizePhaseValue(phase);
  if (!key) {
    const parsed = Number.parseInt(phase, 10);
    return Number.isNaN(parsed) ? 99 : parsed;
  }

  const phaseEntry = curriculumPhases.find((item) => item.key === key);
  return phaseEntry ? Number.parseInt(phaseEntry.phase.replace("Phase ", ""), 10) : 99;
}

export function getCurriculumPhases() {
  return curriculumPhases;
}
