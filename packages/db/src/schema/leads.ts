import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

// Landing-page leads: the "book a free lesson" and "get the guide" forms.
// These are prospects, not accounts — kept separate from `user`.
export const leads = pgTable("leads", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  userId: text().references(() => user.id, { onDelete: "set null" }),
  kind: text().notNull(), // 'booking' | 'guide'
  name: text().notNull(),
  email: text().notNull(),
  contact: text(), // telegram / phone (booking form)
  level: text(), // self-reported level (booking form)
  goal: text(), // goal (booking form)
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
