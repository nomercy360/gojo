import { z } from "zod";
import { userDto } from "./users";

export const devLoginInput = z.object({
  email: z.string().email(),
  nickname: z.string().min(1).max(40).optional(),
  role: z.enum(["student", "admin"]).default("student"),
});
export type DevLoginInput = z.infer<typeof devLoginInput>;

export const sessionResponse = z.object({
  token: z.string(),
  user: userDto,
});
export type SessionResponse = z.infer<typeof sessionResponse>;

/** Admin-provisioned student account. Auth is passwordless. */
export const createStudentInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  nickname: z.string().min(1).max(40).optional(),
  telegramUsername: z
    .string()
    .regex(/^[a-z0-9_]{5,32}$/)
    .optional(),
  telegramId: z.number().int().positive().nullable().optional(),
  planId: z.string().min(1),
  activeUntil: z.string().datetime().nullable(),
  lessonCredits: z.number().int().min(0).max(1000),
});
export type CreateStudentInput = z.infer<typeof createStudentInput>;

