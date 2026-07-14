"use server";

import { createTrialLessonForLead, updateTeacherLead } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateLeadAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return;

  const nextFollowUpRaw = String(formData.get("nextFollowUpAt") ?? "");
  await updateTeacherLead(leadId, {
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? "") || null,
    nextFollowUpAt: nextFollowUpRaw ? new Date(nextFollowUpRaw).toISOString() : null,
  });
  revalidatePath("/teacher/leads");
}

export async function createTrialLessonAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMin = Number(formData.get("duration") ?? 50);
  const title = String(formData.get("title") ?? "Пробный урок").trim();

  if (!leadId || !date || !time) return;
  const startsAt = new Date(`${date}T${time}`);
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
