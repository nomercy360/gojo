import { env } from "./env.ts";

export type LeadNotification = {
  kind: string;
  name: string;
  telegram?: string | null;
  email?: string | null;
  phone?: string | null;
  level?: string | null;
  goal?: string | null;
};

export async function notifyLead(l: LeadNotification): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_LEAD_CHAT_ID;
  if (!token || !chatId) return;
  const lines = [
    `🎯 Новая заявка (${l.kind})`,
    `Имя: ${l.name}`,
    ...(l.telegram ? [`Telegram: @${l.telegram}`] : []),
    ...(l.email ? [`Email: ${l.email}`] : []),
    ...(l.phone ? [`Телефон: ${l.phone}`] : []),
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
