import { z } from "zod";

export const flashcardDto = z.object({
  id: z.string().uuid(),
  word: z.string(),
  reading: z.string(),
  meaning: z.string(),
  stage: z.number().int(),
  modifier: z.number(),
  streak: z.number().int(),
  lapses: z.number().int(),
  due: z.string(),
  lastReview: z.string().nullable(),
  lessonCardId: z.string().uuid().nullable(),
});
export type FlashcardDto = z.infer<typeof flashcardDto>;

export const reviewQueueDto = z.object({
  due: z.array(flashcardDto),
  unlearned: z.array(flashcardDto),
  stats: z.object({
    dueCount: z.number().int(),
    unlearnedCount: z.number().int(),
    burnedCount: z.number().int(),
    totalCards: z.number().int(),
  }),
});
export type ReviewQueueDto = z.infer<typeof reviewQueueDto>;

export const submitReviewInput = z.object({
  correct: z.boolean(),
});
export type SubmitReviewInput = z.infer<typeof submitReviewInput>;

export const lessonCardDto = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  word: z.string(),
  reading: z.string(),
  meaning: z.string(),
  notes: z.string().nullable(),
  position: z.number().int(),
  createdAt: z.string(),
});
export type LessonCardDto = z.infer<typeof lessonCardDto>;

export const addLessonCardInput = z.object({
  word: z.string().min(1).max(100),
  reading: z.string().min(1).max(100),
  meaning: z.string().min(1).max(200),
  notes: z.string().max(500).optional(),
});
export type AddLessonCardInput = z.infer<typeof addLessonCardInput>;

export const kanjiDto = z.object({
  character: z.string(),
  strokeCount: z.number().int(),
  meaning: z.string(),
  grade: z.number().int().nullable(),
  kunyomiJa: z.string().nullable(),
  kunyomi: z.string().nullable(),
  onyomiJa: z.string().nullable(),
  onyomi: z.string().nullable(),
  examples: z.array(z.tuple([z.string(), z.string()])).nullable(),
  radical: z.string().nullable(),
  radNameJa: z.string().nullable(),
  radName: z.string().nullable(),
  radMeaning: z.string().nullable(),
});
export type KanjiDto = z.infer<typeof kanjiDto>;

export const kanjiBreakdownEntry = z.object({
  character: z.string(),
  found: z.boolean(),
  kanji: kanjiDto.nullable(),
});
export type KanjiBreakdownEntry = z.infer<typeof kanjiBreakdownEntry>;
