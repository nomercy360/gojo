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

export const radicals = pgTable("radicals", {
  id: integer().primaryKey(),
  character: text().notNull(),
  strokeCount: integer().notNull(),
  meaning: text().notNull(),
  readingJa: text(),
  reading: text(),
  rFilename: text(),
  animFilename: text(),
  positionJa: text(),
  position: text(),
});

export type Kanji = typeof kanji.$inferSelect;
export type Radical = typeof radicals.$inferSelect;
