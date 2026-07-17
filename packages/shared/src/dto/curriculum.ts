import { z } from "zod";

export const levelBandSchema = z.enum(["N5", "N4", "N3"]);
export type LevelBand = z.infer<typeof levelBandSchema>;

export const levelSummaryDto = z.object({
  id: z.number().int(),
  band: levelBandSchema,
  kanjiCount: z.number(),
  vocabCount: z.number(),
  grammarCount: z.number(),
  /** Level content is visible: id <= user's currentLevel (admins see all). */
  unlocked: z.boolean(),
  current: z.boolean(),
});
export type LevelSummaryDto = z.infer<typeof levelSummaryDto>;

export const levelKanjiDto = z.object({
  character: z.string(),
  meaning: z.string(),
  kunyomi: z.string().nullable(),
  onyomi: z.string().nullable(),
  strokeCount: z.number(),
  position: z.number(),
});
export type LevelKanjiDto = z.infer<typeof levelKanjiDto>;

export const levelVocabDto = z.object({
  id: z.string().uuid(),
  word: z.string(),
  reading: z.string(),
  /** RU gloss when translated; falls back to EN until the translation pass runs. */
  meaning: z.string(),
  position: z.number(),
  /** Unit this word is assigned to (deck membership); null = unassigned. */
  unitId: z.string().uuid().nullable(),
});
export type LevelVocabDto = z.infer<typeof levelVocabDto>;

export const levelGrammarDto = z.object({
  id: z.string().uuid(),
  title: z.string(),
  pattern: z.string().nullable(),
  descriptionRu: z.string(),
  exampleJa: z.string().nullable(),
  exampleRu: z.string().nullable(),
  position: z.number(),
});
export type LevelGrammarDto = z.infer<typeof levelGrammarDto>;

export const unitDto = z.object({
  id: z.string().uuid(),
  levelId: z.number().int(),
  position: z.number(),
  title: z.string(),
  sourceBook: z.string().nullable(),
  sourceChapter: z.string().nullable(),
  vocabCount: z.number(),
  lessonCount: z.number(),
});
export type UnitDto = z.infer<typeof unitDto>;

export const levelDetailDto = z.object({
  id: z.number().int(),
  band: levelBandSchema,
  kanji: z.array(levelKanjiDto),
  vocab: z.array(levelVocabDto),
  grammar: z.array(levelGrammarDto),
});
export type LevelDetailDto = z.infer<typeof levelDetailDto>;
