import type { Request, Response, NextFunction } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// PER-USER RATE LIMITER
// Tracks request counts per authenticated user ID.
// Falls back to IP if user is not yet attached (for public routes, if any).
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT = 100;                    // Max requests per window
const RATE_WINDOW_MS = 60 * 60 * 1000;    // 1-hour rolling window

interface RateLimitBucket {
  count: number;
  resetAt: number; // Unix ms timestamp when the window resets
}

const buckets = new Map<string, RateLimitBucket>();

/**
 * Returns the bucket key for the current request.
 * Uses authenticated user ID when available, falls back to IP.
 */
function getBucketKey(req: Request): string {
  if (req.user?.id) return `user:${req.user.id}`;
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `ip:${ip}`;
}

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = getBucketKey(req);
  const now = Date.now();

  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    // New or expired window — start fresh
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    next();
    return;
  }

  if (bucket.count >= RATE_LIMIT) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: retryAfterSeconds,
    });
    return;
  }

  bucket.count += 1;
  next();
}
