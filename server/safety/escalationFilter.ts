import { db } from '../db/client.js';
import { escalationEvents } from '../db/schema.js';

// ─────────────────────────────────────────────────────────────────────────────
// CRISIS KEYWORD DATABASE
// Amharic and Afan Oromo keywords, tiered by severity.
// Universal patterns catch English-language crisis phrases.
// ─────────────────────────────────────────────────────────────────────────────

type LanguageCode = 'am' | 'om';

interface CrisisKeywords {
  tier1: string[];
  tier2: string[];
  tier3: string[];
}

interface EscalationResult {
  triggered: boolean;
  tier?: number;
  message?: string;
  additionalInstruction?: string;
}

const CRISIS_KEYWORDS: Record<LanguageCode, CrisisKeywords> & {
  universal: RegExp[];
} = {
  am: {
    // Tier 1: Immediate crisis — highest severity, no AI call
    tier1: [
      'ራሴን ልጨርስ',
      'ልሞት',
      'መሞት እፈልጋለሁ',
      'ሕይወቴን ላቆም',
      'ራሴን ልጉዳ',
      'ልጨርስ',
      'ትርጉም የለኝም',
      'ልሄድ',
    ],
    // Tier 2: High distress — needs gentle escalation prompt + hotline
    tier2: [
      'ተስፋ ቆርጫለሁ',
      'ሁሉ ነገር ጨለማ ነው',
      'መቀጠል አልችልም',
      'ክፉ ሃሳብ',
      'ምንም ፋይዳ የለኝም',
      'ሁሉ ሰው ይጠሉኛል',
      'ሳላለቅስ አልችልም',
      'ጨርሶ ደክሞኛል',
    ],
    // Tier 3: Distress signals — AI handles with gentle check-in instruction
    tier3: ['ብቻዬን ነኝ', 'ማንም አይረዳኝም', 'ትንሽ አልተኛም', 'አልበላሁም'],
  },
  om: {
    tier1: [
      'ofumaan fixuu',
      "du'uu barbaada",
      'lubbuun koo',
      'of miidhuu',
      'jireenya dhaabuu',
    ],
    tier2: [
      'abdii kutadhe',
      'itti fuudhuu hindandahu',
      'waa hundumaa gurraacha',
      'fayiidaa hinqabu',
      'hundi na jibbuu',
    ],
    tier3: ['kophaa koo', 'namni na hin beekne', 'hirriba dhorke'],
  },
  // Universal patterns — catch English phrases regardless of selected language
  universal: [
    /\b(die|kill myself|end it|no reason to live)\b/i,
    /\b(self.?harm|hurt myself)\b/i,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CRISIS RESPONSE MESSAGES
// Displayed instead of AI response when escalation is triggered.
// tier3 responses are null — the AI handles those with an injected instruction.
// ─────────────────────────────────────────────────────────────────────────────

const CRISIS_RESPONSES: Record<LanguageCode, Record<string, string | null>> = {
  am: {
    tier1: `ይህን ካነበብኩ ልቤ ጠበብ አለ። አሁን ደህና ነህ/ሽ?

ብቻህ/ሽ አትሁን። ወዲያውኑ ይደውሉ:
📞 **የኢትዮጵያ የአእምሮ ጤና ሃኪም ቤት:** +251-111-550-909
📞 **ቤተሰብ ወይም ቅርብ ሰው አሁን ጥሪ አድርግ**

ጎናህ/ሽ ነኝ። ትናገር/ትናገሪ ትችላለህ/ሽ።`,

    tier2: `ብዙ ክብደት እያሸከምህ/ሽ እንደሆነ ተረዳሁ። ይህ ሁኔታ ከባድ ነው።

ከቅርብ ሰው ጋር ማውራት ትፈልጋለህ/ሽ? ወይም ለሞያ ድጋፍ:
📞 **+251-111-550-909**

አሁን እዚህ አሉ — ብቻህ/ሽ አይደለህ/ሽም።`,

    tier3: null, // Let AI handle with gentle check-in instruction
  },
  om: {
    tier1: `Kan dubbifadhe boqonnaa koo na dhoorke. Amma nagaadhaa jirtaa?

Kophaa hin tain. Amma bilbili:
📞 **Hospitaala Fayyaa Sammuu Itoophiyaa:** +251-111-550-909
📞 **Maatii yookiin namni si dhiyaatu amma bilbili**

Cinaa kee jira. Dubbachuu nidandeessa.`,

    tier2: `Ulfaatina guddaa baataa akka jirtu nan hubadhe.

Namni si dhiyaatu wajjin dubbachuu barbaaddaa? Deggarsa ogummaa:
📞 **+251-111-550-909**

Kophaa miti — as jiru.`,

    tier3: null,
  },
};

// Gentle check-in instructions injected into AI context for Tier 3
const TIER3_INSTRUCTIONS: Record<LanguageCode, string> = {
  am: 'ተጠቃሚው ብቸኝነት ሊሰማው ይችላል። በርኅርኅ ሁን እና ጥያቄ ጠይቅ።',
  om: "Fayyadamaan kophummaa dhaga'achuu danda'a. Rakkina isaaf obsaan deebii kennii.",
};

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION FILTER CLASS
// ─────────────────────────────────────────────────────────────────────────────

class EscalationFilter {
  /**
   * Checks user input against crisis keyword tiers.
   * Returns triggered=false if safe, or an escalation result with tier and message.
   * MUST run before any Addis AI call.
   */
  check(text: string, language: LanguageCode = 'am'): EscalationResult {
    if (!text || text.trim().length === 0) {
      return { triggered: false };
    }

    const normalized = text.toLowerCase().trim();
    const keywords = CRISIS_KEYWORDS[language] ?? CRISIS_KEYWORDS.am;

    // ── Tier 1: Immediate crisis ──────────────────────────────────────────
    const isTier1 = keywords.tier1.some((kw) =>
      normalized.includes(kw.toLowerCase())
    );
    if (isTier1) {
      return {
        triggered: true,
        tier: 1,
        message: CRISIS_RESPONSES[language].tier1 as string,
      };
    }

    // ── Universal English patterns ─────────────────────────────────────────
    const isUniversal = CRISIS_KEYWORDS.universal.some((pattern) =>
      pattern.test(normalized)
    );
    if (isUniversal) {
      return {
        triggered: true,
        tier: 1,
        message: CRISIS_RESPONSES[language].tier1 as string,
      };
    }

    // ── Tier 2: High distress ──────────────────────────────────────────────
    const isTier2 = keywords.tier2.some((kw) =>
      normalized.includes(kw.toLowerCase())
    );
    if (isTier2) {
      return {
        triggered: true,
        tier: 2,
        message: CRISIS_RESPONSES[language].tier2 as string,
      };
    }

    // ── Tier 3: Distress signal — pass to AI with modified instruction ─────
    const isTier3 = keywords.tier3.some((kw) =>
      normalized.includes(kw.toLowerCase())
    );
    if (isTier3) {
      return {
        triggered: false,
        tier: 3,
        additionalInstruction: TIER3_INSTRUCTIONS[language],
      };
    }

    return { triggered: false };
  }

  /**
   * Persists a triggered escalation event to the database.
   * Runs non-blocking — caller should not await this directly.
   */
  async logEvent(
    userId: string,
    sessionId: string | null,
    userText: string,
    tier: number,
    language: LanguageCode
  ): Promise<void> {
    await db.insert(escalationEvents).values({
      userId,
      sessionId: sessionId ?? undefined,
      tier,
      language,
      userMessage: userText.slice(0, 500), // Truncate for privacy
    });
  }
}

export const escalationFilter = new EscalationFilter();
export type { EscalationResult, LanguageCode };
