import { z } from "zod";

export const userRoleSchema = z.enum(["student", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
  jlptLevel: z.string().nullable(),
  quizLevel: z.string().nullable(),
  telegramId: z.number().nullable(),
  createdAt: z.string(),
});
export type UserDto = z.infer<typeof userDto>;

export const PRESET_AVATARS = ["kitsune", "tanuki", "kappa", "tengu", "neko", "sensei"] as const;
export type PresetAvatar = (typeof PRESET_AVATARS)[number];

export const AVATAR_PRESET_PREFIX = "preset:";

/**
 * avatarUrl field can hold either a real URL (Minio upload) or `preset:<id>`
 * referencing a bundled default avatar rendered on the client.
 */
export const avatarValueSchema = z.union([
  z.string().url(),
  z.string().regex(new RegExp(`^${AVATAR_PRESET_PREFIX}(${PRESET_AVATARS.join("|")})$`)),
  z.literal(""),
]);

export const updateProfileInput = z.object({
  name: z.string().min(1).max(200).optional(),
  nickname: z.string().min(1).max(40).optional(),
  avatarUrl: avatarValueSchema.optional(),
  // Numeric Telegram user ID (from @userinfobot) — enables Telegram reminders.
  // null unlinks.
  telegramId: z.number().int().positive().nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;
