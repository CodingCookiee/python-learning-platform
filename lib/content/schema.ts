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
});

export const lessonFrontmatterSchema = z.object({
  slug,
  title: text,
  summary: text,
  minutes: z.number().int().positive(),
  exercises: z.array(slug).default([]),
  optional: z.array(slug).default([]),
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
  hints: z.array(text).default([]),
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
