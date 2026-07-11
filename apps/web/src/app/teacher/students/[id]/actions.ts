"use server";

import {
  ApiError,
  fetchPaymentPlans,
  setStudentPlan,
  updateStudentAccess,
  updateStudentProfile,
} from "@/lib/api";
import type { JlptLevel } from "@gojo/shared";
import { revalidatePath } from "next/cache";

export async function setStudentPlanAction(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!studentId || !planId) return;

  await setStudentPlan(studentId, planId);
  revalidatePath(`/teacher/students/${studentId}`);
}

export type StudentFormState = { error?: string; ok?: boolean };

function friendlyError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 409) return "Такой email уже используется другим аккаунтом";
    return `API ${e.status}: ${e.message}`;
  }
  return fallback;
}

export async function updateStudentAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return { error: "Не найден студент" };

  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const jlptLevel = String(formData.get("jlptLevel") ?? "").trim();
  const quizLevel = String(formData.get("quizLevel") ?? "").trim();

  try {
    await updateStudentProfile(studentId, {
      name: name || undefined,
      nickname: nickname || undefined,
      email: email || undefined,
      jlptLevel: jlptLevel ? (jlptLevel as JlptLevel) : null,
      quizLevel: quizLevel || null,
    });
  } catch (e) {
    return { error: friendlyError(e, "Не удалось сохранить") };
  }

  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/teacher/students");
  return { ok: true };
}

export async function updateAccessAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return { error: "Не найден студент" };

  const activeUntilRaw = String(formData.get("activeUntil") ?? "").trim();
  const lessonCreditsRaw = String(formData.get("lessonCredits") ?? "").trim();

  try {
    await updateStudentAccess(studentId, {
      activeUntil: activeUntilRaw ? new Date(activeUntilRaw).toISOString() : null,
      lessonCredits: lessonCreditsRaw === "" ? 0 : Number(lessonCreditsRaw),
    });
  } catch (e) {
    return { error: friendlyError(e, "Не удалось сохранить") };
  }

  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/teacher/students");
  return { ok: true };
}

export async function markPaidAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const studentId = String(formData.get("studentId") ?? "");
  const planId = String(formData.get("assignedPlanId") ?? "");
  if (!studentId) return { error: "Не найден студент" };
  if (!planId) return { error: "Сначала назначь тариф" };

  const plans = await fetchPaymentPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return { error: "Тариф не найден" };

  const activeUntil =
    plan.durationDays > 0
      ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  try {
    await updateStudentAccess(studentId, { activeUntil, lessonCredits: plan.lessonCredits });
  } catch (e) {
    return { error: friendlyError(e, "Не удалось сохранить") };
  }

  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/teacher/students");
  return { ok: true };
}

export async function markUnpaidAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return { error: "Не найден студент" };

  try {
    await updateStudentAccess(studentId, { activeUntil: null, lessonCredits: 0 });
  } catch (e) {
    return { error: friendlyError(e, "Не удалось сохранить") };
  }

  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/teacher/students");
  return { ok: true };
}
