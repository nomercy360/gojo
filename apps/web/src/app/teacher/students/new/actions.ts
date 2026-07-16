"use server";

import { ApiError, type LeadConversionMatch, convertTeacherLead, createStudent } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateStudentState = {
  error?: string;
  ok?: boolean;
  converted?: boolean;
  matches?: LeadConversionMatch[];
};

export async function createStudentAction(
  _prev: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const leadId = String(formData.get("leadId") ?? "").trim();
  const converting = Boolean(leadId);
  const nickname = String(formData.get("nickname") ?? "").trim() || undefined;
  const telegramUsername =
    String(formData.get("telegramUsername") ?? "")
      .trim()
      .replace(/^@/, "")
      .toLowerCase() || undefined;
  const telegramIdRaw = String(formData.get("telegramId") ?? "").trim();
  const telegramId = telegramIdRaw ? Number(telegramIdRaw) : null;
  const planId = String(formData.get("planId") ?? "").trim();
  const activeUntil = String(formData.get("activeUntil") ?? "").trim() || null;
  const lessonCredits = Number(formData.get("lessonCredits") ?? 0);

  const jlptLevel = String(formData.get("jlptLevel") ?? "") as "N5" | "N4" | "N3" | "N2";
  const existingStudentId = String(formData.get("existingStudentId") ?? "").trim() || undefined;

  if (!name || (!converting && !email)) return { error: "Заполни email и имя" };
  if (telegramUsername && !/^[a-z0-9_]{5,32}$/.test(telegramUsername)) {
    return { error: "Проверь ник в Telegram" };
  }
  if (telegramId !== null && (!Number.isSafeInteger(telegramId) || telegramId <= 0)) {
    return { error: "Telegram ID должен быть положительным числом" };
  }
  if (converting && !email && telegramId === null) {
    return { error: "Нужен email или Telegram ID, чтобы студент мог войти" };
  }
  if (converting && !["N5", "N4", "N3", "N2"].includes(jlptLevel)) {
    return { error: "Выбери уровень JLPT по итогам пробного урока" };
  }
  if (!converting && !planId) return { error: "Выбери тариф" };
  if (!converting && planId === "monthly-standard") {
    const end = activeUntil ? new Date(activeUntil) : null;
    if (!end || Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) {
      return { error: "Укажи будущую дату окончания доступа" };
    }
  }
  if (
    !converting &&
    planId === "bundle-8" &&
    (!Number.isInteger(lessonCredits) || lessonCredits < 1 || lessonCredits > 1000)
  ) {
    return { error: "Количество уроков должно быть от 1 до 1000" };
  }

  try {
    if (converting) {
      const result = await convertTeacherLead(leadId, {
        email: email || null,
        name,
        nickname,
        telegramUsername: telegramUsername ?? null,
        telegramId,
        jlptLevel,
        planId: planId || null,
        existingStudentId,
      });
      if (!result.ok) return { matches: result.matches };

      revalidatePath("/teacher");
      revalidatePath("/teacher/leads");
      revalidatePath(`/teacher/students/${result.userId}`);
      return { ok: true, converted: true };
    }

    await createStudent({
      email,
      name,
      nickname,
      telegramUsername,
      telegramId,
      planId,
      activeUntil: planId === "monthly-standard" ? activeUntil : null,
      lessonCredits: planId === "bundle-8" ? lessonCredits : 0,
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      if (e.status === 403) return { error: "Нет прав администратора" };
      if (e.status === 400) return { error: "Проверь введённые данные" };
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось создать аккаунт" };
  }

  revalidatePath("/teacher");
  return { ok: true };
}
