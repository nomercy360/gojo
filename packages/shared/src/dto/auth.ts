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

/** Manual lead conversion after the trial lesson. Billing remains a later step. */
export const convertLeadInput = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320).nullable(),
    nickname: z.string().trim().min(1).max(40).optional(),
    telegramUsername: z
      .string()
      .regex(/^[a-z0-9_]{5,32}$/)
      .nullable(),
    telegramId: z.number().int().positive().safe().nullable(),
    jlptLevel: z.enum(["N5", "N4", "N3", "N2"]),
    planId: z.string().min(1).nullable(),
    existingStudentId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.email || value.telegramId), {
    message: "email_or_telegram_id_required",
    path: ["email"],
  });
export type ConvertLeadInput = z.infer<typeof convertLeadInput>;
