import { sql } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kanji } from "./kanji.ts";

export const levelBand = pgEnum("level_band", ["N5", "N4", "N3"]);

/**
 * The 30-level ladder: 1-8 = N5, 9-18 = N4, 19-30 = N3. Rows are seeded once
 * (seed-curriculum.ts); content tables below hang off them. A level with no
 * content yet is "coming soon" — bands beyond N5 fill in as content is
 * authored.
 */
export const levels = pgTable("levels", {
  id: integer().primaryKey(), // 1..30
  band: levelBand().notNull(),
  title: text(),
  description: text(),
});

/**
 * Lesson-sized slice of a level, ordered within it. The atomic curriculum
 * entity: lessons point at a unit (many lessons may share one — slow students
 * take two sessions), and marking such a lesson attended materializes the
 * unit's vocab into the student's SRS deck and unlocks the unit's level.
 * sourceBook/sourceChapter are a reference pointer (students buy the book;
 * we never host publisher PDFs) — promote to a books table when reuse needs it.
 */
export const units = pgTable(
  "units",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    levelId: integer()
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
    title: text().notNull(),
    sourceBook: text(),
    sourceChapter: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
);

/** Kanji assigned to a level, ordered by frequency. References the Kanji Alive reference table. */
export const levelKanji = pgTable(
  "level_kanji",
  {
    levelId: integer()
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    character: text()
      .notNull()
      .references(() => kanji.character),
    position: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.levelId, t.character] })],
);

/**
 * Level vocabulary. meaningRu is the display gloss on the RU platform;
 * meaningEn is kept from the source list and used as fallback until the
 * one-time RU translation pass fills meaningRu (scripts/translate-vocab.ts).
 */
export const levelVocab = pgTable(
  "level_vocab",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    levelId: integer()
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    word: text().notNull(),
    reading: text().notNull(),
    meaningRu: text(),
    meaningEn: text().notNull(),
    position: integer().notNull().default(0),
    /** Unit this word belongs to (deck membership as a tag, not a copy). Null = not yet assigned to a unit. */
    unitId: uuid().references(() => units.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("level_vocab_level_word_uniq").on(t.levelId, t.word)],
);

/** Grammar points per level, authored in Russian. */
export const levelGrammar = pgTable(
  "level_grammar",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    levelId: integer()
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    title: text().notNull(), // e.g. "〜てください"
    pattern: text(), // structural formula, e.g. "V(て) + ください"
    descriptionRu: text().notNull(),
    exampleJa: text(),
    exampleRu: text(),
    position: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("level_grammar_level_title_uniq").on(t.levelId, t.title)],
);

export type Level = typeof levels.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type LevelKanji = typeof levelKanji.$inferSelect;
export type LevelVocab = typeof levelVocab.$inferSelect;
export type LevelGrammar = typeof levelGrammar.$inferSelect;
