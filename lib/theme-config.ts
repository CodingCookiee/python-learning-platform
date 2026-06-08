/**
 * Theme configuration for the Python Learning Platform
 * Fun, playful color scheme with gamification elements
 */

export const themeConfig = {
  colors: {
    primary: {
      light: "#3B82F6", // Blue for main actions
      dark: "#60A5FA",
    },
    secondary: {
      light: "#8B5CF6", // Purple for achievements
      dark: "#A78BFA",
    },
    success: {
      light: "#10B981", // Green for completed tasks
      dark: "#34D399",
    },
    warning: {
      light: "#F59E0B", // Amber for hints
      dark: "#FBBF24",
    },
    danger: {
      light: "#EF4444", // Red for errors
      dark: "#F87171",
    },
    accent: {
      light: "#EC4899", // Pink for fun elements
      dark: "#F472B6",
    },
  },
  animations: {
    celebration: {
      confetti: true,
      soundEffects: false, // Can be enabled later
    },
    transitions: {
      duration: "300ms",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
  gamification: {
    achievements: {
      colors: {
        bronze: "#CD7F32",
        silver: "#C0C0C0",
        gold: "#FFD700",
        platinum: "#E5E4E2",
      },
    },
    streak: {
      fireEmoji: "🔥",
      milestones: [7, 30, 100, 365],
    },
    xp: {
      lesson: 10,
      exercise: 25,
      project: 100,
      levelThreshold: 100, // XP needed per level
    },
  },
};

export type ThemeConfig = typeof themeConfig;
