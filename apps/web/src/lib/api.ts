import type { LessonDto } from "@gojo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function fetchLessons(): Promise<LessonDto[]> {
  const res = await fetch(`${API_URL}/lessons`, { cache: "no-store" });
  if (!res.ok) throw new Error(`api error ${res.status}`);
  return res.json();
}
