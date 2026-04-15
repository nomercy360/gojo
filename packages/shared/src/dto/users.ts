import { z } from "zod";

export const userRoleSchema = z.enum(["student", "teacher", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
  jlptLevel: z.string().nullable(),
  createdAt: z.string(),
});
export type UserDto = z.infer<typeof userDto>;
