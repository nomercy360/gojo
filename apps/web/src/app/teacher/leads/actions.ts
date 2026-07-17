"use server";

import {
  ApiError,
  type LeadConversionMatch,
  createTrialLessonForLead,
  markLeadTrialDone,
  sendLeadLoginLink,
  updateTeacherLead,
} from "@/lib/api";
import { revalidatePath } from "next/cache";
import type { TeacherActionState } from "../actions";

function revalidateLeads() {
  revalidatePath("/teacher");
  revalidatePath("/teacher/leads");
}

// CRM overlay: the fields a teacher amends by hand. Status is machine-driven
// and deliberately not accepted here — the only manual override is reject.
export async function updateLeadAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { error: "Заявка не найдена" };

  const nextFollowUpRaw = String(formData.get("nextFollowUpAt") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Имя не может быть пустым" };
  try {
    await updateTeacherLead(leadId, {
      notes: String(formData.get("notes") ?? "") || null,
      nextFollowUpAt: nextFollowUpRaw ? new Date(nextFollowUpRaw).toISOString() : null,
      name,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      telegram: String(formData.get("telegram") ?? "").trim() || null,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      return { error: "Проверь контактные данные (email должен быть корректным)" };
    }
    return { error: e instanceof ApiError ? e.message : "Не удалось сохранить заявку" };
  }
  revalidateLeads();
  return { ok: true };
}

export async function rejectLeadAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { error: "Заявка не найдена" };
  try {
    await updateTeacherLead(leadId, { status: "lost" });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Не удалось отклонить заявку" };
  }
  revalidateLeads();
  return { ok: true };
}

export async function createTrialLessonAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const leadId = String(formData.get("leadId") ?? "");
  const durationMin = Number(formData.get("duration") ?? 50);
  const title = String(formData.get("title") ?? "Пробный урок").trim();
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim() || undefined;
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));

  if (!leadId) return { error: "Заявка не найдена" };
  if (Number.isNaN(startsAt.getTime())) return { error: "Укажи дату и время" };
  if (startsAt.getTime() <= Date.now()) return { error: "Урок должен быть в будущем" };
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);

  try {
    await createTrialLessonForLead(leadId, {
      title: title || "Пробный урок",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      meetingUrl,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Не удалось создать урок" };
  }
  revalidateLeads();
  return { ok: true };
}

export async function markTrialDoneAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const leadId = String(formData.get("leadId") ?? "");
  const jlptLevel = String(formData.get("jlptLevel") ?? "");
  if (!leadId) return { error: "Заявка не найдена" };
  if (!["N5", "N4", "N3", "N2"].includes(jlptLevel)) {
    return { error: "Выбери уровень по итогам пробного урока" };
  }
  try {
    await markLeadTrialDone(leadId, { jlptLevel: jlptLevel as "N5" | "N4" | "N3" | "N2" });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Не удалось отметить пробный" };
  }
  revalidateLeads();
  return { ok: true };
}

export type SendLeadLinkState = TeacherActionState & {
  matches?: LeadConversionMatch[];
  sentEmail?: boolean;
  sentTelegram?: boolean;
};

export async function sendLeadLinkAction(
  _prev: SendLeadLinkState,
  formData: FormData,
): Promise<SendLeadLinkState> {
  const leadId = String(formData.get("leadId") ?? "");
  const existingStudentId = String(formData.get("existingStudentId") ?? "").trim() || undefined;
  if (!leadId) return { error: "Заявка не найдена" };
  try {
    const result = await sendLeadLoginLink(leadId, { existingStudentId });
    if (!result.ok) return { matches: result.matches };
    revalidateLeads();
    return { ok: true, sentEmail: result.sentEmail, sentTelegram: result.sentTelegram };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.message.includes("no_delivery_channel")) {
        return { error: "Нет канала доставки — добавь email или Telegram" };
      }
      if (e.message.includes("trial_not_done") || e.message.includes("level_not_assessed")) {
        return { error: "Сначала отметь пробный урок пройденным и выставь уровень" };
      }
      return { error: e.message };
    }
    return { error: "Не удалось отправить ссылку" };
  }
}
