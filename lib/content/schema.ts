import { z } from "zod";

/**
 * Schemas for the files in content/ (see docs/CONTENT.md). Shared by the
 * loader, `content:validate` and `content:sync`.
 */

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slugs are lowercase kebab-case, e.g. names-and-objects");

const text = z.string().trim().min(1);

export const trackSchema = z.object({
  slug,
  title: text,
  summary: text,
  grade: z.enum(["kyu", "dan"]),
  order: z.number().int().min(1),
});

export const moduleSchema = z.object({
  slug,
  title: text,
  summary: text,
  description: text,
  hours: z.number().positive(),
  outcomes: z.array(text).min(1),
  /** The module's checkpoint (exam). By default it draws from the core and stretch drills. */
  checkpoint: z
    .object({
      pick: z.number().int().min(1).max(20).default(6),
      pass_mark: z.number().min(0.5).max(1).default(0.8),
      /** Drill slugs to draw from instead of the default pool */
      pool: z.array(slug).default([]),
    })
    .default({ pick: 6, pass_mark: 0.8, pool: [] }),
});

/**
 * A lesson's local lab, and how the platform confirms it was done:
 * - webhook: the learner's workflow or script POSTs JSON to their personal lab URL
 * - url: the platform fetches a URL the learner deployed (https, public hosts only)
 * - output: the learner pastes a command's output, matched against patterns
 * `expect` lists JSON fields (dot paths) the webhook body or url response must contain.
 */
export const labSpecSchema = z
  .object({
    title: text,
    kind: z.enum(["webhook", "url", "output"]),
    /** One or two sentences: what to send, deploy or run for the check */
    instructions: text,
    expect: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
    /** url: appended to the learner's base URL, e.g. /health */
    path: z.string().startsWith("/").optional(),
    /** url: text the response body must contain */
    contains: z.string().optional(),
    /** output: regular expressions that must all match the pasted output */
    patterns: z.array(z.string()).default([]),
    /** output: the command to run, shown to the learner */
    command: z.string().optional(),
  })
  .superRefine((lab, ctx) => {
    if (lab.kind === "output" && lab.patterns.length === 0) ctx.addIssue({ code: "custom", message: "output labs need patterns" });
    if (lab.kind === "url" && !lab.path) ctx.addIssue({ code: "custom", message: "url labs need a path" });
    if (lab.kind === "webhook" && Object.keys(lab.expect).length === 0) {
      ctx.addIssue({ code: "custom", message: "webhook labs need expect fields" });
    }
    for (const p of lab.patterns) {
      try {
        new RegExp(p);
      } catch {
        ctx.addIssue({ code: "custom", message: `pattern isn't a valid regular expression: ${p}` });
      }
    }
  });

export type LabSpec = z.infer<typeof labSpecSchema>;

export const lessonFrontmatterSchema = z.object({
  slug,
  title: text,
  summary: text,
  minutes: z.number().int().positive(),
  exercises: z.array(slug).default([]),
  optional: z.array(slug).default([]),
  lab: labSpecSchema.optional(),
});

export const EXERCISE_TYPES = ["function", "program", "predict", "fix", "refactor", "tests"] as const;

/** Types whose learner code is a script or a test file, so it isn't imported as a module */
export const NOT_IMPORTED_TYPES: ReadonlySet<string> = new Set(["program", "tests"]);
export const DIFFICULTIES = ["warm-up", "core", "stretch"] as const;
export const DEFAULT_XP: Record<(typeof DIFFICULTIES)[number], number> = {
  "warm-up": 10,
  core: 20,
  stretch: 30,
};

export const exerciseSchema = z.object({
  title: text,
  type: z.enum(EXERCISE_TYPES),
  difficulty: z.enum(DIFFICULTIES),
  xp: z.number().int().positive().optional(),
  tags: z.array(text).default([]),
  packages: z.array(text).default([]),
  timeout: z.number().positive().max(30).default(5),
  /** The learner's code is a script: tests run it with run_program() instead of importing it.
   *  Always true for program and tests drills; set it for script-style fix/refactor drills. */
  script: z.boolean().optional(),
  hints: z.array(text).default([]),
  /**
   * Multi-file drills: the learner's other files, shown as tabs next to the main one.
   * Starter content lives in files/<path>; the solution's version of an editable file
   * in solution-files/<path> (omit it when the solution leaves the file as it is).
   * editable: false marks a given file (a data file, a helper) the learner reads but
   * doesn't change.
   */
  files: z
    .array(
      z.object({
        path: z
          .string()
          .regex(/^[A-Za-z0-9_][\w.-]*(\/[A-Za-z0-9_][\w.-]*)*$/, "use a relative path like utils.py or pkg/mod.py"),
        editable: z.boolean().default(true),
      })
    )
    .default([]),
  /** The main file's tab name (starter.py / solution.py); defaults to main.py when there are files */
  main_file: z.string().regex(/^[\w.-]+\.py$/).optional(),
});

export const capstoneSchema = z.object({
  slug,
  title: text,
  summary: text,
  hours: z.number().positive(),
  xp: z.number().int().positive().default(150),
  requirements: z.array(text).min(1),
  criteria: z.array(text).min(1),
});

export const quizSchema = z
  .object({
    question: text,
    options: z.array(z.union([z.string(), z.number()]).transform(String)).min(2).max(6),
    answer: z.number().int().min(0),
    explain: text,
  })
  .refine((q) => q.answer < q.options.length, { message: "answer is past the last option" });

/** What earns an achievement. Evaluated by lib/achievements.ts. */
export const achievementCriteriaSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("lessons"), count: z.number().int().positive() }),
  z.object({ kind: z.literal("drills"), count: z.number().int().positive() }),
  /** Every listed module passed (a belt, a track, or one module) */
  z.object({ kind: z.literal("modules"), modules: z.array(slug).min(1) }),
  z.object({ kind: z.literal("capstone"), module: slug }),
  /** The black belt earned: every Python checkpoint, advanced topics at 80%, three capstones (lib/black-belt.ts) */
  z.object({ kind: z.literal("black-belt") }),
  z.object({ kind: z.literal("streak"), days: z.number().int().positive() }),
  z.object({ kind: z.literal("xp"), amount: z.number().int().positive() }),
]);

export const achievementSchema = z.object({
  slug,
  name: text,
  description: text,
  /** A key from lib/achievement-icon.tsx */
  icon: text,
  category: z.enum(["Learning", "Belts", "Modules", "Capstones", "Streaks", "Experience"]),
  tier: z.enum(["bronze", "silver", "gold", "platinum", "legendary"]),
  xp: z.number().int().min(0).default(0),
  criteria: achievementCriteriaSchema,
});

export type AchievementCriteria = z.infer<typeof achievementCriteriaSchema>;
export type ContentAchievement = z.infer<typeof achievementSchema>;

export type TrackMeta = z.infer<typeof trackSchema>;
export type ModuleMeta = z.infer<typeof moduleSchema>;
export type LessonMeta = z.infer<typeof lessonFrontmatterSchema>;
export type ExerciseMeta = z.infer<typeof exerciseSchema>;
export type CapstoneMeta = z.infer<typeof capstoneSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export interface ContentExercise extends ExerciseMeta {
  slug: string;
  /** Path relative to the repo, for error messages */
  path: string;
  prompt: string;
  starter: string;
  solution: string;
  tests: string;
  xpReward: number;
  /** False when the code is run as a script rather than imported (see `script`) */
  importSolution: boolean;
  /** The main file's name: solution.py for single-file drills */
  mainFile: string;
  /** Multi-file drills' other files, with their starter and solution content */
  extraFiles: Array<{ path: string; editable: boolean; starter: string; solution: string }>;
}

export interface ContentLesson extends LessonMeta {
  order: number;
  path: string;
  body: string;
}

export interface ContentCapstone extends CapstoneMeta {
  path: string;
  brief: string;
  starter: string | null;
}

export interface ContentModule extends ModuleMeta {
  order: number;
  path: string;
  lessons: ContentLesson[];
  exercises: Map<string, ContentExercise>;
  capstone: ContentCapstone | null;
}

export interface ContentTrack extends TrackMeta {
  path: string;
  modules: ContentModule[];
}

export interface ContentIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}
