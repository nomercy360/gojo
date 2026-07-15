"use server";

import {
  ApiError,
  cancelLesson,
  createLesson,
  updateAdmin,
  updateLesson,
  updateStudent,
} from "@/lib/api";
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
  const startsAt = parseBrowserInstant(formData.get("startsAt"));

  if (studentIds.length === 0) return { error: "Выбери хотя бы одного студента" };
  if (studentIds.length > 8) return { error: "На один урок можно пригласить до 8 студентов" };
  if (!title || !date || !time) return { error: "Заполни все поля" };
  if (!startsAt) return { error: "Неверная дата/время" };
  if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 240) {
    return { error: "Неверная длительность урока" };
  }
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
    await updateLesson(lessonId, { meetingUrl: meetingUrl || null });
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

export async function updateAdminAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const adminId = String(formData.get("adminId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  const telegramRaw = String(formData.get("telegramId") ?? "").trim();
  const telegramId = telegramRaw ? Number(telegramRaw) : null;
  if (!adminId || !name || !email) return { error: "Заполни имя и email" };
  if (telegramId !== null && (!Number.isSafeInteger(telegramId) || telegramId <= 0)) {
    return { error: "Telegram ID должен быть положительным числом" };
  }

  try {
    await updateAdmin(adminId, {
      name,
      nickname: nickname || null,
      email,
      avatarUrl: avatarUrl || null,
      telegramId,
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      if (e.status === 403) return { error: "Нет прав на редактирование" };
      if (e.status === 400 && e.message.includes("email_already_in_use")) {
        return { error: "Этот email уже используется" };
      }
      if (e.status === 400 && e.message.includes("telegram_already_in_use")) {
        return { error: "Этот Telegram ID уже используется" };
      }
      if (e.status === 400) return { error: "Проверь имя и email" };
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось сохранить администратора" };
  }

  revalidatePath("/teacher");
  return { ok: true };
}

export async function updateStudentAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const studentId = String(formData.get("studentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  const telegramRaw = String(formData.get("telegramId") ?? "").trim();
  const telegramId = telegramRaw ? Number(telegramRaw) : null;
  const telegramUsernameRaw = String(formData.get("telegramUsername") ?? "").trim();
  const telegramUsername = telegramUsernameRaw.replace(/^@/, "").toLowerCase() || null;
  const jlptLevel = String(formData.get("jlptLevel") ?? "") || null;
  const quizLevel = String(formData.get("quizLevel") ?? "") || null;
  const currentLevel = Number(formData.get("currentLevel") ?? 1);
  const assignedPlanId = String(formData.get("assignedPlanId") ?? "") || null;
  const activeUntilRaw = String(formData.get("activeUntil") ?? "").trim();
  const activeUntil = activeUntilRaw || null;
  const lessonCredits = Number(formData.get("lessonCredits") ?? 0);

  if (!studentId || !name || !email) return { error: "Заполни имя и email" };
  if (telegramId !== null && (!Number.isSafeInteger(telegramId) || telegramId <= 0)) {
    return { error: "Telegram ID должен быть положительным числом" };
  }
  if (telegramUsername !== null && !/^[a-z0-9_]{5,32}$/.test(telegramUsername)) {
    return { error: "Проверь ник в Telegram" };
  }
  if (!Number.isInteger(currentLevel) || currentLevel < 1 || currentLevel > 30) {
    return { error: "Уровень программы должен быть от 1 до 30" };
  }
  if (assignedPlanId === "monthly-standard") {
    const end = activeUntil ? new Date(activeUntil) : null;
    if (!end || Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) {
      return { error: "Укажи будущую дату окончания доступа" };
    }
  }
  if (
    assignedPlanId === "bundle-8" &&
    (!Number.isInteger(lessonCredits) || lessonCredits < 1 || lessonCredits > 1000)
  ) {
    return { error: "Количество оставшихся уроков должно быть от 1 до 1000" };
  }

  try {
    await updateStudent(studentId, {
      name,
      nickname: nickname || null,
      email,
      avatarUrl: avatarUrl || null,
      telegramId,
      telegramUsername,
      jlptLevel,
      quizLevel,
      currentLevel,
      assignedPlanId,
      activeUntil: assignedPlanId === "monthly-standard" ? activeUntil : null,
      lessonCredits: assignedPlanId === "bundle-8" ? lessonCredits : 0,
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      if (e.status === 403) return { error: "Нет прав на редактирование" };
      if (e.status === 400 && e.message.includes("email_already_in_use")) {
        return { error: "Этот email уже используется" };
      }
      if (e.status === 400 && e.message.includes("telegram_already_in_use")) {
        return { error: "Этот Telegram ID уже используется" };
      }
      if (e.status === 400 && e.message.includes("telegram_username_already_in_use")) {
        return { error: "Этот ник Telegram уже используется" };
      }
      if (e.status === 400 && e.message.includes("invalid_access_end")) {
        return { error: "Укажи будущую дату окончания доступа" };
      }
      if (e.status === 400 && e.message.includes("invalid_lesson_credits")) {
        return { error: "Укажи количество оставшихся уроков" };
      }
      if (e.status === 400) return { error: "Проверь значения полей" };
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось сохранить студента" };
  }

  revalidatePath("/teacher");
  return { ok: true };
}

export async function updateLessonAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const lessonId = String(formData.get("lessonId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMin = Number(formData.get("duration") ?? 60);
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim();
  const startsAt = parseBrowserInstant(formData.get("startsAt"));

  if (!lessonId || !title || !date || !time) return { error: "Заполни все поля" };
  if (!startsAt) return { error: "Неверная дата или время" };
  if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 240) {
    return { error: "Неверная длительность урока" };
  }

  try {
    await updateLesson(lessonId, {
      title,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + durationMin * 60000).toISOString(),
      meetingUrl: meetingUrl || null,
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      if (e.status === 403) return { error: "Нет прав на редактирование урока" };
      if (e.status === 400) return { error: "Проверь дату, время и ссылку" };
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось сохранить урок" };
  }

  revalidatePath("/teacher");
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

function parseBrowserInstant(value: FormDataEntryValue | null): Date | null {
  const parsed = new Date(typeof value === "string" ? value : "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
