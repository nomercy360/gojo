"use server";

import {
  type AttendanceStatus,
  reviewSubmission,
  setHomeworkStatus,
  setStudentLevel,
  submitHomework,
  updatePostLesson,
} from "@/lib/api";
import type { HomeworkStatus, JlptLevel, ReviewSubmissionInput } from "@gojo/shared";

export async function submitHomeworkAction(lessonId: string, content: string) {
  return submitHomework(lessonId, content);
}

export async function reviewSubmissionAction(submissionId: string, body: ReviewSubmissionInput) {
  return reviewSubmission(submissionId, body);
}

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
