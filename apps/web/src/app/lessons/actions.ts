"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, bookLesson } from "@/lib/api";

export async function bookLessonAction(formData: FormData) {
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!lessonId) return;

  try {
    await bookLesson(lessonId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    throw e;
  }
  revalidatePath("/lessons");
  revalidatePath("/");
}
