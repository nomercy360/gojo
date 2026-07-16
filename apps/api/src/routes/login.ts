import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { user as userTable, verification } from "@gojo/db";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthContext } from "../auth/middleware.ts";
import { createSessionCookie } from "../auth/session.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import { sendEmail } from "../mailer.ts";
import { sendTelegramMessage } from "../reminders.ts";

const requestCodeInput = z.object({ identifier: z.string().trim().min(3).max(200) });
const verifyCodeInput = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

const OTP_TTL_MS = 10 * 60_000;
const OTP_RESEND_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;
const recentRequests = new Map<string, number>();

type DeliveryChannel = { type: "email" | "telegram"; label: string };

type OtpRecord = { userId: string; digest: string; attempts: number };

export const loginRoute = new Hono<AuthContext>();

loginRoute.post("/code", zValidator("json", requestCodeInput), async (c) => {
  const parsed = parseIdentifier(c.req.valid("json").identifier);
  if (!parsed) return c.json({ error: "invalid_identifier" }, 400);

  const [account] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      telegramId: userTable.telegramId,
      telegramUsername: userTable.telegramUsername,
    })
    .from(userTable)
    .where(
      and(
        eq(userTable.role, "student"),
        or(
          sql`lower(${userTable.email}) = ${parsed.email}`,
          sql`lower(${userTable.telegramUsername}) = ${parsed.telegram}`,
        ),
      ),
    )
    .limit(1);

  if (!account) return c.json({ error: "account_not_found" }, 404);

  const now = Date.now();
  if (env.NODE_ENV === "production") {
    // One account may be addressed by email or Telegram. Limiting by the
    // resolved user id prevents alternating identifiers to bypass cooldowns.
    const lastRequest = recentRequests.get(account.id) ?? 0;
    if (now - lastRequest < OTP_RESEND_MS) {
      return c.json(
        {
          error: "too_many_requests",
          retryAfter: Math.ceil((OTP_RESEND_MS - now + lastRequest) / 1000),
        },
        429,
      );
    }
    recentRequests.set(account.id, now);
    for (const [userId, requestedAt] of recentRequests) {
      if (now - requestedAt > OTP_TTL_MS) recentRequests.delete(userId);
    }
  }

  const challengeId = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // A login attempt owns exactly one OTP record and one code, regardless of
  // how many linked channels can receive it.
  await db.insert(verification).values({
    id: randomUUID(),
    identifier: challengeKey(challengeId),
    value: JSON.stringify({
      userId: account.id,
      digest: codeDigest(challengeId, code),
      attempts: 0,
    } satisfies OtpRecord),
    expiresAt: new Date(now + OTP_TTL_MS),
    updatedAt: new Date(),
  });

  const channels: DeliveryChannel[] = [];
  if (!isTelegramPlaceholderEmail(account.email)) {
    try {
      await sendEmail(
        account.email,
        "Код для входа в Gojo Learn",
        `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#252525">
            <p style="margin:0 0 8px;color:#e8420a;font-weight:700">gojo</p>
            <h1 style="margin-bottom:8px">Код для входа</h1>
            <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0">${code}</p>
            <p>Код действует 10 минут. Если это были не вы, просто проигнорируйте письмо.</p>
          </div>`,
      );
      channels.push({ type: "email", label: maskEmail(account.email) });
    } catch (error) {
      console.error("login email OTP delivery failed:", error);
    }
  }

  // A username alone is not deliverable. Telegram messages always use the
  // chat id saved when the student started the bot.
  if (account.telegramId != null) {
    try {
      const sent = await sendTelegramMessage(
        account.telegramId,
        `Код для входа в Gojo Learn: ${code}`,
        "auth.telegram_otp",
        account.id,
      );
      if (sent) {
        channels.push({
          type: "telegram",
          label: account.telegramUsername ? maskTelegram(account.telegramUsername) : "Telegram",
        });
      }
    } catch (error) {
      console.error("login Telegram OTP delivery failed:", error);
    }
  }

  if (channels.length === 0) {
    await db.delete(verification).where(eq(verification.identifier, challengeKey(challengeId)));
  }

  void db.delete(verification).where(lt(verification.expiresAt, new Date()));
  return c.json({ ok: true, challengeId, channels, retryAfter: 60 });
});

loginRoute.post("/code/verify", zValidator("json", verifyCodeInput), async (c) => {
  const { challengeId, code } = c.req.valid("json");
  const key = challengeKey(challengeId);
  const [row] = await db
    .select()
    .from(verification)
    .where(and(eq(verification.identifier, key), gt(verification.expiresAt, new Date())))
    .limit(1);

  if (!row) return c.json({ error: "invalid_or_expired_code" }, 400);

  let record: OtpRecord;
  try {
    record = JSON.parse(row.value) as OtpRecord;
  } catch {
    await db.delete(verification).where(eq(verification.id, row.id));
    return c.json({ error: "invalid_or_expired_code" }, 400);
  }

  const actual = Buffer.from(codeDigest(challengeId, code), "hex");
  const expected = Buffer.from(record.digest, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    const attempts = record.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await db.delete(verification).where(eq(verification.id, row.id));
    } else {
      await db
        .update(verification)
        .set({ value: JSON.stringify({ ...record, attempts }), updatedAt: new Date() })
        .where(eq(verification.id, row.id));
    }
    return c.json({ error: "invalid_or_expired_code" }, 400);
  }

  const [account] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.id, record.userId), eq(userTable.role, "student")))
    .limit(1);
  if (!account) {
    await db.delete(verification).where(eq(verification.id, row.id));
    return c.json({ error: "invalid_or_expired_code" }, 400);
  }

  await db.delete(verification).where(eq(verification.id, row.id));
  c.header("Set-Cookie", await createSessionCookie(account.id), { append: true });
  return c.json({ ok: true });
});

function parseIdentifier(raw: string): { email: string; telegram: string } | undefined {
  const value = raw.trim().toLowerCase();
  const username = value
    .replace(/^https?:\/\//, "")
    .replace(/^t\.me\//, "")
    .replace(/^@/, "");
  const isEmail = z.string().email().safeParse(value).success;
  const isTelegram = /^[a-z0-9_]{5,32}$/.test(username);
  if (!isEmail && !isTelegram) return undefined;
  return { email: isEmail ? value : "", telegram: isTelegram ? username : "" };
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 1)}•••@${domain}`;
}

function maskTelegram(username: string) {
  const normalized = username.replace(/^@/, "");
  return `@${normalized}`;
}

function isTelegramPlaceholderEmail(email: string) {
  return email.endsWith("@telegram.gojo.local");
}

function challengeKey(challengeId: string) {
  return `login-otp:${challengeId}`;
}

function codeDigest(challengeId: string, code: string) {
  return createHmac("sha256", env.JWT_SECRET).update(`${challengeId}:${code}`).digest("hex");
}
