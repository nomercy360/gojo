import { payments, studentAccess } from "@gojo/db";
import { type PaymentPlanDto, createCheckoutInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import {
  type YooKassaPayment,
  createYooKassaPayment,
  getYooKassaPayment,
  yookassaConfigured,
} from "../yookassa.ts";

export const paymentPlans: PaymentPlanDto[] = [
  {
    id: "monthly-standard",
    title: "Месяц занятий",
    description: "Доступ к регулярным урокам и материалам на 30 дней.",
    amountValue: "12000.00",
    currency: "RUB",
    lessonCredits: 0,
    durationDays: 30,
  },
  {
    id: "bundle-8",
    title: "Пакет 8 уроков",
    description: "8 индивидуальных или групповых занятий без помесячного ограничения.",
    amountValue: "16000.00",
    currency: "RUB",
    lessonCredits: 8,
    durationDays: 0,
  },
];

export const paymentsRoute = new Hono<AuthContext>();

paymentsRoute.get("/plans", (c) => c.json(paymentPlans));

paymentsRoute.get("/me", requireAuth, async (c) => {
  const user = c.get("user")!;
  const [access] = await db
    .select()
    .from(studentAccess)
    .where(eq(studentAccess.userId, user.id))
    .limit(1);
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, user.id))
    .orderBy(desc(payments.createdAt))
    .limit(20);

  const now = Date.now();
  const assignedPlan = paymentPlans.find((p) => p.id === access?.assignedPlanId) ?? null;
  return c.json({
    access: {
      activeUntil: access?.activeUntil ? access.activeUntil.toISOString() : null,
      lessonCredits: access?.lessonCredits ?? 0,
      trialUsed: Boolean(access?.trialUsed),
      isActive: Boolean(
        (access?.activeUntil && access.activeUntil.getTime() > now) ||
          (access?.lessonCredits ?? 0) > 0,
      ),
      assignedPlanId: access?.assignedPlanId ?? null,
    },
    assignedPlan,
    payments: rows.map((p) => ({
      id: p.id,
      providerPaymentId: p.providerPaymentId,
      planId: p.planId,
      amountValue: p.amountValue,
      currency: p.currency,
      status: p.status,
      confirmationUrl: p.confirmationUrl,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

paymentsRoute.post("/checkout", requireAuth, zValidator("json", createCheckoutInput), async (c) => {
  const user = c.get("user")!;
  if (user.role !== "student") {
    throw new HTTPException(403, { message: "only students can create payments" });
  }
  if (!yookassaConfigured()) {
    throw new HTTPException(503, { message: "YooKassa credentials are not configured" });
  }

  const { planId } = c.req.valid("json");
  const plan = paymentPlans.find((p) => p.id === planId);
  if (!plan) throw new HTTPException(400, { message: "unknown plan" });

  const [access] = await db
    .select({ assignedPlanId: studentAccess.assignedPlanId })
    .from(studentAccess)
    .where(eq(studentAccess.userId, user.id))
    .limit(1);
  if (!access?.assignedPlanId || access.assignedPlanId !== planId) {
    throw new HTTPException(403, { message: "plan not assigned to this student" });
  }

  const idempotenceKey = crypto.randomUUID();
  const [local] = await db
    .insert(payments)
    .values({
      userId: user.id,
      idempotenceKey,
      planId: plan.id,
      amountValue: plan.amountValue,
      currency: plan.currency,
    })
    .returning();
  if (!local) throw new HTTPException(500, { message: "failed to create payment" });

  const yooPayment = await createYooKassaPayment({
    idempotenceKey,
    amountValue: plan.amountValue,
    currency: plan.currency,
    description: `Gojo Learn: ${plan.title}`,
    returnUrl: `${env.WEB_ORIGIN}/payments/return?payment=${local.id}`,
    metadata: {
      local_payment_id: local.id,
      user_id: user.id,
      plan_id: plan.id,
    },
  });

  const confirmationUrl = yooPayment.confirmation?.confirmation_url;
  if (!confirmationUrl) {
    throw new HTTPException(502, { message: "YooKassa did not return confirmation_url" });
  }

  await db
    .update(payments)
    .set({
      providerPaymentId: yooPayment.id,
      status: toLocalStatus(yooPayment.status),
      confirmationUrl,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, local.id));

  return c.json({
    paymentId: local.id,
    status: toLocalStatus(yooPayment.status),
    confirmationUrl,
  });
});

paymentsRoute.post("/yookassa/webhook", async (c) => {
  const payload = (await c.req.json().catch(() => null)) as YooKassaWebhook | null;
  if (!payload?.object?.id || !payload.event?.startsWith("payment.")) {
    return c.json({ ok: true });
  }

  try {
    const current = await getYooKassaPayment(payload.object.id);
    const [local] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, current.id))
      .limit(1);
    if (!local) return c.json({ ok: true });

    const status = toLocalStatus(current.status);
    await db
      .update(payments)
      .set({
        status,
        paidAt: status === "succeeded" ? new Date() : local.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, local.id));

    if (status === "succeeded") {
      await grantPlanAccess(local.userId, local.planId);
    }
  } catch (err) {
    console.error("YooKassa webhook handling failed:", err);
  }

  return c.json({ ok: true });
});

type YooKassaWebhook = {
  type: "notification";
  event: string;
  object: YooKassaPayment;
};

function toLocalStatus(status: YooKassaPayment["status"]) {
  if (status === "succeeded") return "succeeded";
  if (status === "canceled") return "canceled";
  return "pending";
}

async function grantPlanAccess(userId: string, planId: string) {
  const plan = paymentPlans.find((p) => p.id === planId);
  if (!plan) return;

  const [existing] = await db
    .select()
    .from(studentAccess)
    .where(eq(studentAccess.userId, userId))
    .limit(1);
  const now = new Date();
  const baseActiveUntil =
    existing?.activeUntil && existing.activeUntil.getTime() > now.getTime()
      ? existing.activeUntil
      : now;
  const activeUntil =
    plan.durationDays > 0
      ? new Date(baseActiveUntil.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
      : existing?.activeUntil;
  const lessonCredits = (existing?.lessonCredits ?? 0) + plan.lessonCredits;

  await db
    .insert(studentAccess)
    .values({
      userId,
      activeUntil,
      lessonCredits,
      trialUsed: existing?.trialUsed ?? false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: studentAccess.userId,
      set: {
        activeUntil,
        lessonCredits,
        updatedAt: now,
      },
    });
}
