import { create } from "zustand";

/**
 * UI state store
 * Manages UI-related state like modals, sidebars, notifications
 */

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Mobile menu
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;

  // Modals
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Loading states
  isLoading: boolean;
  loadingMessage: string | null;
  setLoading: (loading: boolean, message?: string) => void;

  // Achievement celebration
  celebrationQueue: Array<{
    type: "achievement" | "milestone" | "levelup";
    data: Record<string, unknown>;
  }>;
  addCelebration: (
    type: "achievement" | "milestone" | "levelup",
    data: Record<string, unknown>
  ) => void;
  removeCelebration: () => void;

  // Code editor
  codeEditorTheme: "light" | "dark" | "vs-dark";
  setCodeEditorTheme: (theme: "light" | "dark" | "vs-dark") => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  // Mobile menu
  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

  // Modals
  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  // Notifications
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id: Date.now().toString() }],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),

  // Loading states
  isLoading: false,
  loadingMessage: null,
  setLoading: (loading, message) => set({ isLoading: loading, loadingMessage: message || null }),

  // Achievement celebration
  celebrationQueue: [],
  addCelebration: (type: "achievement" | "milestone" | "levelup", data: Record<string, unknown>) =>
    set((state) => ({
      celebrationQueue: [...state.celebrationQueue, { type, data }],
    })),
  removeCelebration: () =>
    set((state) => ({
      celebrationQueue: state.celebrationQueue.slice(1),
    })),

  // Code editor
  codeEditorTheme: "vs-dark",
  setCodeEditorTheme: (theme) => set({ codeEditorTheme: theme }),
}));
