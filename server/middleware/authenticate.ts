import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// AUGMENT EXPRESS REQUEST TYPE
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        preferredLanguage: 'am' | 'om';
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CLIENT
// Used only to verify JWTs. Neon is the primary DB.
// ─────────────────────────────────────────────────────────────────────────────

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required'
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATE MIDDLEWARE
// Verifies Supabase JWT and enriches req.user with profile data from Neon.
// ─────────────────────────────────────────────────────────────────────────────

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header is required' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify JWT with Supabase
  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !supabaseUser) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Look up the user's app profile in Neon for language preference
  const [appUser] = await db
    .select({ preferredLanguage: users.preferredLanguage })
    .from(users)
    .where(eq(users.id, supabaseUser.id))
    .limit(1);

  req.user = {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    preferredLanguage:
      (appUser?.preferredLanguage as 'am' | 'om') ?? 'am',
  };

  next();
}
