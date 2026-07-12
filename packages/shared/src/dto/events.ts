import { z } from "zod";

/**
 * Allow-list of product funnel events. Extend here when a new surface gets
 * instrumented — the API rejects unknown names so the table stays queryable.
 *
 * Kana funnel reads in order: open → first_answer → row_complete →
 * word_unlocked → save_clicked / wall_shown → ask_shown → ask_clicked →
 * lead_submitted.
 */
export const funnelEventNameSchema = z.enum([
  // kana trainer
  "kana_open",
  "kana_first_answer",
  "kana_row_complete",
  "kana_word_unlocked",
  "kana_review_complete",
  "kana_save_clicked",
  "kana_wall_shown",
  "kana_ask_shown",
  "kana_ask_clicked",
  // lead capture (booking modal, any source)
  "booking_open",
  "lead_submitted",
]);
export type FunnelEventName = z.infer<typeof funnelEventNameSchema>;

export const trackEventInput = z.object({
  name: funnelEventNameSchema,
  anonymousId: z.string().trim().min(8).max(64),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type TrackEventInput = z.infer<typeof trackEventInput>;
