"use server";

import {
  type AttendanceStatus,
  setHomeworkStatus,
  setStudentLevel,
  updatePostLesson,
} from "@/lib/api";
import type { HomeworkStatus, JlptLevel } from "@gojo/shared";

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

export async function updatePostLessonAction(
  lessonId: string,
  studentId: string,
  body: {
    attendanceStatus?: AttendanceStatus;
    postLessonNote?: string | null;
    recommendation?: string | null;
  },
) {
  return updatePostLesson(lessonId, studentId, body);
}
