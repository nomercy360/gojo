import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

export const lessonStatus = pgEnum("lesson_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const lessons = pgTable("lessons", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  teacherId: uuid()
    .notNull()
    .references(() => users.id),
  title: text().notNull(),
  status: lessonStatus().notNull().default("scheduled"),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  maxStudents: integer().notNull().default(8),
  jlptLevel: text(),
  recordingUrl: text(),
  metadata: jsonb().$type<{ topic?: string }>(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp({ withTimezone: true }),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    lessonId: uuid()
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    studentId: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("bookings_lesson_student_uniq").on(t.lessonId, t.studentId)],
);

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
