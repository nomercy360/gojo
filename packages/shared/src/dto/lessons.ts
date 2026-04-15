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
  recordingUrl: z.string().nullable(),
});
export type LessonDto = z.infer<typeof lessonDto>;

export const livekitTokenResponse = z.object({
  token: z.string(),
  url: z.string(),
  room: z.string(),
});
export type LivekitTokenResponse = z.infer<typeof livekitTokenResponse>;
