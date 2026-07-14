"use server";

import { ApiError, cancelLesson, createLesson, updateLessonMeetingUrl } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TeacherActionState = { error?: string; ok?: boolean };

export async function createLessonAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const studentIds = formData
    .getAll("studentIds")
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMin = Number(formData.get("duration") ?? 60);
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim();

  if (studentIds.length === 0) return { error: "Выбери хотя бы одного студента" };
  if (studentIds.length > 8) return { error: "На один урок можно пригласить до 8 студентов" };
  if (!title || !date || !time) return { error: "Заполни все поля" };

  const startsAt = new Date(`${date}T${time}`);
  if (Number.isNaN(startsAt.getTime())) return { error: "Неверная дата/время" };
  if (startsAt.getTime() <= Date.now()) return { error: "Урок нельзя создать в прошлом" };

  const endsAt = new Date(startsAt.getTime() + durationMin * 60000);

  try {
    await createLesson({
      title,
      studentIds,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      ...(meetingUrl ? { meetingUrl } : {}),
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      if (e.status === 403) return { error: "Нет прав учителя" };
      if (e.status === 400 && e.message.includes("lesson_starts_in_past")) {
        return { error: "Урок нельзя создать в прошлом" };
      }
      if (e.status === 400 && e.message.includes("too_many_students")) {
        return { error: "На один урок можно пригласить до 8 студентов" };
      }
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось создать урок" };
  }

  revalidatePath("/teacher");
  return { ok: true };
}

export async function updateMeetingUrlAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const lessonId = String(formData.get("lessonId") ?? "");
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim();
  if (!lessonId) return { error: "Нет id урока" };

  try {
    await updateLessonMeetingUrl(lessonId, meetingUrl || null);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      if (e.status === 400) return { error: "Ссылка должна быть корректным URL" };
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось сохранить ссылку" };
  }

  revalidatePath(`/teacher/lessons/${lessonId}`);
  return { ok: true };
}

export async function cancelLessonAction(formData: FormData) {
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!lessonId) return;

  try {
    await cancelLesson(lessonId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
  }
  revalidatePath("/teacher");
}
