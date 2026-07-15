"use server";

import { setStudentPlan } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function setStudentPlanAction(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!studentId || !planId) return;

  await setStudentPlan(studentId, planId);
  revalidatePath("/teacher");
  revalidatePath(`/teacher/students/${studentId}`);
}
