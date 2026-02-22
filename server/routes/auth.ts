import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/sync
// Called by the mobile app immediately after a successful Supabase sign-in.
// Upserts the user record in Neon DB using the confirmed Supabase identity.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/sync', authenticate, async (req, res) => {
  try {
    const { id, email } = req.user;

    // Check if user already exists in Neon
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existing) {
      // Update last active timestamp on every login
      await db
        .update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.id, id));

      res.status(200).json({
        user: {
          id: existing.id,
          email: existing.email,
          displayName: existing.displayName,
          preferredLanguage: existing.preferredLanguage,
          onboardingComplete: existing.onboardingComplete,
        },
        created: false,
      });
      return;
    }

    // First time — insert the new user record
    const [newUser] = await db
      .insert(users)
      .values({
        id,
        email,
        preferredLanguage: 'am', // Default; updated during onboarding
        onboardingComplete: false,
      })
      .returning();

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        preferredLanguage: newUser.preferredLanguage,
        onboardingComplete: newUser.onboardingComplete,
      },
      created: true,
    });
  } catch (error) {
    console.error('[auth/sync] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
