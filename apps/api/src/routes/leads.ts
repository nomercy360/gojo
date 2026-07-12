import { bookings, leads, studentAccess, user as userTable } from "@gojo/db";
import { zValidator } from "@hono/zod-validator";
import { type SQL, and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { notifyLead } from "../lead-notifications.ts";
import { sendEmail } from "../mailer.ts";
import { sendTelegramMessage } from "../reminders.ts";
import { finishTelegramLogin, startTelegramLogin, verifyTelegramProof } from "../telegram-login.ts";

// Empty strings from the web form mean "not provided" — collapse them so the
// per-channel validators only run on real input and `.optional()` holds.
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

// Telegram is the primary channel: a bare lowercase @-handle. We accept the
// handle with or without a leading @ / t.me link and normalize to the handle.
const telegramField = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .transform((v) =>
      v
        .replace(/^https?:\/\//i, "")
        .replace(/^t\.me\//i, "")
        .replace(/^@/, "")
        .toLowerCase(),
    )
    .refine((v) => /^[a-z0-9_]{3,32}$/.test(v), "Некорректный ник Telegram")
    .optional(),
);

// Opt-in callback number. Normalize to +digits (RU 8… → +7…) and reject
// junk like the free-text numbers the old open field let through.
const phoneField = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .transform((v) => {
      const digits = v.replace(/\D/g, "").replace(/^8(?=\d{10}$)/, "7");
      return digits ? `+${digits}` : "";
    })
    .refine((v) => /^\+\d{10,15}$/.test(v), "Некорректный номер телефона")
    .optional(),
);

const emailField = z.preprocess(
  blankToUndefined,
  z.string().trim().toLowerCase().email().max(200).optional(),
);

const leadInput = z
  .object({
    kind: z.enum(["booking", "guide"]).default("booking"),
    name: z.string().trim().min(1).max(200),
    // Contact channels in priority order: Telegram primary, email optional
    // durable fallback, phone opt-in callback. At least one must be present.
    telegram: telegramField,
    telegramProof: z.string().max(4096).optional(),
    email: emailField,
    phone: phoneField,
    level: z.string().trim().max(200).optional(),
    goal: z.string().trim().max(500).optional(),
  })
  .refine((d) => Boolean(d.telegramProof || d.telegram || d.email || d.phone), {
    message: "Укажи хотя бы один способ связи",
    path: ["telegram"],
  });

type LeadInput = z.infer<typeof leadInput>;

// Public — the landing lead forms are pre-auth. Kept minimal; add rate limiting
// if it attracts spam.
export const leadsRoute = new Hono();

leadsRoute.get("/telegram/start", startTelegramLogin);
leadsRoute.get("/telegram/callback", finishTelegramLogin);

leadsRoute.post("/", zValidator("json", leadInput), async (c) => {
  const input = c.req.valid("json");
  const telegramIdentity = input.telegramProof
    ? await verifyTelegramProof(input.telegramProof)
    : undefined;
  const { telegramProof: _proof, ...plainData } = input;
  const data = {
    ...plainData,
    telegram: telegramIdentity?.username ?? plainData.telegram,
    telegramId: telegramIdentity?.id,
  };

  // Canonical identity for the advisory lock, in channel priority. The `!`s are
  // safe: leadInput guarantees at least one of telegram/email/phone.
  const lockKey = data.telegramId
    ? `tgid:${data.telegramId}`
    : data.telegram
      ? `tg:${data.telegram}`
      : data.email
        ? `em:${data.email}`
        : `ph:${data.phone!}`;
  // A lead matches an existing one if it shares ANY contact channel.
  const idMatch = or(
    ...([
      data.telegram ? eq(leads.telegram, data.telegram) : undefined,
      data.telegramId ? eq(leads.telegramId, data.telegramId) : undefined,
      data.email ? eq(leads.email, data.email) : undefined,
      data.phone ? eq(leads.phone, data.phone) : undefined,
    ].filter(Boolean) as SQL[]),
  );

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

    // Users are keyed by email, so we can only auto-link when an email is given.
    const [existingUser] = data.email
      ? await tx
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.email, data.email))
          .limit(1)
      : [];
    const [canonicalLead] = await tx
      .select({ name: leads.name })
      .from(leads)
      .where(idMatch)
      .orderBy(asc(leads.createdAt))
      .limit(1);
    const canonicalName = canonicalLead?.name ?? data.name;
    const [existingLead] = await tx
      .select({ id: leads.id, userId: leads.userId })
      .from(leads)
      .where(
        and(
          idMatch,
          eq(leads.kind, data.kind),
          inArray(leads.status, ["new", "contacted", "trial_booked"]),
        ),
      )
      .limit(1);

    const [access] = existingUser
      ? await tx
          .select({ trialUsed: studentAccess.trialUsed })
          .from(studentAccess)
          .where(eq(studentAccess.userId, existingUser.id))
          .limit(1)
      : [];

    if (existingLead) {
      await tx
        .update(leads)
        .set({
          name: canonicalName,
          telegram: data.telegram ?? undefined,
          telegramId: data.telegramId ?? undefined,
          email: data.email ?? undefined,
          phone: data.phone ?? undefined,
          goal: data.goal ?? undefined,
          userId: existingLead.userId ?? existingUser?.id ?? null,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, existingLead.id));
      return { id: existingLead.id, alreadyExists: true, canonicalName };
    }

    if (access?.trialUsed) {
      return {
        id: undefined,
        alreadyExists: true,
        reason: "account_has_trial" as const,
        canonicalName,
      };
    }

    const [lead] = await tx
      .insert(leads)
      .values({ ...data, name: canonicalName, userId: existingUser?.id ?? null })
      .returning({ id: leads.id });
    return { id: lead?.id, alreadyExists: false, reason: undefined, canonicalName };
  });

  if (result.alreadyExists) {
    return c.json({ ok: true, ...result, emailSent: false }, 200);
  }

  void notifyLead({ ...data, name: result.canonicalName });

  // If the lead signed in with Telegram, the bot_access scope lets us DM them
  // directly (chat_id === their Telegram user id) even before they /start the
  // bot. Best-effort: a 403 (scope declined / bot blocked) is logged, not fatal.
  if (data.kind === "booking" && data.telegramId) {
    void sendTelegramMessage(
      data.telegramId,
      `${result.canonicalName}, спасибо за заявку в Gojo! 🎌\n\nНапишем здесь, в Telegram, чтобы договориться о времени бесплатного первого урока — 25 минут онлайн, познакомимся и определим уровень. Без продаж.`,
      "lead.telegram_welcome",
    ).catch((error) => console.error("lead telegram welcome failed:", error));
  }

  let emailSent = false;
  if (data.kind === "booking" && data.email) {
    try {
      await sendEmail(
        data.email,
        "Заявка принята — Gojo Learn",
        `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#252525">
          <p style="margin:0 0 8px;color:#e8420a;font-weight:700">gojo</p>
          <h1>Заявка принята</h1>
          <p>${escapeHtml(result.canonicalName)}, спасибо! Мы свяжемся в течение 24 часов, чтобы согласовать время.</p>
          <p>Первый урок длится 25 минут онлайн: познакомимся, определим уровень и покажем план. Без продаж.</p>
          <p style="font-size:12px;color:#6b6b6b">Gojo Learn · школа японского языка</p>
        </div>`,
      );
      emailSent = true;
    } catch (error) {
      console.error("booking confirmation email failed:", error);
    }
  }
  return c.json({ ok: true, ...result, emailSent }, 201);
});

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!,
  );
}

leadsRoute.post("/link-current", requireAuth, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const linked = await db
    .update(leads)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(and(eq(leads.email, user.email), isNull(leads.userId)))
    .returning({
      id: leads.id,
      kind: leads.kind,
      level: leads.level,
      trialLessonId: leads.trialLessonId,
      createdAt: leads.createdAt,
    });

  const latestQuizLead = linked
    .filter((lead) => lead.kind === "quiz" && lead.level)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (latestQuizLead?.level) {
    await db
      .update(userTable)
      .set({ quizLevel: latestQuizLead.level, updatedAt: new Date() })
      .where(eq(userTable.id, user.id));
  }

  for (const lead of linked) {
    if (!lead.trialLessonId) continue;
    await db
      .insert(bookings)
      .values({ lessonId: lead.trialLessonId, studentId: user.id })
      .onConflictDoNothing({ target: [bookings.lessonId, bookings.studentId] });
    await db
      .insert(studentAccess)
      .values({ userId: user.id, trialUsed: true, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: studentAccess.userId,
        set: { trialUsed: true, updatedAt: new Date() },
      });
  }

  return c.json({ ok: true, linked: linked.length });
});
