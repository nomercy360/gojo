import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Kanji Alive dataset (CC-BY). Shared across all tenants — immutable reference data.
 * Seeded from packages/db/data/ka_data.csv on first boot.
 */
export const kanji = pgTable("kanji", {
  character: text().primaryKey(),
  kname: text(),
  strokeCount: integer().notNull(),
  meaning: text().notNull(),
  grade: integer(),
  /** JLPT level 3-5 (N3-N5) from the community jlpt_new mapping; null = above N3 or unlisted. */
  jlpt: integer(),
  kunyomiJa: text(),
  kunyomi: text(),
  onyomiJa: text(),
  onyomi: text(),
  examples: jsonb().$type<Array<[string, string]>>(),
  radical: text(),
  radOrder: integer(),
  radStroke: integer(),
  radNameJa: text(),
  radName: text(),
  radMeaning: text(),
  radPositionJa: text(),
  radPosition: text(),
  hint: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Kanji = typeof kanji.$inferSelect;
