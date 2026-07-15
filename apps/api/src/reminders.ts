import { bookings, lessons, notificationLogs, personalEvents, user as userTable } from "@gojo/db";
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

// Minimal shape for an inline-keyboard reply markup. `login_url` is Telegram's
// native login button — smoother than a plain `url` button (no raw-URL
// "Open this link?" warning), but its domain must be registered via BotFather
// /setdomain and match the button URL.
export type TelegramReplyMarkup = {
  inline_keyboard: {
    text: string;
    url?: string;
    login_url?: { url: string; request_write_access?: boolean };
    callback_data?: string;
  }[][];
};

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  event = "telegram.message",
  userId?: string,
  replyMarkup?: TelegramReplyMarkup,
): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
  if (!res.ok) {
    const error = `telegram sendMessage failed: ${res.status}`;
    await logNotification(event, "telegram", String(chatId), "failed", userId, error);
    throw new Error(error);
  }
  await logNotification(event, "telegram", String(chatId), "sent", userId);
  return true;
}

export async function logNotification(
  event: string,
  channel: string,
  recipient: string,
  status: string,
  userId?: string,
  error?: string,
) {
  await db
    .insert(notificationLogs)
    .values({ event, channel, recipient, status, userId, error })
    .catch((err) => console.error("notification log failed:", err));
}

async function checkAndSendReminders(): Promise<void> {
  const now = new Date();
  const soon15 = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60_000);
  const soon24h = new Date(now.getTime() + 24 * 60 * 60_000);

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
        lte(personalEvents.startsAt, soon15),
      ),
    );

  for (const row of due) {
    if (row.telegramId == null) continue;
    try {
      const time = row.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      const sent = await sendTelegramMessage(
        row.telegramId,
        `⏰ Напоминание: «${row.title}» в ${time} (через ~${REMINDER_LEAD_MINUTES} мин)`,
        "personal_event.reminder_15m",
      );
      if (!sent) continue;
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

  const lessonDue24h = await db
    .select({
      bookingId: bookings.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      telegramId: userTable.telegramId,
    })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .innerJoin(userTable, eq(userTable.id, bookings.studentId))
    .where(
      and(
        isNull(bookings.reminder24hSentAt),
        eq(lessons.status, "scheduled"),
        gte(lessons.startsAt, now),
        lte(lessons.startsAt, soon24h),
      ),
    );

  for (const row of lessonDue24h) {
    if (row.telegramId == null) continue;
    try {
      const when = row.startsAt.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const sent = await sendTelegramMessage(
        row.telegramId,
        `🎌 Завтра урок: «${row.title}» — ${when}`,
        "lesson.reminder_24h",
      );
      if (!sent) continue;
      await db
        .update(bookings)
        .set({ reminder24hSentAt: new Date() })
        .where(eq(bookings.id, row.bookingId));
    } catch (err) {
      console.error(`24h reminder send failed for booking ${row.bookingId}:`, err);
    }
  }

  const lessonDue15m = await db
    .select({
      bookingId: bookings.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      telegramId: userTable.telegramId,
    })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .innerJoin(userTable, eq(userTable.id, bookings.studentId))
    .where(
      and(
        isNull(bookings.reminder15mSentAt),
        eq(lessons.status, "scheduled"),
        gte(lessons.startsAt, now),
        lte(lessons.startsAt, soon15),
      ),
    );

  for (const row of lessonDue15m) {
    if (row.telegramId == null) continue;
    try {
      const time = row.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      const sent = await sendTelegramMessage(
        row.telegramId,
        `⏰ Урок «${row.title}» в ${time} (через ~15 мин)`,
        "lesson.reminder_15m",
      );
      if (!sent) continue;
      await db
        .update(bookings)
        .set({ reminder15mSentAt: new Date() })
        .where(eq(bookings.id, row.bookingId));
    } catch (err) {
      console.error(`15m reminder send failed for booking ${row.bookingId}:`, err);
    }
  }
}

export function startReminderLoop(): void {
  setInterval(() => {
    checkAndSendReminders().catch((err) => console.error("reminder loop error:", err));
  }, CHECK_INTERVAL_MS);
}
