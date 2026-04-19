import { sql } from "drizzle-orm";
import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { lessons } from "./lessons.ts";

/**
 * Teacher-curated card template attached to a lesson. One row = one word/phrase
 * the teacher wants students to study. Materialised into `flashcards` per
 * student on booking.
 */
export const lessonCards = pgTable("lesson_cards", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  lessonId: uuid()
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  word: text().notNull(),
  reading: text().notNull(),
  meaning: text().notNull(),
  notes: text(),
  position: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

/**
 * Per-user SRS state. Denormalises word/reading/meaning so user-added cards
 * work without a template, and edits to a template don't retroactively change
 * what a student has already been reviewing.
 *
 * - `stage = -1` → unlearned, not yet in the review queue (card sits in deck).
 * - `stage 0..6` → active review cycle (Seed → Summit).
 * - `stage = 7`  → Burned, no longer scheduled.
 *
 * Unique index on (userId, lessonCardId) enforces idempotent materialisation
 * when a student books the same lesson twice or teacher re-adds a template.
 */
export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonCardId: uuid().references(() => lessonCards.id, { onDelete: "cascade" }),
    word: text().notNull(),
    reading: text().notNull(),
    meaning: text().notNull(),
    stage: integer().notNull().default(-1),
    modifier: numeric({ precision: 3, scale: 2 }).notNull().default("1.00"),
    streak: integer().notNull().default(0),
    lapses: integer().notNull().default(0),
    due: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastReview: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("flashcards_user_lesson_card_uniq").on(t.userId, t.lessonCardId)],
);

export type LessonCard = typeof lessonCards.$inferSelect;
export type NewLessonCard = typeof lessonCards.$inferInsert;
export type Flashcard = typeof flashcards.$inferSelect;
export type NewFlashcard = typeof flashcards.$inferInsert;
