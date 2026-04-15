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
