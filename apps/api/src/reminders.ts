import { personalEvents, user as userTable } from "@gojo/db";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "./db.ts";
import { env } from "./env.ts";

// Sends a Telegram reminder ~15min before a student's self-scheduled
// personal_events entry, if they've linked a telegramId (see users.ts PATCH
// /me). Runs as a plain in-process interval — this API is a single
// long-running container (not serverless), so no external scheduler needed.
// Only sends (never receives), so it can safely reuse the same bot token
// already used for lead notifications — sendMessage never conflicts with
// another process long-polling the same bot.
const REMINDER_LEAD_MINUTES = 15;
const CHECK_INTERVAL_MS = 60_000;

async function sendReminder(chatId: number, text: string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) throw new Error(`telegram sendMessage failed: ${res.status}`);
}

async function checkAndSendReminders(): Promise<void> {
  const now = new Date();
  const soon = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60_000);

  const due = await db
    .select({
      id: personalEvents.id,
      title: personalEvents.title,
      startsAt: personalEvents.startsAt,
      telegramId: userTable.telegramId,
    })
    .from(personalEvents)
    .innerJoin(userTable, eq(userTable.id, personalEvents.userId))
    .where(
      and(
        isNull(personalEvents.remindedAt),
        gte(personalEvents.startsAt, now),
        lte(personalEvents.startsAt, soon),
      ),
    );

  for (const row of due) {
    if (row.telegramId == null) continue;
    try {
      const time = row.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      await sendReminder(
        row.telegramId,
        `⏰ Напоминание: «${row.title}» в ${time} (через ~${REMINDER_LEAD_MINUTES} мин)`,
      );
      await db
        .update(personalEvents)
        .set({ remindedAt: new Date() })
        .where(eq(personalEvents.id, row.id));
    } catch (err) {
      // Leave remindedAt null — retried next tick. One failure shouldn't
      // block reminders for other rows in this batch.
      console.error(`reminder send failed for personal_event ${row.id}:`, err);
    }
  }
}

export function startReminderLoop(): void {
  setInterval(() => {
    checkAndSendReminders().catch((err) => console.error("reminder loop error:", err));
  }, CHECK_INTERVAL_MS);
}
