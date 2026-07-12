import { bookings, leads, studentAccess, user as userTable } from "@gojo/db";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { notifyLead } from "../lead-notifications.ts";
import { sendEmail } from "../mailer.ts";

const leadInput = z.object({
  kind: z.enum(["booking", "guide"]).default("booking"),
  name: z.string().trim().min(1).max(200),
  // Primary contact for every public lead flow. Normalization makes
  // deduplication case-insensitive and deterministic.
  email: z.string().trim().toLowerCase().email().max(200),
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
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${data.email}))`);

    const [existingUser] = await tx
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, data.email))
      .limit(1);
    const [canonicalLead] = await tx
      .select({ name: leads.name })
      .from(leads)
      .where(eq(leads.email, data.email))
      .orderBy(asc(leads.createdAt))
      .limit(1);
    const canonicalName = canonicalLead?.name ?? data.name;
    const [existingLead] = await tx
      .select({ id: leads.id, userId: leads.userId })
      .from(leads)
      .where(
        and(
          eq(leads.email, data.email),
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
          contact: data.contact ?? undefined,
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
  let emailSent = false;
  if (data.kind === "booking") {
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
