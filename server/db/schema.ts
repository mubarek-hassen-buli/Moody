import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  varchar,
  index,
} from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// Mirrors Supabase Auth user, adds app-specific fields.
// The `id` column is the same UUID that Supabase Auth assigns.
// ─────────────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Same UUID as Supabase Auth user id
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  preferredLanguage: varchar('preferred_language', { length: 2 })
    .notNull()
    .default('am'), // 'am' | 'om'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  onboardingComplete: boolean('onboarding_complete').default(false),
  timezone: text('timezone').default('Africa/Addis_Ababa'),
});

// ─────────────────────────────────────────────────────────────────────────────
// MOOD LOGS
// Daily mood check-ins. One entry per check-in (users may log multiple/day).
// ─────────────────────────────────────────────────────────────────────────────
export const moodLogs = pgTable(
  'mood_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    moodScore: integer('mood_score').notNull(), // 1–5 (1=very bad, 5=very good)
    emotionTags: text('emotion_tags').array(), // ['anxious', 'tired', 'hopeful']
    note: text('note'), // Optional short note (max 500 chars, enforced in route)
    language: varchar('language', { length: 2 }).notNull().default('am'),
    loggedAt: timestamp('logged_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('mood_logs_user_id_idx').on(table.userId),
    loggedAtIdx: index('mood_logs_logged_at_idx').on(table.loggedAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS
// Session metadata + AI-generated summary. NO raw transcripts are stored.
// ─────────────────────────────────────────────────────────────────────────────
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionType: varchar('session_type', { length: 20 })
      .notNull()
      .default('chat'), // 'chat' | 'voice' | 'exercise'
    language: varchar('language', { length: 2 }).notNull(),
    turnCount: integer('turn_count').default(0),
    durationSeconds: integer('duration_seconds'),
    summary: text('summary'), // AI-generated rolling summary (server-side only)
    moodBefore: integer('mood_before'), // Optional mood at session start (1–5)
    moodAfter: integer('mood_after'), // Optional mood at session end (1–5)
    hadEscalation: boolean('had_escalation').default(false),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
  },
  (table) => ({
    userIdIdx: index('conversations_user_id_idx').on(table.userId),
    startedAtIdx: index('conversations_started_at_idx').on(table.startedAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISES LOG
// Tracks completed grounding / breathing exercises.
// ─────────────────────────────────────────────────────────────────────────────
export const exercisesLog = pgTable(
  'exercises_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseType: varchar('exercise_type', { length: 50 }).notNull(),
    // 'breathing_box' | 'breathing_4-7-8' | 'grounding_54321' |
    // 'gratitude_journal' | 'body_scan'
    language: varchar('language', { length: 2 }).notNull(),
    durationSeconds: integer('duration_seconds'),
    completedAt: timestamp('completed_at').defaultNow().notNull(),
    rating: integer('rating'), // 1–5, user's feedback on helpfulness
  },
  (table) => ({
    userIdIdx: index('exercises_log_user_id_idx').on(table.userId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION EVENTS
// Logs when the safety layer was triggered. Retained with minimal data.
// ─────────────────────────────────────────────────────────────────────────────
export const escalationEvents = pgTable(
  'escalation_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id'),
    tier: integer('tier').notNull(), // 1, 2, or 3
    language: varchar('language', { length: 2 }),
    userMessage: text('user_message'), // Truncated — max 500 chars
    triggeredAt: timestamp('triggered_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('escalation_events_user_id_idx').on(table.userId),
    triggeredAtIdx: index('escalation_events_triggered_at_idx').on(
      table.triggeredAt
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type MoodLog = typeof moodLogs.$inferSelect;
export type NewMoodLog = typeof moodLogs.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ExercisesLogEntry = typeof exercisesLog.$inferSelect;
export type NewExercisesLogEntry = typeof exercisesLog.$inferInsert;
export type EscalationEvent = typeof escalationEvents.$inferSelect;
export type NewEscalationEvent = typeof escalationEvents.$inferInsert;
