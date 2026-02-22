import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  validateLanguageBody,
} from '../middleware/validateInput.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/profile
// Returns the authenticated user's full app profile from Neon.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/profile', authenticate, async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        preferredLanguage: users.preferredLanguage,
        onboardingComplete: users.onboardingComplete,
        createdAt: users.createdAt,
        lastActiveAt: users.lastActiveAt,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('[user/profile] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/user/language
// Updates the user's preferred language ('am' | 'om').
// Called during onboarding and from the Settings screen.
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/language', authenticate, validateLanguageBody, async (req, res) => {
  try {
    const { language } = req.body as { language: 'am' | 'om' };

    const [updated] = await db
      .update(users)
      .set({
        preferredLanguage: language,
        onboardingComplete: true,
      })
      .where(eq(users.id, req.user.id))
      .returning({
        preferredLanguage: users.preferredLanguage,
        onboardingComplete: users.onboardingComplete,
      });

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      preferredLanguage: updated.preferredLanguage,
      onboardingComplete: updated.onboardingComplete,
    });
  } catch (error) {
    console.error('[user/language] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
