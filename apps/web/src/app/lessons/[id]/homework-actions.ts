"use server";

import type { HomeworkStatus } from "@gojo/shared";
import { setHomeworkStatus } from "@/lib/api";

export async function setHomeworkStatusAction(
  lessonId: string,
  studentId: string,
  status: HomeworkStatus,
) {
  return setHomeworkStatus(lessonId, studentId, status);
}
