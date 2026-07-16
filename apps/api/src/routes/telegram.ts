import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { leads, user as userTable, verification } from "@gojo/db";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { createSessionCookie } from "../auth/session.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import { notifyLead } from "../lead-notifications.ts";
import { type TelegramReplyMarkup, sendTelegramMessage } from "../reminders.ts";

// Bot-initiated one-tap web login (getmatch-style). The bot receives a /start
// or /login command via long polling and replies with a Telegram `login_url` button.
// Tapping it opens GET /telegram/login with Telegram's signed identity appended
// (id, auth_date, hash, …); we verify the hash — no password, no OTP, no token.
//
// The bot can only DM a user who has pressed Start, and we identify them by the
// `telegramId` already linked to their account. Unlinked users become a lead
// ("request") instead — they aren't a student yet.

const LINK_TOKEN_TTL_MS = 10 * 60_000;
const REQUEST_THROTTLE_MS = 60_000;
// Reject a login_url payload older than this. Telegram stamps auth_date at tap
// time, so a fresh tap is seconds old; the window only guards against replay of
// a stale signed URL sitting in chat history.
const LOGIN_MAX_AGE_SEC = 5 * 60;

// Browser-facing origin of the app. Behind Caddy the API is reachable at
// `${appUrl}/api/*`; the same holds for the dev Next.js rewrite, so bot login
// links are always `${appUrl}/api/...`.
const appUrl = (env.PUBLIC_APP_URL ?? env.WEB_ORIGIN).replace(/\/$/, "");

// Per-telegramId throttle so repeated /start taps from an unlinked user don't
// spawn duplicate leads. In-process is fine: the API is a single container.
const recentRequests = new Map<number, number>();

export const telegramRoute = new Hono<AuthContext>();

export type TelegramFrom = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};
export type TelegramUpdate = {
  update_id: number;
  message?: { text?: string; chat?: { id: number }; from?: TelegramFrom };
};

type TelegramAccount = {
  id: string;
  role: "student" | "admin";
};

/**
 * Process one update received by the long-polling worker.
 */
export async function processTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  const from = msg?.from;
  const chatId = msg?.chat?.id;
  if (from && !from.is_bot && chatId != null && msg?.text) {
    const parts = msg.text.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase().replace(/@.*$/, "");
    const payload = parts[1];
    if (command === "/start" && payload === "lead") {
      // Conversion CTA: this payload files a booking lead, never an account.
      await handleStartCommand(from, chatId);
    } else if (command === "/start" && payload) {
      // Deep-link account linking: t.me/<bot>?start=<link-token>.
      await handleLinkCommand(from, chatId, payload);
    } else if (command === "/start") {
      await handleStartCommand(from, chatId);
    } else if (command === "/login") {
      await handleLoginCommand(from, chatId);
    } else if (command === "/lessons") {
      await handleLessonsCommand(from, chatId);
    } else if (command === "/help") {
      await handleHelpCommand(from, chatId);
    }
  }
}

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
  if (!row) return handleStartCommand(from, chatId);

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
  const account = await findTelegramAccount(from.id);

  if (account) {
    await sendLoginButton(chatId, account.id);
    return;
  }

  // Unlinked: capture a request (lead), not a student account.
  await createRequestLead(from, chatId);
}

async function handleStartCommand(from: TelegramFrom, chatId: number): Promise<void> {
  const account = await findTelegramAccount(from.id);
  if (!account) {
    await createRequestLead(from, chatId);
    return;
  }

  if (account.role === "student") {
    await sendTelegramMessage(
      chatId,
      "Вы уже зарегистрированы в Gojo Learn. Вот доступные команды 👇\n\n" +
        "/lessons — посмотреть свои уроки",
      "navigation.telegram_start_menu",
      account.id,
    );
    return;
  }

  await sendLoginButton(chatId, account.id);
}

async function handleLessonsCommand(from: TelegramFrom, chatId: number): Promise<void> {
  const account = await findTelegramAccount(from.id);
  if (!account) {
    await createRequestLead(from, chatId);
    return;
  }

  if (account.role !== "student") {
    await sendLoginButton(chatId, account.id);
    return;
  }

  const markup: TelegramReplyMarkup = {
    inline_keyboard: [[{ text: "Мои уроки ↗", login_url: { url: loginUrl("lessons") } }]],
  };
  await sendTelegramMessage(
    chatId,
    "🎌 Откройте расписание, материалы и домашние задания по вашим урокам.",
    "navigation.telegram_lessons_link",
    account.id,
    markup,
  );
}

async function handleHelpCommand(from: TelegramFrom, chatId: number): Promise<void> {
  const account = await findTelegramAccount(from.id);
  if (account?.role === "student") {
    await sendTelegramMessage(
      chatId,
      "Доступные команды:\n\n/lessons — посмотреть свои уроки\n/login — войти на сайт",
      "navigation.telegram_help",
      account.id,
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    "Отправьте /start, чтобы начать, или /login, чтобы войти в существующий аккаунт.",
    "navigation.telegram_help",
    account?.id,
  );
}

async function findTelegramAccount(telegramId: number): Promise<TelegramAccount | undefined> {
  const [account] = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.telegramId, telegramId))
    .limit(1);
  return account;
}

async function sendLoginButton(chatId: number, userId: string): Promise<void> {
  // login_url (not a plain url button) shows the native "Log in to <domain>?"
  // prompt instead of the raw-URL "Open this link?" warning, is instant after
  // the first authorization, AND makes Telegram append a signed identity to
  // the URL (id, auth_date, hash, …) which GET /login verifies. Requires the
  // host be registered via BotFather /setdomain (gojolearn.ru in prod; the
  // tunnel host for local testing) — else BOT_DOMAIN_INVALID on send.
  const markup: TelegramReplyMarkup = {
    inline_keyboard: [[{ text: "Открыть Gojo Learn ↗", login_url: { url: loginUrl() } }]],
  };
  await sendTelegramMessage(
    chatId,
    "Нажмите кнопку, чтобы войти на сайт.",
    "auth.telegram_login_link",
    userId,
    markup,
  );
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
    // chat_id is stable and deliverable; usernames can change and are only a
    // display/login alias. Prefer the id for deduplication.
    const existing = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.telegramId, from.id),
          inArray(leads.status, ["new", "contacted", "trial_booked"]),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(leads).values({
        kind: "booking",
        status: "new",
        name,
        telegram: username ?? null,
        telegramId: from.id,
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

// Telegram redirects login_url buttons here with a signed identity in the query
// string. We verify it, create the site session, then land on the requested
// first-party page. The destination is fixed by the route, never user input.
telegramRoute.get("/login/lessons", async (c) => completeTelegramLogin(c, "/lessons"));
telegramRoute.get("/login", async (c) => completeTelegramLogin(c, "/dashboard"));

async function completeTelegramLogin(c: Context<AuthContext>, destination: string) {
  const params = c.req.query();
  if (!verifyTelegramLogin(params)) return c.redirect(`${appUrl}/login?tg=invalid`);

  const [account] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.telegramId, Number(params.id)))
    .limit(1);
  if (!account) return c.redirect(`${appUrl}/login?tg=notlinked`);

  c.header("Set-Cookie", await createSessionCookie(account.id), { append: true });
  return c.redirect(`${appUrl}${destination}`);
}

// Verify the Telegram Login Widget signature (the scheme login_url uses):
// hash = HMAC-SHA256(sorted "k=v\n" data-check-string, key = SHA256(bot_token)).
function verifyTelegramLogin(params: Record<string, string>): boolean {
  const token = env.TELEGRAM_BOT_TOKEN;
  const { hash, ...rest } = params;
  if (!token || !hash || !rest.id || !rest.auth_date) return false;

  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const authDate = Number(rest.auth_date);
  return Number.isFinite(authDate) && Date.now() / 1000 - authDate <= LOGIN_MAX_AGE_SEC;
}

function linkKey(token: string) {
  return `tg-link:${token}`;
}

function loginUrl(destination?: "lessons") {
  return `${appUrl}/api/telegram/login${destination ? `/${destination}` : ""}`;
}
