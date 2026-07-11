import { z } from "zod";

export const homeworkStatusSchema = z.enum(["pending", "done", "missed"]);
export type HomeworkStatus = z.infer<typeof homeworkStatusSchema>;

export const lessonHomeworkDto = z.object({
  bookingId: z.string().uuid(),
  studentId: z.string(),
  nickname: z.string().nullable(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  status: homeworkStatusSchema,
  markedAt: z.string().nullable(),
});
export type LessonHomeworkDto = z.infer<typeof lessonHomeworkDto>;

export const setHomeworkStatusInput = z.object({
  status: homeworkStatusSchema,
});
export type SetHomeworkStatusInput = z.infer<typeof setHomeworkStatusInput>;

export const homeworkSubmissionStatusSchema = z.enum([
  "submitted",
  "ai_reviewed",
  "approved",
  "needs_revision",
]);
export type HomeworkSubmissionStatus = z.infer<typeof homeworkSubmissionStatusSchema>;

/**
 * Claude first-pass markup stored in homework_submissions.aiReview. All
 * free-text fields are in Russian — it's shown to both student and teacher.
 */
export const homeworkAiReviewSchema = z.object({
  summary: z.string(),
  score: z.number().int().min(1).max(5),
  errors: z.array(
    z.object({
      quote: z.string(),
      issue: z.string(),
      correction: z.string(),
      explanation: z.string(),
    }),
  ),
  naturalness: z.string(),
  targetVocabUsed: z.array(z.string()),
  targetVocabMissing: z.array(z.string()),
  suggestedDecision: z.enum(["approve", "needs_revision"]),
});
export type HomeworkAiReview = z.infer<typeof homeworkAiReviewSchema>;

export const submitHomeworkInput = z.object({
  content: z.string().trim().min(10).max(8000),
});
export type SubmitHomeworkInput = z.infer<typeof submitHomeworkInput>;

export const homeworkSubmissionDto = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  studentId: z.string(),
  content: z.string(),
  status: homeworkSubmissionStatusSchema,
  aiReview: homeworkAiReviewSchema.nullable(),
  aiReviewError: z.string().nullable(),
  teacherComment: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type HomeworkSubmissionDto = z.infer<typeof homeworkSubmissionDto>;

export const teacherSubmissionDto = homeworkSubmissionDto.extend({
  nickname: z.string().nullable(),
  email: z.string(),
});
export type TeacherSubmissionDto = z.infer<typeof teacherSubmissionDto>;

export const reviewSubmissionInput = z.object({
  decision: z.enum(["approved", "needs_revision"]),
  comment: z.string().trim().max(4000).nullable().optional(),
});
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionInput>;

export const trainingActivitySchema = z.enum(["review", "kana", "kanji"]);
export type TrainingActivity = z.infer<typeof trainingActivitySchema>;

export const trackTrainingInput = z.object({
  activity: trainingActivitySchema,
  seconds: z.number().int().min(1).max(60),
});
export type TrackTrainingInput = z.infer<typeof trackTrainingInput>;

export const trainingTotalsDto = z.object({
  reviewSeconds: z.number(),
  kanaSeconds: z.number(),
  kanjiSeconds: z.number(),
  totalSeconds: z.number(),
});
export type TrainingTotalsDto = z.infer<typeof trainingTotalsDto>;
