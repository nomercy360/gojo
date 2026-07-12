import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/**
 * Product funnel events (kana trainer, booking modal, ...), written by the
 * public POST /events endpoint. anonymousId is a client-generated uuid kept
 * in localStorage so guest sessions chain together; userId is attached when
 * a session exists, letting guest history join to the account later.
 */
export const funnelEvents = pgTable(
  "funnel_events",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    anonymousId: text().notNull(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    name: text().notNull(),
    props: jsonb(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("funnel_events_name_created_idx").on(t.name, t.createdAt),
    index("funnel_events_anonymous_idx").on(t.anonymousId),
  ],
);

export type FunnelEvent = typeof funnelEvents.$inferSelect;
export type NewFunnelEvent = typeof funnelEvents.$inferInsert;
