import { z } from "zod";
import { userDto } from "./users";

export const devLoginInput = z.object({
  email: z.string().email(),
  nickname: z.string().min(1).max(40).optional(),
  role: z.enum(["student", "teacher", "admin"]).default("student"),
});
export type DevLoginInput = z.infer<typeof devLoginInput>;

export const sessionResponse = z.object({
  token: z.string(),
  user: userDto,
});
export type SessionResponse = z.infer<typeof sessionResponse>;

export const signupInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  nickname: z.string().min(1).max(40).optional(),
  role: z.enum(["student", "teacher"]).default("student"),
});
export type SignupInput = z.infer<typeof signupInput>;

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
});
export type LoginInput = z.infer<typeof loginInput>;

/**
 * Telegram Login Widget callback payload.
 * See: https://core.telegram.org/widgets/login
 */
export const telegramAuthInput = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});
export type TelegramAuthInput = z.infer<typeof telegramAuthInput>;
