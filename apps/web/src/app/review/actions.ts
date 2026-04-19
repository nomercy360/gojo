"use server";

import type { FlashcardDto } from "@gojo/shared";
import { promoteCard, submitCardReview } from "@/lib/api";

export async function promoteAction(cardId: string): Promise<FlashcardDto> {
  return promoteCard(cardId);
}

export async function submitReviewAction(
  cardId: string,
  correct: boolean,
): Promise<FlashcardDto> {
  return submitCardReview(cardId, { correct });
}
