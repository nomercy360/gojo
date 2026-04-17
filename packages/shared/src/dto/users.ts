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

export const PRESET_AVATARS = [
  "kitsune",
  "tanuki",
  "kappa",
  "tengu",
  "neko",
  "sensei",
] as const;
export type PresetAvatar = (typeof PRESET_AVATARS)[number];

export const AVATAR_PRESET_PREFIX = "preset:";

/**
 * avatarUrl field can hold either a real URL (Minio upload) or `preset:<id>`
 * referencing a bundled default avatar rendered on the client.
 */
export const avatarValueSchema = z.union([
  z.string().url(),
  z.string().regex(
    new RegExp(`^${AVATAR_PRESET_PREFIX}(${PRESET_AVATARS.join("|")})$`),
  ),
  z.literal(""),
]);

export const updateProfileInput = z.object({
  nickname: z.string().min(1).max(40).optional(),
  avatarUrl: avatarValueSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;
