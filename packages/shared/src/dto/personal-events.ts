import { z } from "zod";

export const personalEventDto = z.object({
  id: z.string().uuid(),
  title: z.string(),
  startsAt: z.string(),
  durationMinutes: z.number(),
});
export type PersonalEventDto = z.infer<typeof personalEventDto>;

export const createPersonalEventInput = z.object({
  title: z.string().trim().min(1).max(200),
  startsAt: z.string().datetime(), // ISO string, e.g. new Date(...).toISOString()
  durationMinutes: z.number().int().min(5).max(600).default(30),
});
export type CreatePersonalEventInput = z.infer<typeof createPersonalEventInput>;
