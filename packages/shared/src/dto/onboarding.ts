import { z } from "zod";

export const jlptLevelSchema = z.enum(["N5", "N4", "N3", "N2"]);
export type JlptLevel = z.infer<typeof jlptLevelSchema>;

export const quizQuestionDto = z.object({
  id: z.string(),
  prompt: z.string(),
  choices: z.array(z.string()).min(2),
});
export type QuizQuestionDto = z.infer<typeof quizQuestionDto>;

export const quizSubmitInput = z.object({
  answers: z
    .array(z.object({ questionId: z.string(), choiceIndex: z.number().int().min(0) }))
    .min(1),
});
export type QuizSubmitInput = z.infer<typeof quizSubmitInput>;

export const quizResultDto = z.object({
  level: jlptLevelSchema,
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
});
export type QuizResultDto = z.infer<typeof quizResultDto>;
