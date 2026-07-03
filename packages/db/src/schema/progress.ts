import { sql } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Homework = typeof homework.$inferSelect;
export type NewHomework = typeof homework.$inferInsert;
export type TrainingTotals = typeof trainingTotals.$inferSelect;
