"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, bookLesson } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

export async function bookLessonAction(formData: FormData) {
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!lessonId) return;

  const token = await getSessionToken();
  if (!token) redirect("/login");

  try {
    await bookLesson(lessonId, token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    throw e;
  }
  revalidatePath("/lessons");
}
