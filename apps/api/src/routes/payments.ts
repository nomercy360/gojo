import { payments, studentAccess } from "@gojo/db";
import { type PaymentPlanDto, type PaymentsMeDto, createCheckoutInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, ne } from "drizzle-orm";
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
    id: "individual-8",
    title: "Индивидуально — 8 занятий",
    description: "8 индивидуальных онлайн-занятий по 90 минут и доступ к учебным материалам.",
    amountValue: "23200.00",
    currency: "RUB",
    lessonCredits: 8,
    durationDays: 0,
  },
  {
    id: "group-8",
    title: "Группа — 8 занятий",
    description: "8 групповых онлайн-занятий по 90 минут в группе до 8 человек.",
    amountValue: "8720.00",
    currency: "RUB",
    lessonCredits: 8,
    durationDays: 0,
  },
  {
    id: "recorded-30",
    title: "Заочный — 30 дней",
    description:
      "Записи 8 групповых занятий, учебные материалы, карточки и AI-практика на 30 дней.",
    amountValue: "6400.00",
    currency: "RUB",
    lessonCredits: 0,
    durationDays: 30,
  },
];

export async function getStudentAccessSnapshot(userId: string): Promise<PaymentsMeDto> {
  const [access] = await db
    .select()
    .from(studentAccess)
    .where(eq(studentAccess.userId, userId))
    .limit(1);
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(20);

  const now = Date.now();
  const assignedPlan = paymentPlans.find((p) => p.id === access?.assignedPlanId) ?? null;
  return {
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
  };
}

export const paymentsRoute = new Hono<AuthContext>();

paymentsRoute.get("/plans", (c) => c.json(paymentPlans));

paymentsRoute.get("/me", requireAuth, async (c) => {
  const user = c.get("user")!;
  return c.json(await getStudentAccessSnapshot(user.id));
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

    // `succeeded` is terminal: the conditional update freezes the row after
    // the first success, so YooKassa's redelivery of `payment.succeeded`
    // (retried on any non-2xx) can't re-grant credits or extend the plan.
    const status = toLocalStatus(current.status);
    const [transitioned] = await db
      .update(payments)
      .set({
        status,
        paidAt: status === "succeeded" ? new Date() : local.paidAt,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, local.id), ne(payments.status, "succeeded")))
      .returning({ id: payments.id });

    if (status === "succeeded" && transitioned) {
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
      assignedPlanId: plan.id,
      activeUntil,
      lessonCredits,
      trialUsed: existing?.trialUsed ?? false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: studentAccess.userId,
      set: {
        assignedPlanId: plan.id,
        activeUntil,
        lessonCredits,
        updatedAt: now,
      },
    });
}
