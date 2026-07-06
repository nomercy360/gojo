import { z } from "zod";

export const paymentStatusSchema = z.enum(["pending", "succeeded", "canceled"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const paymentPlanDto = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  amountValue: z.string(),
  currency: z.literal("RUB"),
  lessonCredits: z.number().int().min(0),
  durationDays: z.number().int().min(0),
});
export type PaymentPlanDto = z.infer<typeof paymentPlanDto>;

export const createCheckoutInput = z.object({
  planId: z.string().min(1),
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutInput>;

export const checkoutResponseDto = z.object({
  paymentId: z.string().uuid(),
  status: paymentStatusSchema,
  confirmationUrl: z.string().url(),
});
export type CheckoutResponseDto = z.infer<typeof checkoutResponseDto>;

export const paymentDto = z.object({
  id: z.string().uuid(),
  providerPaymentId: z.string().nullable(),
  planId: z.string(),
  amountValue: z.string(),
  currency: z.string(),
  status: paymentStatusSchema,
  confirmationUrl: z.string().nullable(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PaymentDto = z.infer<typeof paymentDto>;

export const paymentAccessDto = z.object({
  activeUntil: z.string().nullable(),
  lessonCredits: z.number().int(),
  trialUsed: z.boolean(),
  isActive: z.boolean(),
});
export type PaymentAccessDto = z.infer<typeof paymentAccessDto>;

export const paymentsMeDto = z.object({
  access: paymentAccessDto,
  payments: z.array(paymentDto),
});
export type PaymentsMeDto = z.infer<typeof paymentsMeDto>;
