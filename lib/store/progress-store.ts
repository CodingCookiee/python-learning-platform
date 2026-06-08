import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Progress state store
 * Tracks user's learning progress, streaks, and achievements
 */

interface ModuleProgress {
  moduleId: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  tier: string;
}

interface ProgressState {
  // Lessons
  completedLessons: Set<string>;
  currentLesson: string | null;
  markLessonComplete: (lessonId: string) => void;
  setCurrentLesson: (lessonId: string | null) => void;

  // Modules
  moduleProgress: Record<string, ModuleProgress>;
  updateModuleProgress: (moduleId: string, completed: number, total: number) => void;

  // Streak
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  updateStreak: (current: number, longest: number, lastDate: Date) => void;

  // Achievements
  achievements: Achievement[];
  addAchievement: (achievement: Achievement) => void;

  // Stats
  totalXP: number;
  totalExercises: number;
  totalProjects: number;
  updateStats: (xp: number, exercises: number, projects: number) => void;

  // Reset
  reset: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      // Lessons
      completedLessons: new Set<string>(),
      currentLesson: null,
      markLessonComplete: (lessonId) =>
        set((state) => ({
          completedLessons: new Set([...state.completedLessons, lessonId]),
        })),
      setCurrentLesson: (lessonId) =>
        set({
          currentLesson: lessonId,
        }),

      // Modules
      moduleProgress: {},
      updateModuleProgress: (moduleId, completed, total) =>
        set((state) => ({
          moduleProgress: {
            ...state.moduleProgress,
            [moduleId]: {
              moduleId,
              completedLessons: completed,
              totalLessons: total,
              percentage: Math.round((completed / total) * 100),
            },
          },
        })),

      // Streak
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      updateStreak: (current, longest, lastDate) =>
        set({
          currentStreak: current,
          longestStreak: longest,
          lastActivityDate: lastDate,
        }),

      // Achievements
      achievements: [],
      addAchievement: (achievement) =>
        set((state) => ({
          achievements: [...state.achievements, achievement],
        })),

      // Stats
      totalXP: 0,
      totalExercises: 0,
      totalProjects: 0,
      updateStats: (xp, exercises, projects) =>
        set({
          totalXP: xp,
          totalExercises: exercises,
          totalProjects: projects,
        }),

      // Reset
      reset: () =>
        set({
          completedLessons: new Set(),
          currentLesson: null,
          moduleProgress: {},
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          achievements: [],
          totalXP: 0,
          totalExercises: 0,
          totalProjects: 0,
        }),
    }),
    {
      name: "progress-storage",
      // Custom serialization for Set
      partialize: (state) => ({
        ...state,
        completedLessons: Array.from(state.completedLessons),
      }),
      // Custom deserialization for Set
      merge: (persistedState: unknown, currentState: ProgressState) => ({
        ...currentState,
        ...(persistedState as Partial<ProgressState>),
        completedLessons: new Set((persistedState as ProgressState)?.completedLessons || []),
      }),
    }
  )
);
