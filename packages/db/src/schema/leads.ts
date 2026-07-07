import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { lessons } from "./lessons.ts";

// Landing-page leads: the "book a free lesson" and "get the guide" forms.
// These are prospects, not accounts — kept separate from `user`.
export const leads = pgTable("leads", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  userId: text().references(() => user.id, { onDelete: "set null" }),
  assigneeId: text().references(() => user.id, { onDelete: "set null" }),
  trialLessonId: uuid().references(() => lessons.id, { onDelete: "set null" }),
  kind: text().notNull(), // 'booking' | 'guide'
  status: text().notNull().default("new"),
  name: text().notNull(),
  // Nullable — booking leads now require a phone (in `contact`) but email is
  // optional; only the "guide" kind still requires email for PDF delivery
  // (enforced client-side).
  email: text(),
  contact: text(), // phone (booking form, now required client-side) / telegram
  level: text(), // self-reported level (booking form)
  goal: text(), // goal (booking form)
  notes: text(),
  nextFollowUpAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
