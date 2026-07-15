"use server";

import { submitQuiz } from "@/lib/api";
import type { QuizResultDto, QuizSubmitInput } from "@gojo/shared";

export async function submitQuizAction(input: QuizSubmitInput): Promise<QuizResultDto> {
  return submitQuiz(input);
}
