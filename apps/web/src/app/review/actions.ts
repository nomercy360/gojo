"use server";

import { promoteCard, submitCardReview } from "@/lib/api";
import type { FlashcardDto } from "@gojo/shared";

export async function promoteAction(cardId: string): Promise<FlashcardDto> {
  return promoteCard(cardId);
}

export async function submitReviewAction(cardId: string, correct: boolean): Promise<FlashcardDto> {
  return submitCardReview(cardId, { correct });
}
