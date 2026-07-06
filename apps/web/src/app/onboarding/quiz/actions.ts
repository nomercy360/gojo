"use server";

import { submitQuiz, submitQuizLead } from "@/lib/api";
import type {
  QuizLeadInput,
  QuizLeadResultDto,
  QuizResultDto,
  QuizSubmitInput,
} from "@gojo/shared";

export async function submitQuizAction(input: QuizSubmitInput): Promise<QuizResultDto> {
  return submitQuiz(input);
}

export async function submitQuizLeadAction(input: QuizLeadInput): Promise<QuizLeadResultDto> {
  return submitQuizLead(input);
}
