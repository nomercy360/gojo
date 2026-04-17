import { z } from "zod";

export const lessonStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);
export type LessonStatus = z.infer<typeof lessonStatusSchema>;

export const lessonDto = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  teacherNickname: z.string().nullable(),
  title: z.string(),
  status: lessonStatusSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  maxStudents: z.number(),
  studentCount: z.number().optional(),
  jlptLevel: z.string().nullable(),
  recordingUrl: z.string().nullable(),
  booked: z.boolean().optional(),
});
export type LessonDto = z.infer<typeof lessonDto>;

export const lessonMaterialDto = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  title: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  createdAt: z.string(),
});
export type LessonMaterialDto = z.infer<typeof lessonMaterialDto>;

export const studentStatsDto = z.object({
  completedLessons: z.number(),
  upcomingLessons: z.number(),
  totalBookings: z.number(),
});
export type StudentStatsDto = z.infer<typeof studentStatsDto>;

export const livekitTokenResponse = z.object({
  token: z.string(),
  url: z.string(),
  room: z.string(),
});
export type LivekitTokenResponse = z.infer<typeof livekitTokenResponse>;
