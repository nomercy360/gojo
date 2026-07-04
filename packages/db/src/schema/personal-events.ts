import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

// A student's own self-scheduled practice/training slot — distinct from
// `lessons` (teacher-created, bookable) and `training_totals` (aggregate
// practice-time counters). This is a personal calendar entry only they see.
export const personalEvents = pgTable("personal_events", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text().notNull(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  durationMinutes: integer().notNull().default(30),
  // Set once a Telegram reminder has been sent, so the reminder loop never
  // double-sends. Stays null if the user has no telegramId linked.
  remindedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type PersonalEvent = typeof personalEvents.$inferSelect;
export type NewPersonalEvent = typeof personalEvents.$inferInsert;
