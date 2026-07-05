"use server";

import { ApiError, uploadLessonMaterial } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type MaterialUploadState = { error?: string; ok?: boolean };

export async function uploadMaterialAction(
  _prev: MaterialUploadState,
  formData: FormData,
): Promise<MaterialUploadState> {
  const lessonId = String(formData.get("lessonId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");

  if (!lessonId) return { error: "Не найден урок" };
  if (!(file instanceof File) || file.size === 0) return { error: "Добавь файл" };

  const upload = new FormData();
  upload.set("file", file);
  if (title) upload.set("title", title);

  try {
    await uploadLessonMaterial(lessonId, upload);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/login");
      if (e.status === 403) return { error: "Нет прав учителя" };
      if (e.status === 413) return { error: "Файл больше 10 МБ" };
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось загрузить материал" };
  }

  revalidatePath(`/teacher/lessons/${lessonId}`);
  revalidatePath(`/lessons/${lessonId}`);
  return { ok: true };
}
