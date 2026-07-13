import { sql } from "drizzle-orm";
import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
  // Contact channels for the booking funnel, in priority order: Telegram is the
  // primary reachable channel, email an optional durable fallback, phone an
  // opt-in "call me" rescue. At least one is present; a lead can carry several.
  // `telegram` is stored as a bare lowercase @-handle (no leading @).
  telegram: text(),
  // Verified stable identity returned by Telegram Login. Usernames are
  // optional and mutable, so deduplication prefers this numeric ID.
  telegramId: bigint({ mode: "number" }),
  // Email is optional and normalized to lowercase. Still the dedup/link key
  // whenever it's present, and the channel the quiz result email uses.
  email: text(),
  phone: text(), // opt-in callback number, digits normalized
  level: text(), // self-reported level (booking form)
  goal: text(), // goal (booking form)
  notes: text(),
  nextFollowUpAt: timestamp({ withTimezone: true }),
  // Evidence of the separate consent shown next to public lead forms.
  personalDataConsentAt: timestamp({ withTimezone: true }),
  personalDataConsentVersion: text(),
  // Advertising/news consent is independent and optional.
  marketingConsentAt: timestamp({ withTimezone: true }),
  marketingConsentVersion: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
