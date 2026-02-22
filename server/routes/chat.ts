import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/authenticate.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import {
  validateChatBody,
  validateSessionEndBody,
} from '../middleware/validateInput.js';
import { escalationFilter } from '../safety/escalationFilter.js';
import {
  buildConversationHistory,
} from '../utils/promptBuilder.js';
import { contextWindowManager } from '../utils/contextWindowManager.js';
import { sessionManager } from '../utils/sessionManager.js';
import { addisAiClient } from '../utils/addisAiClient.js';
import type { LanguageCode } from '../safety/escalationFilter.js';


const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
// Full text-based AI conversation pipeline:
//   1. Escalation filter (tiers 1+2 → return crisis response, skip AI)
//   2. Session retrieval + context window trim
//   3. System prompt injection
//   4. Addis AI chat call
//   5. Session history update + rolling summary check
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  rateLimiter,
  validateChatBody,
  async (req, res) => {
    const { message, session_id, language } = req.body as {
      message: string;
      session_id: string;
      language: LanguageCode;
    };
    const userId = req.user.id;

    try {
      // ── STEP 1: Escalation filter — always runs first ─────────────────────
      const escalation = escalationFilter.check(message, language);

      if (escalation.triggered && (escalation.tier ?? 0) <= 2) {
        // Log the event non-blocking
        escalationFilter
          .logEvent(userId, session_id, message, escalation.tier!, language)
          .catch((err) =>
            console.error('[chat] Escalation log failed:', err)
          );

        res.status(200).json({
          escalation: true,
          tier: escalation.tier,
          response_text: escalation.message,
          should_disable_input: escalation.tier === 1,
        });
        return;
      }

      // ── STEP 2: Retrieve session + trim context window ────────────────────
      const session = sessionManager.get(userId, session_id);
      // Ensure session language is set on first message
      if (!session.turnCount) {
        session.language = language;
        session.sessionType = 'chat';
      }

      let trimmedHistory = contextWindowManager.trim(
        session.history
      );


      // ── STEP 3: Inject Tier-3 gentle check-in instruction if needed ───────
      if (escalation.tier === 3 && escalation.additionalInstruction) {
        trimmedHistory = [
          ...trimmedHistory,
          { role: 'system', content: escalation.additionalInstruction },
        ];
      }

      // ── STEP 4: Build full conversation history with system prompt ─────────
      const fullHistory = buildConversationHistory(language, trimmedHistory);

      // ── STEP 5: Call Addis AI ──────────────────────────────────────────────
      const aiResponse = await addisAiClient.chat({
        prompt: message,
        target_language: language,
        conversation_history: fullHistory,
        generation_config: { temperature: 0.6 },
      });

      const aiText = aiResponse.response_text;

      // ── STEP 6: Update in-memory session history ───────────────────────────
      session.history.push(
        { role: 'user', content: message },
        { role: 'assistant', content: aiText }
      );
      session.turnCount += 1;
      if (escalation.tier === 1 || escalation.tier === 2) {
        session.hadEscalation = true;
      }

      // ── STEP 7: Trigger rolling summary if threshold reached ───────────────
      if (
        contextWindowManager.shouldSummarize(session.history)
      ) {
        contextWindowManager
          .generateSummary(
            // generateSummary only needs actual conversation turns
            session.history.filter(
              (m) => m.role === 'user' || m.role === 'assistant'
            ) as import('../utils/promptBuilder.js').ConversationMessage[],
            language
          )
          .then((summary) => {
            session.summary = summary.content;
            // Prepend the summary and keep only the most recent turns
            session.history = [summary, ...session.history.slice(-12)];
            sessionManager.save(userId, session_id, session);
          })
          .catch((err) =>
            console.error('[chat] Rolling summary failed:', err)
          );

      } else {
        sessionManager.save(userId, session_id, session);
      }

      res.status(200).json({
        response_text: aiText,
        session_id,
        turn_count: session.turnCount,
        usage: aiResponse.usage_metadata,
      });
    } catch (error) {
      console.error('[chat] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/end
// Ends the active session and persists conversation metadata to Neon DB.
// No raw transcripts are stored.
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/end',
  authenticate,
  validateSessionEndBody,
  async (req, res) => {
    const { session_id, mood_after } = req.body as {
      session_id: string;
      mood_after?: number;
    };
    const userId = req.user.id;

    try {
      // Update moodAfter if provided before ending (validated client-side)
      const session = sessionManager.get(userId, session_id);
      if (
        mood_after &&
        Number.isInteger(Number(mood_after)) &&
        Number(mood_after) >= 1 &&
        Number(mood_after) <= 5
      ) {
        // Temporarily write to session object before persisting
        (session as unknown as Record<string, unknown>).moodAfter =
          Number(mood_after);
        sessionManager.save(userId, session_id, session);
      }

      await sessionManager.end(userId, session_id);

      res.status(200).json({ ended: true, session_id });
    } catch (error) {
      console.error('[chat/end] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
