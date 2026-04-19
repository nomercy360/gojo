"use server";

import type { AddLessonCardInput, LessonCardDto } from "@gojo/shared";
import { addLessonCard, deleteLessonCard } from "@/lib/api";

export async function addLessonCardAction(
  lessonId: string,
  input: AddLessonCardInput,
): Promise<LessonCardDto> {
  return addLessonCard(lessonId, input);
}

export async function deleteLessonCardAction(lessonId: string, cardId: string) {
  return deleteLessonCard(lessonId, cardId);
}
