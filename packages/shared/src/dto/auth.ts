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

/** Admin-provisioned student account. Auth is passwordless — the student signs
 * in with Telegram or the magic-link invite emailed on creation (see POST
 * /teacher/students). */
export const createStudentInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  nickname: z.string().min(1).max(40).optional(),
  planId: z.string().min(1),
});
export type CreateStudentInput = z.infer<typeof createStudentInput>;
