import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type Language = 'am' | 'om';

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  preferredLanguage: Language;
  onboardingComplete: boolean;
}

interface UserStoreState {
  user: AppUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setSession: (user: AppUser, accessToken: string) => void;
  setLanguage: (language: Language) => void;
  setOnboardingComplete: () => void;
  clearSession: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserStoreState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setSession: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  setLanguage: (language) =>
    set((state) => ({
      user: state.user ? { ...state.user, preferredLanguage: language } : null,
    })),

  setOnboardingComplete: () =>
    set((state) => ({
      user: state.user ? { ...state.user, onboardingComplete: true } : null,
    })),

  clearSession: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),
}));
