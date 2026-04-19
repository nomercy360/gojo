"use server";

import type { QuizResultDto, QuizSubmitInput } from "@gojo/shared";
import { submitQuiz } from "@/lib/api";

export async function submitQuizAction(input: QuizSubmitInput): Promise<QuizResultDto> {
  return submitQuiz(input);
}
