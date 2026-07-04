"use server";

import type { HomeworkStatus, JlptLevel } from "@gojo/shared";
import { setHomeworkStatus, setStudentLevel } from "@/lib/api";

export async function setHomeworkStatusAction(
  lessonId: string,
  studentId: string,
  status: HomeworkStatus,
) {
  return setHomeworkStatus(lessonId, studentId, status);
}

export async function setStudentLevelAction(
  lessonId: string,
  studentId: string,
  jlptLevel: JlptLevel,
) {
  return setStudentLevel(lessonId, studentId, jlptLevel);
}
