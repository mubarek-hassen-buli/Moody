import { Router } from 'express';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { moodLogs } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateMoodBody } from '../middleware/validateInput.js';
import type { LanguageCode } from '../safety/escalationFilter.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mood
// Logs a mood check-in for the authenticated user.
// If 3 consecutive low mood scores (<=2) are detected, returns a gentle nudge.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', authenticate, validateMoodBody, async (req, res) => {
  const { mood_score, emotion_tags, note, language } = req.body as {
    mood_score: number;
    emotion_tags?: string[];
    note?: string;
    language: LanguageCode;
  };
  const userId = req.user.id;

  try {
    // Enforce note max-length server-side
    const truncatedNote = note ? note.slice(0, 500) : undefined;

    const [newLog] = await db
      .insert(moodLogs)
      .values({
        userId,
        moodScore: mood_score,
        emotionTags: emotion_tags ?? [],
        note: truncatedNote,
        language,
      })
      .returning();

    // ── Pattern detection: 3 consecutive low moods (<=2) ─────────────────
    const recentLogs = await db
      .select({ moodScore: moodLogs.moodScore })
      .from(moodLogs)
      .where(eq(moodLogs.userId, userId))
      .orderBy(desc(moodLogs.loggedAt))
      .limit(3);

    const gentleNudge =
      recentLogs.length === 3 &&
      recentLogs.every((log) => log.moodScore <= 2);

    res.status(201).json({
      log: newLog,
      gentle_nudge: gentleNudge,
    });
  } catch (error) {
    console.error('[mood/log] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mood/history
// Returns the last 30 days of mood logs for the authenticated user.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/history', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await db
      .select()
      .from(moodLogs)
      .where(
        and(
          eq(moodLogs.userId, userId),
          gte(moodLogs.loggedAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(moodLogs.loggedAt));

    res.status(200).json({ logs });
  } catch (error) {
    console.error('[mood/history] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mood/stats
// Returns weekly average mood score and trend for the authenticated user.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/stats', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Current week
    const currentWeekLogs = await db
      .select({ moodScore: moodLogs.moodScore })
      .from(moodLogs)
      .where(
        and(
          eq(moodLogs.userId, userId),
          gte(moodLogs.loggedAt, sevenDaysAgo)
        )
      );

    // Previous week (for trend)
    const previousWeekLogs = await db
      .select({ moodScore: moodLogs.moodScore })
      .from(moodLogs)
      .where(
        and(
          eq(moodLogs.userId, userId),
          gte(moodLogs.loggedAt, fourteenDaysAgo),
          sql`${moodLogs.loggedAt} < ${sevenDaysAgo}`
        )
      );

    const average = (logs: { moodScore: number }[]) =>
      logs.length === 0
        ? null
        : parseFloat(
            (logs.reduce((sum, l) => sum + l.moodScore, 0) / logs.length).toFixed(1)
          );

    const currentAvg = average(currentWeekLogs);
    const previousAvg = average(previousWeekLogs);

    // Trend: 'up' | 'down' | 'stable' | null
    let trend: 'up' | 'down' | 'stable' | null = null;
    if (currentAvg !== null && previousAvg !== null) {
      const diff = currentAvg - previousAvg;
      if (diff > 0.3) trend = 'up';
      else if (diff < -0.3) trend = 'down';
      else trend = 'stable';
    }

    res.status(200).json({
      current_week_average: currentAvg,
      previous_week_average: previousAvg,
      trend,
      total_logs_this_week: currentWeekLogs.length,
    });
  } catch (error) {
    console.error('[mood/stats] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
