"use server";

import { ApiError, bookLesson } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function bookLessonAction(formData: FormData) {
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!lessonId) return;

  try {
    await bookLesson(lessonId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    if (e instanceof ApiError && e.status === 402) redirect("/payments");
    throw e;
  }
  revalidatePath("/lessons");
  revalidatePath("/");
}
