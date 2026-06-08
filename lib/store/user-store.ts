import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * User state store
 * Manages authenticated user data and preferences
 */

interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  xp: number;
  level: number;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  updateXP: (xp: number) => void;
  updateLevel: (level: number) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      updateXP: (xp) =>
        set((state) => ({
          user: state.user ? { ...state.user, xp } : null,
        })),

      updateLevel: (level) =>
        set((state) => ({
          user: state.user ? { ...state.user, level } : null,
        })),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "user-storage",
      // Only persist user info, not sensitive data
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
