import { db } from '../db/client.js';
import { conversations } from '../db/schema.js';
import type { LanguageCode } from '../safety/escalationFilter.js';
import type { SessionMessage } from './contextWindowManager.js';


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Session {
  history: SessionMessage[];
  sessionType: 'chat' | 'voice' | 'exercise';
  language: LanguageCode;
  startedAt: number;   // Unix ms
  lastActivity: number;
  turnCount: number;
  summary?: string;
  hadEscalation: boolean;
  moodBefore?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION MANAGER
// In-memory store for active sessions with TTL-based auto-cleanup.
// On session end, conversation metadata is persisted to Neon DB.
// Raw transcripts are NEVER persisted.
// ─────────────────────────────────────────────────────────────────────────────

const activeSessions = new Map<string, Session>();
const SESSION_TTL_MS =
  parseInt(process.env.SESSION_TTL_MINUTES ?? '30', 10) * 60 * 1000;

class SessionManager {
  /**
   * Builds the composite cache key: userId + sessionId.
   */
  private buildKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }

  /**
   * Retrieves an active session by userId + sessionId.
   * Returns a fresh default session if none exists.
   */
  get(userId: string, sessionId: string): Session {
    const key = this.buildKey(userId, sessionId);
    const existing = activeSessions.get(key);
    if (existing) return existing;

    const session: Session = {
      history: [],
      sessionType: 'chat',
      language: 'am',
      startedAt: Date.now(),
      lastActivity: Date.now(),
      turnCount: 0,
      hadEscalation: false,
    };
    return session;
  }

  /**
   * Saves (or updates) an in-memory session and schedules TTL cleanup.
   */
  save(userId: string, sessionId: string, session: Session): void {
    const key = this.buildKey(userId, sessionId);
    session.lastActivity = Date.now();
    activeSessions.set(key, session);

    // Schedule auto-cleanup after TTL. If updated, the old timeout fires and
    // finds the key gone (or with a newer lastActivity — future enhancement).
    setTimeout(() => {
      const stored = activeSessions.get(key);
      if (stored && Date.now() - stored.lastActivity >= SESSION_TTL_MS) {
        activeSessions.delete(key);
      }
    }, SESSION_TTL_MS);
  }

  /**
   * Ends a session: persists conversation metadata to Neon and removes the
   * in-memory entry. Raw history is NOT written to the database.
   */
  async end(userId: string, sessionId: string): Promise<void> {
    const key = this.buildKey(userId, sessionId);
    const session = activeSessions.get(key);
    if (!session) return;

    const durationSeconds = Math.floor(
      (Date.now() - session.startedAt) / 1000
    );

    await db.insert(conversations).values({
      userId,
      sessionType: session.sessionType,
      language: session.language,
      turnCount: session.turnCount,
      durationSeconds,
      summary: session.summary ?? null,
      moodBefore: session.moodBefore ?? null,
      hadEscalation: session.hadEscalation,
      startedAt: new Date(session.startedAt),
      endedAt: new Date(),
    });

    activeSessions.delete(key);
  }

  /**
   * Returns the number of currently active in-memory sessions.
   * Useful for health-check endpoints.
   */
  getActiveCount(): number {
    return activeSessions.size;
  }
}

export const sessionManager = new SessionManager();
