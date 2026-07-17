"use server";

import { addLessonCard, deleteLessonCard } from "@/lib/api";
import type { AddLessonCardInput, LessonCardDto } from "@gojo/shared";

export async function addLessonCardAction(
  lessonId: string,
  input: AddLessonCardInput,
): Promise<LessonCardDto> {
  return addLessonCard(lessonId, input);
}

export async function deleteLessonCardAction(lessonId: string, cardId: string) {
  return deleteLessonCard(lessonId, cardId);
}
