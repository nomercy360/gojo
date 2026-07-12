import { z } from "zod";

export const jlptLevelSchema = z.enum(["N5", "N4", "N3", "N2"]);
export type JlptLevel = z.infer<typeof jlptLevelSchema>;

/** Self-declared starting point from the quiz's first screen. */
export const quizStartChoiceSchema = z.enum(["new", "kana", "n5", "n4"]);
export type QuizStartChoice = z.infer<typeof quizStartChoiceSchema>;

/**
 * Quiz placement: JLPT band plus a sub-N5 floor. "start" = nothing
 * demonstrated and no kana declared — the honest result for 0 correct,
 * instead of rounding a blank slate up to N5.
 */
export const quizPlacementSchema = z.enum(["start", "N5", "N4", "N3", "N2"]);
export type QuizPlacement = z.infer<typeof quizPlacementSchema>;

export const quizQuestionDto = z.object({
  id: z.string(),
  level: jlptLevelSchema,
  prompt: z.string(),
  choices: z.array(z.string()).min(2),
});
export type QuizQuestionDto = z.infer<typeof quizQuestionDto>;

export const quizSubmitInput = z.object({
  // choiceIndex -1 = «не знаю»: an explicit skip that always scores as wrong.
  answers: z
    .array(z.object({ questionId: z.string(), choiceIndex: z.number().int().min(-1) }))
    .min(1),
  // Declaration sets which levels get probed (declared-known levels are
  // skipped and credited "со слов") — the server derives the same served
  // subset from this, so client and server always score the same questions.
  declared: quizStartChoiceSchema.optional(),
});
export type QuizSubmitInput = z.infer<typeof quizSubmitInput>;

export const quizLeadInput = quizSubmitInput.extend({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  contact: z.string().trim().min(1).max(200),
});
export type QuizLeadInput = z.infer<typeof quizLeadInput>;

export const quizResultDto = z.object({
  level: quizPlacementSchema,
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  // Per-JLPT-level breakdown of the *served* questions so the result screen
  // can show an honest skip/seed/start map instead of a single opaque number.
  // Levels skipped by declaration are absent — the client renders those as
  // credited "со слов", not as tested.
  byLevel: z.array(
    z.object({
      level: jlptLevelSchema,
      correct: z.number().int().min(0),
      total: z.number().int().min(1),
    }),
  ),
});
export type QuizResultDto = z.infer<typeof quizResultDto>;

export const quizLeadResultDto = quizResultDto.extend({
  leadId: z.string().uuid().optional(),
  emailSent: z.boolean(),
});
export type QuizLeadResultDto = z.infer<typeof quizLeadResultDto>;

/** Teacher sets the official level for a student after the free consultation lesson. */
export const setStudentLevelInput = z.object({
  jlptLevel: jlptLevelSchema,
});
export type SetStudentLevelInput = z.infer<typeof setStudentLevelInput>;
