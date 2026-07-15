"use server";

import { ApiError, createStudent } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateStudentState = { error?: string; ok?: boolean };

export async function createStudentAction(
  _prev: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim() || undefined;
  const planId = String(formData.get("planId") ?? "").trim();

  if (!email || !name) return { error: "Заполни email и имя" };
  if (!planId) return { error: "Выбери тариф" };

  try {
    await createStudent({ email, name, nickname, planId });
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
