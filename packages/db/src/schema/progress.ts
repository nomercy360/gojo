import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { lessons } from "./lessons.ts";

export const homeworkStatus = pgEnum("homework_status", ["pending", "done", "missed"]);

/**
 * Teacher-marked homework status per (lesson, student). There is no
 * student-facing submission flow yet — the teacher marks whether homework
 * was done after reviewing it out-of-band.
 */
export const homework = pgTable(
  "homework",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    lessonId: uuid()
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    studentId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: homeworkStatus().notNull().default("pending"),
    markedBy: text().references(() => user.id),
    markedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("homework_lesson_student_uniq").on(t.lessonId, t.studentId)],
);

export const homeworkSubmissionStatus = pgEnum("homework_submission_status", [
  "submitted", // awaiting AI first-pass (or AI skipped when no API key)
  "ai_reviewed", // Claude first-pass done, awaiting teacher decision
  "approved", // teacher accepted — mirrored into homework.status = done
  "needs_revision", // teacher sent back; student may submit again
]);

/**
 * Student-written homework text per (lesson, student). Multiple rows per pair
 * are allowed — each row is one attempt; the latest one is authoritative.
 * `aiReview` holds the Claude first-pass markup (shape: HomeworkAiReview in
 * @gojo/shared) that the teacher validates instead of reading raw text.
 */
export const homeworkSubmissions = pgTable(
  "homework_submissions",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    lessonId: uuid()
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    studentId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text().notNull(),
    status: homeworkSubmissionStatus().notNull().default("submitted"),
    aiReview: jsonb(),
    aiReviewedAt: timestamp({ withTimezone: true }),
    // Non-null when the Claude call failed; the teacher reviews raw text.
    aiReviewError: text(),
    teacherComment: text(),
    reviewedBy: text().references(() => user.id),
    reviewedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("homework_submissions_lesson_student_idx").on(t.lessonId, t.studentId)],
);

/**
 * Aggregate time spent per training activity. Incremented in small bounded
 * chunks by a client-side heartbeat (see api /training/track) rather than
 * logged per-session, since only the running total is needed.
 */
export const trainingTotals = pgTable("training_totals", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  reviewSeconds: integer().notNull().default(0),
  kanaSeconds: integer().notNull().default(0),
  kanjiSeconds: integer().notNull().default(0),
  // Consecutive days with training activity, bumped by /training/track.
  currentStreak: integer().notNull().default(0),
  lastActiveDate: date(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Homework = typeof homework.$inferSelect;
export type NewHomework = typeof homework.$inferInsert;
export type HomeworkSubmission = typeof homeworkSubmissions.$inferSelect;
export type NewHomeworkSubmission = typeof homeworkSubmissions.$inferInsert;
export type TrainingTotals = typeof trainingTotals.$inferSelect;
