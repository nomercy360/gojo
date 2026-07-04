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
