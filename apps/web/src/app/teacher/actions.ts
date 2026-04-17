"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, cancelLesson, createLesson } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

export type TeacherActionState = { error?: string; ok?: boolean };

async function requireToken() {
  const token = await getSessionToken();
  if (!token) redirect("/login");
  return token;
}

export async function createLessonAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const token = await requireToken();

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMin = Number(formData.get("duration") ?? 60);

  if (!title || !date || !time) return { error: "Заполни все поля" };

  const startsAt = new Date(`${date}T${time}`);
  if (Number.isNaN(startsAt.getTime())) return { error: "Неверная дата/время" };

  const endsAt = new Date(startsAt.getTime() + durationMin * 60000);

  try {
    await createLesson(
      {
        title,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      },
      token,
    );
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/login");
      if (e.status === 403) return { error: "Нет прав учителя" };
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось создать урок" };
  }

  revalidatePath("/teacher");
  return { ok: true };
}

export async function cancelLessonAction(formData: FormData) {
  const token = await requireToken();
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!lessonId) return;

  try {
    await cancelLesson(lessonId, token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
  }
  revalidatePath("/teacher");
}
