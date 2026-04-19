import { z } from "zod";

export const lessonStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);
export type LessonStatus = z.infer<typeof lessonStatusSchema>;

/**
 * View-model state for the lesson join/book button, computed per viewer
 * on the server.
 *
 * - `bookable` — not booked, slot available.
 * - `full` — not booked, no seats.
 * - `waiting` — booked/owner, but before the join window (> T-15m).
 * - `joinable` — booked/owner, inside the join window (T-15m .. T+duration).
 * - `ended` — past endsAt (+ grace), regardless of booking.
 * - `cancelled` — teacher cancelled the lesson.
 */
export const lessonJoinStateSchema = z.enum([
  "bookable",
  "full",
  "waiting",
  "joinable",
  "ended",
  "cancelled",
]);
export type LessonJoinState = z.infer<typeof lessonJoinStateSchema>;

export const JOIN_WINDOW_MIN = 15;

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
  joinState: lessonJoinStateSchema.optional(),
  joinOpensAt: z.string().optional(),
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
