"use server";

import { fetchKanjiList } from "@/lib/api";
import type { KanjiDto } from "@gojo/shared";

export async function fetchKanjiListAction(
  difficulty: "easy" | "medium" | "hard" | "all",
  limit: number,
): Promise<KanjiDto[]> {
  return fetchKanjiList(difficulty, limit);
}
