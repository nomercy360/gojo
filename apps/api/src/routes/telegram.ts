import { randomBytes } from "node:crypto";
import { leads, user as userTable, verification } from "@gojo/db";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { Hono } from "hono";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { createSessionCookie } from "../auth/session.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import { notifyLead } from "../lead-notifications.ts";
import { type TelegramReplyMarkup, sendTelegramMessage } from "../reminders.ts";

// Bot-initiated one-tap web login (getmatch-style). The bot receives a /start
// or /login command via webhook, mints a single-use token, and replies with a
// url button. Clicking it hits GET /telegram/login/:token, which sets the
// session cookie and redirects into the app — no password, no OTP typing.
//
// The bot can only DM a user who has pressed Start, and we identify them by the
// `telegramId` already linked to their account. Unlinked users become a lead
// ("request") instead — they aren't a student yet.

const LOGIN_TOKEN_TTL_MS = 5 * 60_000;
const LINK_TOKEN_TTL_MS = 10 * 60_000;
const REQUEST_THROTTLE_MS = 60_000;

// Browser-facing origin of the app. Behind Caddy the API is reachable at
// `${appUrl}/api/*`; the same holds for the dev Next.js rewrite and an ngrok
// tunnel, so login links and the webhook URL are always `${appUrl}/api/...`.
const appUrl = (env.PUBLIC_APP_URL ?? env.WEB_ORIGIN).replace(/\/$/, "");

// Per-telegramId throttle so repeated /start taps from an unlinked user don't
// spawn duplicate leads. In-process is fine: the API is a single container.
const recentRequests = new Map<number, number>();

export const telegramRoute = new Hono<AuthContext>();

type TelegramFrom = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};
type TelegramUpdate = {
  message?: { text?: string; chat?: { id: number }; from?: TelegramFrom };
};

telegramRoute.post("/webhook", async (c) => {
  // Telegram echoes the secret from setWebhook on every call. When configured,
  // reject anything without it — the webhook URL is otherwise guessable.
  if (
    env.TELEGRAM_WEBHOOK_SECRET &&
    c.req.header("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return c.json({ error: "forbidden" }, 403);
  }

  let update: TelegramUpdate;
  try {
    update = (await c.req.json()) as TelegramUpdate;
  } catch {
    return c.json({ ok: true }); // ack malformed bodies; nothing to retry
  }

  const msg = update.message;
  const from = msg?.from;
  const chatId = msg?.chat?.id;
  // Always 200 so Telegram doesn't retry; do the work best-effort.
  if (from && !from.is_bot && chatId != null && msg?.text) {
    const parts = msg.text.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase().replace(/@.*$/, "");
    const payload = parts[1];
    try {
      if (command === "/start" && payload) {
        // Deep-link account linking: t.me/<bot>?start=<link-token>.
        await handleLinkCommand(from, chatId, payload);
      } else if (command === "/start" || command === "/login") {
        await handleLoginCommand(from, chatId);
      }
    } catch (err) {
      console.error("telegram command failed:", err);
    }
  }
  return c.json({ ok: true });
});

// POST /telegram/link-token — a signed-in user requests a deep link that, once
// opened, ties their Telegram account to this user (see handleLinkCommand).
telegramRoute.post("/link-token", requireAuth, async (c) => {
  const user = c.get("user")!;
  const token = randomBytes(16).toString("base64url"); // fits Telegram's start payload
  await db.insert(verification).values({
    id: randomBytes(16).toString("hex"),
    identifier: linkKey(token),
    value: JSON.stringify({ userId: user.id }),
    expiresAt: new Date(Date.now() + LINK_TOKEN_TTL_MS),
    updatedAt: new Date(),
  });
  void db.delete(verification).where(lt(verification.expiresAt, new Date()));
  return c.json({ url: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${token}` });
});

async function handleLinkCommand(
  from: TelegramFrom,
  chatId: number,
  payload: string,
): Promise<void> {
  const [row] = await db
    .select({ id: verification.id, value: verification.value })
    .from(verification)
    .where(
      and(eq(verification.identifier, linkKey(payload)), gt(verification.expiresAt, new Date())),
    )
    .limit(1);

  // Not a (valid) link token — treat as an ordinary /start.
  if (!row) return handleLoginCommand(from, chatId);

  await db.delete(verification).where(eq(verification.id, row.id)); // single-use
  const userId = (JSON.parse(row.value) as { userId: string }).userId;

  try {
    // telegramId is the login key and must be unique; set it first so a rare
    // username clash can't block linking.
    await db
      .update(userTable)
      .set({ telegramId: from.id, updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  } catch (err) {
    if (isUniqueViolation(err)) {
      await sendTelegramMessage(
        chatId,
        "Этот Telegram уже привязан к другому аккаунту. " +
          "Отвяжите его там или войдите под тем аккаунтом.",
        "auth.telegram_link_conflict",
      );
      return;
    }
    throw err;
  }

  if (from.username) {
    // Best-effort: username is also unique, but a stale clash shouldn't undo the
    // successful telegramId link above.
    await db
      .update(userTable)
      .set({ telegramUsername: from.username.toLowerCase(), updatedAt: new Date() })
      .where(eq(userTable.id, userId))
      .catch((err) => {
        if (!isUniqueViolation(err)) throw err;
      });
  }

  await sendTelegramMessage(
    chatId,
    "✅ Telegram привязан! Теперь входите одной кнопкой — отправьте /login.",
    "auth.telegram_linked",
    userId,
  );
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as { code?: string }).code === "23505";
}

async function handleLoginCommand(from: TelegramFrom, chatId: number): Promise<void> {
  const [account] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.telegramId, from.id))
    .limit(1);

  if (account) {
    const token = randomBytes(32).toString("base64url");
    await db.insert(verification).values({
      id: randomBytes(16).toString("hex"),
      identifier: tokenKey(token),
      value: JSON.stringify({ userId: account.id }),
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
      updatedAt: new Date(),
    });
    void db.delete(verification).where(lt(verification.expiresAt, new Date()));

    const markup: TelegramReplyMarkup = {
      inline_keyboard: [[{ text: "Открыть Gojo Learn ↗", url: loginUrl(token) }]],
    };
    await sendTelegramMessage(
      chatId,
      "Нажмите кнопку, чтобы войти на сайт. Ссылка одноразовая и действует 5 минут.",
      "auth.telegram_login_link",
      account.id,
      markup,
    );
    return;
  }

  // Unlinked: capture a request (lead), not a student account.
  await createRequestLead(from, chatId);
}

async function createRequestLead(from: TelegramFrom, chatId: number): Promise<void> {
  const now = Date.now();
  const last = recentRequests.get(from.id) ?? 0;
  const throttled = now - last < REQUEST_THROTTLE_MS;
  recentRequests.set(from.id, now);
  for (const [id, at] of recentRequests) {
    if (now - at > REQUEST_THROTTLE_MS) recentRequests.delete(id);
  }

  const username = from.username?.toLowerCase();
  const name =
    [from.first_name, from.last_name].filter(Boolean).join(" ") || username || `id${from.id}`;

  if (!throttled) {
    // Dedup by handle when we have one; otherwise the throttle above guards
    // against repeat /start spam (leads carry no telegramId column).
    const existing = username
      ? await db
          .select({ id: leads.id })
          .from(leads)
          .where(
            and(
              eq(leads.telegram, username),
              inArray(leads.status, ["new", "contacted", "trial_booked"]),
            ),
          )
          .limit(1)
      : [];

    if (existing.length === 0) {
      await db.insert(leads).values({
        kind: "booking",
        status: "new",
        name,
        telegram: username ?? null,
        notes: `Заявка из Telegram-бота (id ${from.id}${username ? `, @${username}` : ""})`,
      });
      void notifyLead({ kind: "bot", name, telegram: username });
    }
  }

  await sendTelegramMessage(
    chatId,
    "Спасибо! Мы получили вашу заявку и скоро свяжемся с вами. " +
      "Если у вас уже есть аккаунт, войдите на сайте — после этого вход по кнопке будет работать здесь.",
    "auth.telegram_request",
  );
}

telegramRoute.get("/login/:token", async (c) => {
  const token = c.req.param("token");
  const [row] = await db
    .select({ id: verification.id, value: verification.value })
    .from(verification)
    .where(
      and(eq(verification.identifier, tokenKey(token)), gt(verification.expiresAt, new Date())),
    )
    .limit(1);

  if (!row) return c.redirect(`${appUrl}/login?tg=expired`);

  // Single-use: burn the token before minting a session.
  await db.delete(verification).where(eq(verification.id, row.id));

  let userId: string;
  try {
    userId = (JSON.parse(row.value) as { userId: string }).userId;
  } catch {
    return c.redirect(`${appUrl}/login?tg=expired`);
  }

  const [account] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!account) return c.redirect(`${appUrl}/login?tg=expired`);

  c.header("Set-Cookie", await createSessionCookie(account.id), { append: true });
  return c.redirect(`${appUrl}/dashboard`);
});

function tokenKey(token: string) {
  return `tg-login:${token}`;
}

function linkKey(token: string) {
  return `tg-link:${token}`;
}

function loginUrl(token: string) {
  return `${appUrl}/api/telegram/login/${token}`;
}
