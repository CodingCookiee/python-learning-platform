/**
 * Multi-file drills: a main file (starter.py / solution.py, shown under its own
 * name) plus other files the code imports or reads. Pure helpers shared by the
 * drill page, the submit route, drafts and server grading.
 */

export interface DrillFileDef {
  path: string;
  editable: boolean;
  starter: string;
  solution: string;
}

export function parseDrillFiles(value: unknown): DrillFileDef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) =>
    f && typeof f === "object" && typeof f.path === "string" && typeof f.starter === "string"
      ? [
          {
            path: f.path,
            editable: f.editable !== false,
            starter: f.starter,
            solution: typeof f.solution === "string" ? f.solution : f.starter,
          },
        ]
      : []
  );
}

/**
 * The files a run sees: an editable file as the learner has it (or its starter),
 * a read-only one always as the drill defines it, whatever the browser sent.
 */
export function filesForRun(defs: DrillFileDef[], learner: Record<string, string> = {}): Record<string, string> | undefined {
  if (defs.length === 0) return undefined;
  return Object.fromEntries(
    defs.map((d) => [d.path, d.editable && typeof learner[d.path] === "string" ? learner[d.path]! : d.starter])
  );
}

/** One text with every file under a header: how a multi-file attempt is stored and shown to the tutor */
export function combinedSource(mainFile: string, main: string, files: Record<string, string> | undefined): string {
  if (!files || Object.keys(files).length === 0) return main;
  return [`# ==== ${mainFile} ====`, main.trimEnd(), ...Object.entries(files).flatMap(([p, s]) => ["", `# ==== ${p} ====`, s.trimEnd()])].join("\n") + "\n";
}

/** Drafts of multi-file drills are stored as JSON in DrillDraft.code */
export interface MultiDraft {
  main: string;
  files: Record<string, string>;
}

const DRAFT_MARK = '{"__multi":';

export function encodeDraft(main: string, files?: Record<string, string>): string {
  return files && Object.keys(files).length > 0 ? JSON.stringify({ __multi: 1, main, files }) : main;
}

export function decodeDraft(code: string): MultiDraft | null {
  if (!code.startsWith(DRAFT_MARK)) return null;
  try {
    const v = JSON.parse(code) as { main?: unknown; files?: unknown };
    if (typeof v.main !== "string" || !v.files || typeof v.files !== "object") return null;
    return { main: v.main, files: v.files as Record<string, string> };
  } catch {
    return null;
  }
}
