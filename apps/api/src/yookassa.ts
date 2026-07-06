import { env } from "./env.ts";

const YOOKASSA_API = "https://api.yookassa.ru/v3";

type YooKassaAmount = {
  value: string;
  currency: "RUB";
};

export type YooKassaPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: YooKassaAmount;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  metadata?: Record<string, string>;
};

function credentials(): { shopId: string; secretKey: string } {
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
    throw new Error("YooKassa credentials are not configured");
  }
  return { shopId: env.YOOKASSA_SHOP_ID, secretKey: env.YOOKASSA_SECRET_KEY };
}

function authHeader() {
  const { shopId, secretKey } = credentials();
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

export function yookassaConfigured(): boolean {
  return Boolean(env.YOOKASSA_SHOP_ID && env.YOOKASSA_SECRET_KEY);
}

export async function createYooKassaPayment(input: {
  idempotenceKey: string;
  amountValue: string;
  currency: "RUB";
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<YooKassaPayment> {
  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": input.idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: input.amountValue,
        currency: input.currency,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl,
      },
      description: input.description,
      metadata: input.metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YooKassa create payment failed: ${res.status} ${body}`);
  }
  return (await res.json()) as YooKassaPayment;
}

export async function getYooKassaPayment(paymentId: string): Promise<YooKassaPayment> {
  const res = await fetch(`${YOOKASSA_API}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YooKassa get payment failed: ${res.status} ${body}`);
  }
  return (await res.json()) as YooKassaPayment;
}
