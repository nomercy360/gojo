"use server";

import { ApiError, createTrialLessonForLead, updateTeacherLead } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TeacherActionState } from "../actions";

export async function updateLeadAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { error: "Заявка не найдена" };

  const nextFollowUpRaw = String(formData.get("nextFollowUpAt") ?? "");
  try {
    await updateTeacherLead(leadId, {
      status: String(formData.get("status") ?? ""),
      notes: String(formData.get("notes") ?? "") || null,
      nextFollowUpAt: nextFollowUpRaw ? new Date(nextFollowUpRaw).toISOString() : null,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Не удалось сохранить заявку" };
  }
  revalidatePath("/teacher");
  revalidatePath("/teacher/leads");
  return { ok: true };
}

export async function createTrialLessonAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMin = Number(formData.get("duration") ?? 50);
  const title = String(formData.get("title") ?? "Пробный урок").trim();
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));

  if (!leadId || !date || !time) return;
  if (Number.isNaN(startsAt.getTime())) return;
  if (startsAt.getTime() <= Date.now()) return;
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);

  const lesson = await createTrialLessonForLead(leadId, {
    title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });
  revalidatePath("/teacher/leads");
  revalidatePath("/teacher");
  redirect(`/teacher/lessons/${lesson.id}`);
}
