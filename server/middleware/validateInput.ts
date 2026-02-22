import type { Request, Response, NextFunction } from 'express';
import type { LanguageCode } from '../safety/escalationFilter.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const VALID_LANGUAGES: LanguageCode[] = ['am', 'om'];

function isValidLanguage(value: unknown): value is LanguageCode {
  return VALID_LANGUAGES.includes(value as LanguageCode);
}

function sendValidationError(res: Response, field: string, message: string) {
  res.status(400).json({ error: `Validation error on '${field}': ${message}` });
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATORS
// Each function is used directly in the route definition.
// ─────────────────────────────────────────────────────────────────────────────

/** Validates POST /api/chat body */
export function validateChatBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { message, session_id, language } = req.body;

  if (typeof message !== 'string' || message.trim().length === 0) {
    sendValidationError(res, 'message', 'Required non-empty string');
    return;
  }
  if (typeof session_id !== 'string' || session_id.trim().length === 0) {
    sendValidationError(res, 'session_id', 'Required non-empty string');
    return;
  }
  if (!isValidLanguage(language)) {
    sendValidationError(res, 'language', 'Must be "am" or "om"');
    return;
  }

  next();
}

/** Validates POST /api/mood body */
export function validateMoodBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { mood_score, language } = req.body;

  const score = Number(mood_score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    sendValidationError(res, 'mood_score', 'Must be an integer between 1 and 5');
    return;
  }
  if (!isValidLanguage(language)) {
    sendValidationError(res, 'language', 'Must be "am" or "om"');
    return;
  }

  next();
}

/** Validates PATCH /api/user/language body */
export function validateLanguageBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { language } = req.body;

  if (!isValidLanguage(language)) {
    sendValidationError(res, 'language', 'Must be "am" or "om"');
    return;
  }

  next();
}

/** Validates POST /api/chat/end body */
export function validateSessionEndBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { session_id } = req.body;

  if (typeof session_id !== 'string' || session_id.trim().length === 0) {
    sendValidationError(res, 'session_id', 'Required non-empty string');
    return;
  }

  next();
}
