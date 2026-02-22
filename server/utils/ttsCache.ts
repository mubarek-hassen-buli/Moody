import type { LanguageCode } from '../safety/escalationFilter.js';

// ─────────────────────────────────────────────────────────────────────────────
// TTS IN-MEMORY CACHE
// Caches base64 audio output from Addis AI TTS.
// Same text + language always produces identical audio — safe to cache long-term.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 500; // Prevent unbounded memory growth

interface CacheEntry {
  audio: string; // base64-encoded audio
  expiresAt: number;
}

class TtsCache {
  private readonly store = new Map<string, CacheEntry>();

  /**
   * Builds a deterministic cache key from language + text.
   * Text is trimmed, lowercased, and truncated to prevent key explosion.
   */
  private buildKey(language: LanguageCode, text: string): string {
    const normalized = text.trim().toLowerCase();
    const hash = Buffer.from(normalized).toString('base64').slice(0, 64);
    return `tts:${language}:${hash}`;
  }

  /**
   * Returns the cached audio string for the given text and language,
   * or null if there is no valid (non-expired) entry.
   */
  get(language: LanguageCode, text: string): string | null {
    const key = this.buildKey(language, text);
    const entry = this.store.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.audio;
  }

  /**
   * Stores a TTS audio result. Evicts the oldest entry if the cache is full.
   */
  set(
    language: LanguageCode,
    text: string,
    audio: string,
    ttlMs = DEFAULT_TTL_MS
  ): void {
    // Evict oldest entry if at capacity
    if (this.store.size >= MAX_ENTRIES) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    const key = this.buildKey(language, text);
    this.store.set(key, {
      audio,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Returns the number of currently cached entries for monitoring.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Removes all expired entries from the cache.
   * Call this periodically (e.g., every hour) to free memory.
   */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export const ttsCache = new TtsCache();
