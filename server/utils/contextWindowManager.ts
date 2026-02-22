import { addisAiClient } from './addisAiClient.js';
import type { LanguageCode } from '../safety/escalationFilter.js';
import type { ConversationMessage } from './promptBuilder.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// SummaryMessage is a pseudo-message that holds a rolling summary of older
// turns. It uses the literal role 'summary' which Addis AI ignores as a
// regular history item — it is only used internally to preserve context.
// ─────────────────────────────────────────────────────────────────────────────

export interface SummaryMessage {
  role: 'summary';
  content: string;
}

/** Union of all message types that can appear in in-memory session history. */
export type SessionMessage = ConversationMessage | SummaryMessage;

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TURNS = parseInt(process.env.SESSION_MAX_TURNS ?? '10', 10);
const SUMMARY_TRIGGER = 8; // Generate rolling summary at this many turns

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT WINDOW MANAGER
// Keeps conversation history within token budget before every Addis AI call.
// ─────────────────────────────────────────────────────────────────────────────

class ContextWindowManager {
  /**
   * Trims the conversation history to fit within the MAX_TURNS budget.
   * System messages are stripped — they are re-injected fresh each turn.
   * If a rolling summary exists, it is preserved at the start.
   */
  trim(history: SessionMessage[]): ConversationMessage[] {
    // Strip system messages — they are re-injected by promptBuilder
    const withoutSystem = history.filter((m) => m.role !== 'system');

    // Separate the optional rolling summary from regular conversation turns
    const summary = withoutSystem.find(
      (m): m is SummaryMessage => m.role === 'summary'
    );
    const conversationOnly = withoutSystem.filter(
      (m): m is ConversationMessage =>
        m.role === 'user' || m.role === 'assistant'
    );

    // Within limit — return as-is (summary prepended if present)
    if (conversationOnly.length <= MAX_TURNS * 2) {
      // Treat summary as a system-role message for Addis AI
      const summaryAsSystem: ConversationMessage | undefined = summary
        ? { role: 'system', content: summary.content }
        : undefined;
      return summaryAsSystem
        ? [summaryAsSystem, ...conversationOnly]
        : conversationOnly;
    }

    // Over limit — keep summary + most recent turns
    const recentTurns = conversationOnly.slice(-(MAX_TURNS - 2) * 2);
    const summaryAsSystem: ConversationMessage | undefined = summary
      ? { role: 'system', content: summary.content }
      : undefined;

    return summaryAsSystem ? [summaryAsSystem, ...recentTurns] : recentTurns;
  }

  /**
   * Returns true when the conversation history has reached the summary
   * generation threshold. Called after every turn.
   */
  shouldSummarize(history: SessionMessage[]): boolean {
    const turnCount = history.filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    ).length / 2;
    return (
      turnCount >= SUMMARY_TRIGGER && turnCount % SUMMARY_TRIGGER === 0
    );
  }

  /**
   * Calls Addis AI to generate a concise rolling summary of the conversation
   * history. Uses low temperature and capped output tokens to minimise cost.
   */
  async generateSummary(
    history: ConversationMessage[],
    language: LanguageCode
  ): Promise<SummaryMessage> {
    const summaryPrompt =
      language === 'am'
        ? 'ይህን ውይይት በ2-3 ዓረፍተ ነገር ብቻ አጠቃልለው። ዋና ስሜቶች እና ርዕሶች ብቻ:'
        : 'Dubbii kana gababsuudhaan ibsi, odeeffannoo ijoo fi yaada murtoo qofa ibsi:';

    const response = await addisAiClient.chat({
      prompt: summaryPrompt,
      target_language: language,
      conversation_history: history,
      generation_config: { temperature: 0.3, maxOutputTokens: 200 },
    });

    const prefix =
      language === 'am'
        ? '[ቀደምት ውይይት ማጠቃለያ]'
        : '[Walgahii darbee cuunfaa]';

    return {
      role: 'summary',
      content: `${prefix}: ${response.response_text}`,
    };
  }
}

export const contextWindowManager = new ContextWindowManager();
