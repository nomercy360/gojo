import { afterAll, describe, expect, mock, test } from "bun:test";
import { payments, studentAccess, user } from "@gojo/db";
import { eq } from "drizzle-orm";

// The webhook re-fetches the payment from YooKassa to authenticate the
// callback; stub that call so the test exercises only our grant logic.
mock.module("../yookassa.ts", () => ({
  yookassaConfigured: () => true,
  createYooKassaPayment: async () => {
    throw new Error("not used in this test");
  },
  getYooKassaPayment: async (id: string) => ({ id, status: "succeeded" }),
}));

const { db } = await import("../db.ts");
const { paymentsRoute } = await import("./payments.ts");

const userId = `test-webhook-${crypto.randomUUID()}`;
const providerPaymentId = `test-yk-${crypto.randomUUID()}`;

afterAll(async () => {
  // Cascades to payments and studentAccess.
  await db.delete(user).where(eq(user.id, userId));
});

async function postWebhook() {
  return paymentsRoute.request("/yookassa/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "notification",
      event: "payment.succeeded",
      object: { id: providerPaymentId, status: "succeeded" },
    }),
  });
}

describe("POST /yookassa/webhook", () => {
  test("a redelivered payment.succeeded grants plan access exactly once", async () => {
    await db.insert(user).values({ id: userId, name: "Webhook Test", email: `${userId}@test.local` });
    await db.insert(payments).values({
      userId,
      idempotenceKey: crypto.randomUUID(),
      planId: "bundle-8",
      amountValue: "16000.00",
      currency: "RUB",
      providerPaymentId,
    });

    const first = await postWebhook();
    expect(first.status).toBe(200);

    const [afterFirst] = await db
      .select()
      .from(studentAccess)
      .where(eq(studentAccess.userId, userId));
    expect(afterFirst?.lessonCredits).toBe(8);

    // YooKassa retries payment.succeeded on any non-2xx; a duplicate must not
    // re-add credits.
    const second = await postWebhook();
    expect(second.status).toBe(200);

    const [afterSecond] = await db
      .select()
      .from(studentAccess)
      .where(eq(studentAccess.userId, userId));
    expect(afterSecond?.lessonCredits).toBe(8);

    const [row] = await db.select().from(payments).where(eq(payments.userId, userId));
    expect(row?.status).toBe("succeeded");
    expect(row?.paidAt).not.toBeNull();
  });
});
