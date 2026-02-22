import { create } from 'zustand';
import type { Language } from './useUserStore';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isEscalation?: boolean;
  escalationTier?: number;
  shouldDisableInput?: boolean;
  timestamp: number;
}

interface SessionStoreState {
  sessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isInputDisabled: boolean;
  language: Language;

  // Actions
  initSession: (sessionId: string, language: Language) => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (isLoading: boolean) => void;
  disableInput: () => void;
  clearSession: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStoreState>((set) => ({
  sessionId: null,
  messages: [],
  isLoading: false,
  isInputDisabled: false,
  language: 'am',

  initSession: (sessionId, language) =>
    set({
      sessionId,
      language,
      messages: [],
      isLoading: false,
      isInputDisabled: false,
    }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setLoading: (isLoading) => set({ isLoading }),

  disableInput: () => set({ isInputDisabled: true }),

  clearSession: () =>
    set({
      sessionId: null,
      messages: [],
      isLoading: false,
      isInputDisabled: false,
    }),
}));
