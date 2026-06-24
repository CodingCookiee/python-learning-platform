const moduleDurationOverrides: Record<string, number> = {
  "Object-Oriented Programming": 8,
  "Advanced Python Features": 9,
  "Web Development": 12,
  "Web Development with Flask/FastAPI": 12,
};

export function getModuleDisplayDuration(moduleTitle: string, fallback: number): number {
  return moduleDurationOverrides[moduleTitle] ?? fallback;
}
