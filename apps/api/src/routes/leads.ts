import { leads } from "@gojo/db";
import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";

const leadInput = z.object({
  kind: z.enum(["booking", "guide"]).default("booking"),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  contact: z.string().trim().max(200).optional(),
  level: z.string().trim().max(200).optional(),
  goal: z.string().trim().max(500).optional(),
});

type LeadInput = z.infer<typeof leadInput>;

// Public — the landing lead forms are pre-auth. Kept minimal; add rate limiting
// if it attracts spam.
export const leadsRoute = new Hono();

leadsRoute.post("/", zValidator("json", leadInput), async (c) => {
  const data = c.req.valid("json");
  const [lead] = await db.insert(leads).values(data).returning({ id: leads.id });
  void notifyLead(data); // best-effort; never blocks the response
  return c.json({ ok: true, id: lead?.id }, 201);
});

leadsRoute.post("/link-current", requireAuth, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const linked = await db
    .update(leads)
    .set({ userId: user.id })
    .where(and(eq(leads.email, user.email), isNull(leads.userId)))
    .returning({ id: leads.id });

  return c.json({ ok: true, linked: linked.length });
});

async function notifyLead(l: LeadInput): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_LEAD_CHAT_ID;
  if (!token || !chatId) return;
  const lines = [
    `🎯 Новая заявка (${l.kind})`,
    `Имя: ${l.name}`,
    `Email: ${l.email}`,
    ...(l.contact ? [`Контакт: ${l.contact}`] : []),
    ...(l.level ? [`Уровень: ${l.level}`] : []),
    ...(l.goal ? [`Цель: ${l.goal}`] : []),
  ];
  const text = lines.join("\n");
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // notification is best-effort — the lead is already persisted
  }
}
