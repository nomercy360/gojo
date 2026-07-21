import { randomUUID } from "node:crypto";
import {
  bookings,
  homework,
  homeworkSubmissions,
  leads,
  lessonCards,
  lessonMaterials,
  lessons,
  levelVocab,
  studentAccess,
  units,
  user as userTable,
} from "@gojo/db";
import {
  addLessonCardInput,
  reviewSubmissionInput,
  setHomeworkStatusInput,
  setStudentLevelInput,
  setStudentPlanInput,
} from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { auth } from "../auth.ts";
import { type AuthContext, requireAuth, requireTeacher } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import {
  materializeCardsForAttendance,
  materializeNewCardForAttendedBookings,
  materializeUnitDeckForAttendance,
} from "../lib/materialize.ts";
import { logNotification } from "../reminders.ts";
import { putObject } from "../s3.ts";
import { sendLessonConfirmation } from "./lessons.ts";
import { isTelegramPlaceholderEmail } from "./login.ts";
import { toLessonCardDto, toLessonDto, toSubmissionDto } from "./mappers.ts";
import { getStudentAccessSnapshot, paymentPlans } from "./payments.ts";
import { sendAccountWelcome } from "./telegram.ts";

export const teacherRoute = new Hono<AuthContext>();

const createLessonInput = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  // studentId remains accepted for older clients. New clients send studentIds
  // so one lesson can invite a whole group at creation time.
  studentId: z.string().min(1).optional(),
  studentIds: z.array(z.string().min(1)).max(8).optional(),
  unitId: z.string().uuid().nullable().optional(),
  meetingUrl: z.string().url().max(500).optional(),
  metadata: z
    .object({
      topic: z.string().optional(),
    })
    .optional(),
});

const updateLessonInput = z.object({
  title: z.string().min(1).max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  unitId: z.string().uuid().nullable().optional(),
  meetingUrl: z.string().url().max(500).nullable().optional(),
});

const leadStatusInput = z.object({
  status: z
    .enum(["new", "contacted", "trial_booked", "trial_done", "link_sent", "converted", "lost"])
    .optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(320).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  telegram: z.string().trim().max(64).nullable().optional(),
});

const createTrialLessonInput = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  meetingUrl: z.string().url().max(500).optional(),
});

// Marking the trial as done requires the assessed level in the same action —
// the send-link gate depends on it, so a lead can never sit "done but
// unleveled" between the two states.
const trialDoneInput = z.object({
  jlptLevel: z.enum(["N5", "N4", "N3", "N2"]),
});

const sendLeadLinkInput = z.object({
  // Set when the send-link call previously returned `requiresLink` and the
  // teacher picked one of the matching existing student accounts.
  existingStudentId: z.string().min(1).optional(),
});

const updateAdminInput = z.object({
  name: z.string().trim().min(1).max(200),
  nickname: z.string().trim().max(200).nullable(),
  email: z.string().trim().email().max(320),
  avatarUrl: z.string().trim().max(2000).nullable(),
  telegramId: z.number().int().positive().nullable(),
});

const updateStudentInput = z.object({
  name: z.string().trim().min(1).max(200),
  nickname: z.string().trim().max(200).nullable(),
  email: z.string().trim().email().max(320),
  avatarUrl: z.string().trim().max(2000).nullable(),
  telegramId: z.number().int().positive().nullable(),
  telegramUsername: z
    .string()
    .regex(/^[a-z0-9_]{5,32}$/)
    .nullable(),
  jlptLevel: z.enum(["N5", "N4", "N3", "N2"]).nullable(),
  quizLevel: z.enum(["start", "N5", "N4", "N3", "N2"]).nullable(),
  currentLevel: z.number().int().min(1).max(30),
  assignedPlanId: z.string().min(1).nullable(),
  activeUntil: z.string().datetime().nullable(),
  lessonCredits: z.number().int().min(0).max(1000),
});

const postLessonInput = z.object({
  attendanceStatus: z
    .enum(["scheduled", "attended", "no_show", "cancelled_by_student", "cancelled_by_teacher"])
    .optional(),
  postLessonNote: z.string().max(2000).nullable().optional(),
  recommendation: z.string().max(1000).nullable().optional(),
});

teacherRoute.use("*", requireAuth, requireTeacher);

function validateNewLessonTime(startsAt: Date, endsAt: Date) {
  if (startsAt.getTime() <= Date.now()) {
    throw new HTTPException(400, { message: "lesson_starts_in_past" });
  }
  if (endsAt <= startsAt) {
    throw new HTTPException(400, { message: "lesson_end_must_follow_start" });
  }
}

function canManageLesson(
  u: NonNullable<AuthContext["Variables"]["user"]>,
  lesson: typeof lessons.$inferSelect,
) {
  return u.role === "admin" || lesson.teacherId === u.id;
}

function teacherLessonScope(u: NonNullable<AuthContext["Variables"]["user"]>) {
  return u.role === "admin"
    ? isNull(lessons.deletedAt)
    : and(eq(lessons.teacherId, u.id), isNull(lessons.deletedAt));
}

teacherRoute.get("/leads", async (c) => {
  const status = c.req.query("status");
  const where = status ? eq(leads.status, status) : undefined;
  const rows = await db
    .select({
      lead: leads,
      assigneeNickname: userTable.nickname,
      assigneeEmail: userTable.email,
    })
    .from(leads)
    .leftJoin(userTable, eq(userTable.id, leads.assigneeId))
    .where(where)
    .orderBy(desc(leads.createdAt))
    .limit(200);

  return c.json(
    rows.map((r) => ({
      id: r.lead.id,
      userId: r.lead.userId,
      studentId: r.lead.studentId,
      assigneeId: r.lead.assigneeId,
      assigneeName: r.assigneeNickname ?? r.assigneeEmail ?? null,
      trialLessonId: r.lead.trialLessonId,
      kind: r.lead.kind,
      status: r.lead.status,
      name: r.lead.name,
      telegram: r.lead.telegram,
      telegramId: r.lead.telegramId,
      timeZone: r.lead.timeZone,
      email: r.lead.email,
      phone: r.lead.phone,
      level: r.lead.level,
      assessedLevel: r.lead.assessedLevel,
      goal: r.lead.goal,
      notes: r.lead.notes,
      nextFollowUpAt: r.lead.nextFollowUpAt ? r.lead.nextFollowUpAt.toISOString() : null,
      createdAt: r.lead.createdAt.toISOString(),
      updatedAt: r.lead.updatedAt.toISOString(),
    })),
  );
});

teacherRoute.patch("/leads/:id", zValidator("json", leadStatusInput), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const patch: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
  if (body.status !== undefined) patch.status = body.status;
  if (body.assigneeId !== undefined) patch.assigneeId = body.assigneeId;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.nextFollowUpAt !== undefined) {
    patch.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
  }
  if (body.name !== undefined) patch.name = body.name;
  if (body.email !== undefined) patch.email = body.email?.toLowerCase() ?? null;
  if (body.phone !== undefined) patch.phone = body.phone || null;
  if (body.telegram !== undefined) {
    // stored as a bare lowercase handle, no leading @
    patch.telegram = body.telegram?.replace(/^@/, "").toLowerCase() || null;
  }

  const [row] = await db.update(leads).set(patch).where(eq(leads.id, id)).returning();
  if (!row) throw new HTTPException(404, { message: "lead not found" });
  return c.json({ ok: true });
});

teacherRoute.post(
  "/leads/:id/trial-lesson",
  zValidator("json", createTrialLessonInput),
  async (c) => {
    const u = c.get("user")!;
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);

    validateNewLessonTime(startsAt, endsAt);

    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!lead) throw new HTTPException(404, { message: "lead not found" });

    const [lesson] = await db
      .insert(lessons)
      .values({
        teacherId: u.id,
        title: body.title,
        startsAt,
        endsAt,
        maxStudents: 1,
        meetingUrl: body.meetingUrl,
        metadata: { topic: `trial:${lead.id}` },
      })
      .returning();
    if (!lesson) throw new HTTPException(500, { message: "failed to create trial lesson" });

    await db
      .update(leads)
      .set({
        trialLessonId: lesson.id,
        assigneeId: lead.assigneeId ?? u.id,
        status: "trial_booked",
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));

    if (lead.userId) {
      const [booking] = await db
        .insert(bookings)
        .values({ lessonId: lesson.id, studentId: lead.userId })
        .onConflictDoNothing({ target: [bookings.lessonId, bookings.studentId] })
        .returning();
      await db
        .insert(studentAccess)
        .values({ userId: lead.userId, trialUsed: true, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: studentAccess.userId,
          set: { trialUsed: true, updatedAt: new Date() },
        });
      await sendLessonConfirmation(
        {
          bookingId: booking?.id,
          userId: lead.userId,
          email: lead.email,
          telegramId: lead.telegramId,
          timeZone: lead.timeZone,
        },
        lesson.title,
        lesson.startsAt,
        lesson.meetingUrl,
      );
    } else {
      await sendLessonConfirmation(
        { email: lead.email, telegramId: lead.telegramId, timeZone: lead.timeZone },
        lesson.title,
        lesson.startsAt,
        lesson.meetingUrl,
      );
    }

    return c.json(toLessonDto(lesson, null), 201);
  },
);

// Lead lifecycle: new → trial_booked → trial_done → link_sent → converted,
// with `lost` as the manual terminal branch. The teacher drives the first
// three transitions; `converted` happens on its own when the client first
// logs in (see the session hook in auth.ts). There is no manual convert
// form anymore — the account is assembled from the lead + assessed level.

teacherRoute.post("/leads/:id/trial-done", zValidator("json", trialDoneInput), async (c) => {
  const id = c.req.param("id");
  const { jlptLevel } = c.req.valid("json");

  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) throw new HTTPException(404, { message: "lead_not_found" });
  if (!lead.trialLessonId) throw new HTTPException(409, { message: "lead_has_no_trial" });
  // Re-running from trial_done is allowed so a mis-picked level can be fixed
  // until the link goes out.
  if (lead.status !== "trial_booked" && lead.status !== "trial_done") {
    throw new HTTPException(409, { message: "lead_not_awaiting_trial" });
  }

  await db
    .update(leads)
    .set({ status: "trial_done", assessedLevel: jlptLevel, updatedAt: new Date() })
    .where(eq(leads.id, id));
  return c.json({ ok: true });
});

teacherRoute.post("/leads/:id/send-link", zValidator("json", sendLeadLinkInput), async (c) => {
  const leadId = c.req.param("id");
  const body = c.req.valid("json");

  const conversion = await db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update").limit(1);
    if (!lead) throw new HTTPException(404, { message: "lead_not_found" });

    // Idempotency: once an account exists the link belongs to it; repeats
    // go through the resend-invite endpoint (which has a cooldown).
    if (lead.studentId) {
      return {
        ok: true as const,
        userId: lead.studentId,
        created: false,
        alreadySent: true,
        lead,
      };
    }
    if (lead.status !== "trial_done") {
      throw new HTTPException(409, { message: "trial_not_done" });
    }
    const jlptLevel = lead.assessedLevel;
    if (!jlptLevel) throw new HTTPException(409, { message: "level_not_assessed" });

    const normalizedEmail = lead.email?.toLowerCase() ?? null;
    if (!normalizedEmail && !lead.telegramId) {
      throw new HTTPException(400, { message: "no_delivery_channel" });
    }

    const lockKey = normalizedEmail
      ? `student-email:${normalizedEmail}`
      : `student-telegram:${lead.telegramId!}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const identityMatches = or(
      ...(normalizedEmail ? [eq(userTable.email, normalizedEmail)] : []),
      ...(lead.telegramId ? [eq(userTable.telegramId, lead.telegramId)] : []),
    );
    const matches = await tx
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        telegramId: userTable.telegramId,
        telegramUsername: userTable.telegramUsername,
        lastLoginAt: userTable.lastLoginAt,
      })
      .from(userTable)
      .where(and(eq(userTable.role, "student"), identityMatches));

    if (matches.length > 0 && !body.existingStudentId) {
      return {
        ok: false as const,
        requiresLink: true as const,
        matches: matches.map(({ lastLoginAt, ...match }) => match),
      };
    }

    const existing = body.existingStudentId
      ? matches.find((match) => match.id === body.existingStudentId)
      : undefined;
    if (body.existingStudentId && !existing) {
      throw new HTTPException(400, { message: "student_does_not_match_lead" });
    }

    const now = new Date();
    const quizLevel = quizLevelFromLead(lead);
    const goalNote = lead.goal ? `Цель: ${lead.goal}` : null;
    const studentId = existing?.id ?? randomUUID();

    if (existing) {
      await tx
        .update(userTable)
        .set({
          jlptLevel,
          quizLevel: quizLevel ? sql`coalesce(${userTable.quizLevel}, ${quizLevel})` : undefined,
          sourceLeadId: sql`coalesce(${userTable.sourceLeadId}, ${lead.id})`,
          notes: goalNote ? sql`coalesce(${userTable.notes}, ${goalNote})` : undefined,
          timeZone: lead.timeZone,
          updatedAt: now,
        })
        .where(eq(userTable.id, studentId));
    } else {
      await tx.insert(userTable).values({
        id: studentId,
        email: normalizedEmail ?? telegramAccountEmail(lead.telegramId!),
        name: lead.name,
        role: "student",
        jlptLevel,
        quizLevel,
        telegramId: lead.telegramId,
        telegramUsername: lead.telegram,
        timeZone: lead.timeZone,
        sourceLeadId: lead.id,
        notes: goalNote,
        personalDataConsentAt: lead.personalDataConsentAt,
        personalDataConsentVersion: lead.personalDataConsentVersion,
        updatedAt: now,
      });
    }

    await tx
      .insert(studentAccess)
      .values({
        userId: studentId,
        trialUsed: Boolean(lead.trialLessonId),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: studentAccess.userId,
        set: { trialUsed: Boolean(lead.trialLessonId), updatedAt: now },
      });

    if (lead.trialLessonId) {
      await tx
        .insert(bookings)
        .values({ lessonId: lead.trialLessonId, studentId })
        .onConflictDoNothing({ target: [bookings.lessonId, bookings.studentId] });
    }

    // A linked account that has already logged in before will never fire the
    // first-login hook again — it is converted the moment it's linked.
    const nextStatus = existing?.lastLoginAt ? "converted" : "link_sent";
    await tx
      .update(leads)
      .set({
        userId: studentId,
        studentId,
        status: nextStatus,
        nextFollowUpAt: null,
        updatedAt: now,
      })
      .where(eq(leads.id, lead.id));

    return {
      ok: true as const,
      userId: studentId,
      created: !existing,
      alreadySent: false,
      lead,
    };
  });

  if (!conversion.ok) return c.json(conversion);
  if (conversion.alreadySent) return c.json({ ok: true, userId: conversion.userId, resent: false });

  // Account/lead/booking state is committed atomically above; link delivery
  // is intentionally best-effort and outside the transaction.
  const normalizedEmail = conversion.lead.email?.toLowerCase() ?? null;
  let sentEmail = false;
  let sentTelegram = false;
  if (normalizedEmail) {
    await auth.api.signInMagicLink({
      body: {
        email: normalizedEmail,
        name: conversion.lead.name,
        callbackURL: `${env.WEB_ORIGIN}/dashboard`,
      },
      headers: c.req.raw.headers,
    });
    sentEmail = true;
    await logNotification("auth.invite", "email", normalizedEmail, "sent", conversion.userId);
  }
  if (conversion.lead.telegramId) {
    // For telegram-only leads this is the only channel that tells the client
    // their account exists; a send failure (blocked bot, missing /setdomain)
    // must not fail the already-committed conversion.
    sentTelegram = await sendAccountWelcome(conversion.lead.telegramId, conversion.userId).catch(
      (err) => {
        console.error("telegram account welcome failed:", err);
        return false;
      },
    );
  }

  return c.json({ ok: true, userId: conversion.userId, sentEmail, sentTelegram });
});

function quizLevelFromLead(lead: typeof leads.$inferSelect) {
  if (lead.kind !== "quiz") return null;
  return ["start", "N5", "N4", "N3", "N2"].includes(lead.level ?? "") ? lead.level : null;
}

function telegramAccountEmail(telegramId: number) {
  return `telegram-${telegramId}@telegram.gojo.local`;
}

// Flat list of every student account, for the "assign a lesson" picker. Unlike
// GET /students (which is derived from bookings), this includes students who
// have no lessons yet — e.g. a freshly provisioned account.
teacherRoute.get("/student-directory", async (c) => {
  const now = Date.now();
  const rows = await db
    .select({
      id: userTable.id,
      nickname: userTable.nickname,
      name: userTable.name,
      email: userTable.email,
      emailVerified: userTable.emailVerified,
      avatarUrl: userTable.image,
      jlptLevel: userTable.jlptLevel,
      quizLevel: userTable.quizLevel,
      currentLevel: userTable.currentLevel,
      telegramId: userTable.telegramId,
      telegramUsername: userTable.telegramUsername,
      assignedPlanId: studentAccess.assignedPlanId,
      activeUntil: studentAccess.activeUntil,
      lessonCredits: studentAccess.lessonCredits,
      inviteLastSentAt: sql<Date | null>`(
        select max(nl.created_at) from notification_logs nl
        where nl.user_id = ${userTable.id}
          and nl.event in ('auth.invite', 'auth.telegram_account_welcome')
          and nl.status = 'sent'
      )`.as("invite_last_sent_at"),
      lastLoginAt: userTable.lastLoginAt,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })
    .from(userTable)
    .leftJoin(studentAccess, eq(studentAccess.userId, userTable.id))
    .where(eq(userTable.role, "student"))
    .orderBy(asc(userTable.nickname), asc(userTable.email));

  return c.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      nickname: r.nickname ?? null,
      email: r.email,
      emailVerified: r.emailVerified,
      avatarUrl: r.avatarUrl ?? null,
      jlptLevel: r.jlptLevel ?? null,
      quizLevel: r.quizLevel ?? null,
      currentLevel: r.currentLevel,
      telegramId: r.telegramId ?? null,
      telegramUsername: r.telegramUsername ?? null,
      assignedPlanId: r.assignedPlanId ?? null,
      activeUntil: r.activeUntil ? r.activeUntil.toISOString() : null,
      lessonCredits: r.lessonCredits ?? 0,
      isActive: Boolean(
        (r.activeUntil && r.activeUntil.getTime() > now) || (r.lessonCredits ?? 0) > 0,
      ),
      inviteLastSentAt: r.inviteLastSentAt ? new Date(r.inviteLastSentAt).toISOString() : null,
      lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  );
});

teacherRoute.get("/admins", async (c) => {
  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      nickname: userTable.nickname,
      email: userTable.email,
      emailVerified: userTable.emailVerified,
      avatarUrl: userTable.image,
      telegramId: userTable.telegramId,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })
    .from(userTable)
    .where(eq(userTable.role, "admin"))
    .orderBy(asc(userTable.nickname), asc(userTable.email));

  return c.json(
    rows.map((row) => ({
      ...row,
      nickname: row.nickname ?? null,
      avatarUrl: row.avatarUrl ?? null,
      telegramId: row.telegramId ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  );
});

teacherRoute.patch("/admins/:adminId", zValidator("json", updateAdminInput), async (c) => {
  const adminId = c.req.param("adminId");
  const { name, nickname, email, avatarUrl, telegramId } = c.req.valid("json");
  const normalizedEmail = email.toLowerCase();

  const [target] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.id, adminId), eq(userTable.role, "admin")))
    .limit(1);
  if (!target) throw new HTTPException(404, { message: "admin_not_found" });

  const [emailOwner] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1);
  if (emailOwner && emailOwner.id !== adminId) {
    throw new HTTPException(400, { message: "email_already_in_use" });
  }

  if (telegramId !== null) {
    const [telegramOwner] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.telegramId, telegramId))
      .limit(1);
    if (telegramOwner && telegramOwner.id !== adminId) {
      throw new HTTPException(400, { message: "telegram_already_in_use" });
    }
  }

  const [updated] = await db
    .update(userTable)
    .set({
      name,
      nickname: nickname || null,
      email: normalizedEmail,
      image: avatarUrl || null,
      telegramId,
      updatedAt: new Date(),
    })
    .where(and(eq(userTable.id, adminId), eq(userTable.role, "admin")))
    .returning({
      id: userTable.id,
      name: userTable.name,
      nickname: userTable.nickname,
      email: userTable.email,
      emailVerified: userTable.emailVerified,
      avatarUrl: userTable.image,
      telegramId: userTable.telegramId,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    });
  if (!updated) throw new HTTPException(500, { message: "admin_update_failed" });

  return c.json({
    ...updated,
    nickname: updated.nickname ?? null,
    avatarUrl: updated.avatarUrl ?? null,
    telegramId: updated.telegramId ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

const createAdminInput = z.object({
  name: z.string().trim().min(1).max(200),
  nickname: z.string().trim().max(200).nullable().optional(),
  email: z.string().trim().email().max(320),
  telegramId: z.number().int().positive().nullable().optional(),
});

teacherRoute.post("/admins", zValidator("json", createAdminInput), async (c) => {
  const body = c.req.valid("json");
  const normalizedEmail = body.email.toLowerCase();

  const ctx = await auth.$context;
  if (await ctx.internalAdapter.findUserByEmail(normalizedEmail)) {
    throw new HTTPException(400, { message: "email_already_in_use" });
  }
  if (body.telegramId) {
    const [telegramOwner] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.telegramId, body.telegramId))
      .limit(1);
    if (telegramOwner) throw new HTTPException(400, { message: "telegram_already_in_use" });
  }

  const created = await ctx.internalAdapter.createUser({
    email: normalizedEmail,
    name: body.name,
    emailVerified: false,
    role: "admin",
    ...(body.nickname ? { nickname: body.nickname } : {}),
    ...(body.telegramId ? { telegramId: body.telegramId } : {}),
  });

  // Passwordless activation, same as students — the invite signs them
  // straight into the teacher dashboard.
  await auth.api.signInMagicLink({
    body: { email: normalizedEmail, name: body.name, callbackURL: `${env.WEB_ORIGIN}/teacher` },
    headers: c.req.raw.headers,
  });

  return c.json({ ok: true, userId: created.id }, 201);
});

teacherRoute.patch("/students/:studentId", zValidator("json", updateStudentInput), async (c) => {
  const studentId = c.req.param("studentId");
  const body = c.req.valid("json");
  const normalizedEmail = body.email.toLowerCase();

  const assignedPlan = paymentPlans.find((plan) => plan.id === body.assignedPlanId);
  if (body.assignedPlanId && !assignedPlan) {
    throw new HTTPException(400, { message: "unknown_plan" });
  }

  const activeUntil = body.activeUntil ? new Date(body.activeUntil) : null;
  if (assignedPlan?.durationDays) {
    if (!activeUntil || activeUntil.getTime() <= Date.now()) {
      throw new HTTPException(400, { message: "invalid_access_end" });
    }
    if (body.lessonCredits !== 0) {
      throw new HTTPException(400, { message: "monthly_plan_cannot_have_credits" });
    }
  } else if (assignedPlan?.lessonCredits) {
    if (activeUntil || body.lessonCredits < 1) {
      throw new HTTPException(400, { message: "invalid_lesson_credits" });
    }
  } else if (activeUntil || body.lessonCredits !== 0) {
    throw new HTTPException(400, { message: "access_requires_plan" });
  }

  const [target] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.id, studentId), eq(userTable.role, "student")))
    .limit(1);
  if (!target) throw new HTTPException(404, { message: "student_not_found" });

  const [emailOwner] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1);
  if (emailOwner && emailOwner.id !== studentId) {
    throw new HTTPException(400, { message: "email_already_in_use" });
  }

  if (body.telegramId !== null) {
    const [telegramOwner] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.telegramId, body.telegramId))
      .limit(1);
    if (telegramOwner && telegramOwner.id !== studentId) {
      throw new HTTPException(400, { message: "telegram_already_in_use" });
    }
  }

  if (body.telegramUsername !== null) {
    const [telegramUsernameOwner] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.telegramUsername, body.telegramUsername))
      .limit(1);
    if (telegramUsernameOwner && telegramUsernameOwner.id !== studentId) {
      throw new HTTPException(400, { message: "telegram_username_already_in_use" });
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(userTable)
      .set({
        name: body.name,
        nickname: body.nickname || null,
        email: normalizedEmail,
        image: body.avatarUrl || null,
        telegramId: body.telegramId,
        telegramUsername: body.telegramUsername,
        jlptLevel: body.jlptLevel,
        quizLevel: body.quizLevel,
        currentLevel: body.currentLevel,
        updatedAt: now,
      })
      .where(and(eq(userTable.id, studentId), eq(userTable.role, "student")));

    await tx
      .insert(studentAccess)
      .values({
        userId: studentId,
        assignedPlanId: body.assignedPlanId,
        activeUntil,
        lessonCredits: body.lessonCredits,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: studentAccess.userId,
        set: {
          assignedPlanId: body.assignedPlanId,
          activeUntil,
          lessonCredits: body.lessonCredits,
          updatedAt: now,
        },
      });
  });

  return c.json({ ok: true });
});

teacherRoute.get("/students", async (c) => {
  const u = c.get("user")!;
  const now = Date.now();

  const rows = await db
    .select({
      studentId: userTable.id,
      nickname: userTable.nickname,
      email: userTable.email,
      avatarUrl: userTable.image,
      jlptLevel: userTable.jlptLevel,
      quizLevel: userTable.quizLevel,
      lessonCount: sql<number>`COUNT(DISTINCT ${bookings.lessonId})`.as("lesson_count"),
      attendedCount:
        sql<number>`COUNT(DISTINCT CASE WHEN ${bookings.attendanceStatus} = 'attended' THEN ${bookings.lessonId} END)`.as(
          "attended_count",
        ),
      lastLessonAt: sql<Date>`MAX(${lessons.startsAt})`.as("last_lesson_at"),
      activeUntil: studentAccess.activeUntil,
      lessonCredits: studentAccess.lessonCredits,
    })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .innerJoin(userTable, eq(userTable.id, bookings.studentId))
    .leftJoin(studentAccess, eq(studentAccess.userId, bookings.studentId))
    .where(teacherLessonScope(u))
    .groupBy(
      userTable.id,
      userTable.nickname,
      userTable.email,
      userTable.image,
      userTable.jlptLevel,
      userTable.quizLevel,
      studentAccess.activeUntil,
      studentAccess.lessonCredits,
    )
    .orderBy(desc(sql`MAX(${lessons.startsAt})`));

  return c.json(
    rows.map((r) => {
      const lessonCredits = r.lessonCredits ?? 0;
      const activeUntil = r.activeUntil ? r.activeUntil.getTime() : null;
      return {
        studentId: r.studentId,
        nickname: r.nickname ?? null,
        email: r.email,
        avatarUrl: r.avatarUrl ?? null,
        jlptLevel: r.jlptLevel ?? null,
        quizLevel: r.quizLevel ?? null,
        lessonCount: Number(r.lessonCount),
        attendedCount: Number(r.attendedCount),
        lastLessonAt: r.lastLessonAt ? new Date(r.lastLessonAt).toISOString() : null,
        activeUntil: r.activeUntil ? r.activeUntil.toISOString() : null,
        lessonCredits,
        isActive: Boolean((activeUntil && activeUntil > now) || lessonCredits > 0),
      };
    }),
  );
});

teacherRoute.get("/students/:studentId", async (c) => {
  const u = c.get("user")!;
  const studentId = c.req.param("studentId");

  const lessonScope = teacherLessonScope(u);
  const rows = await db
    .select({
      booking: bookings,
      lesson: lessons,
      homeworkStatus: homework.status,
      homeworkMarkedAt: homework.markedAt,
    })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .leftJoin(
      homework,
      and(eq(homework.lessonId, bookings.lessonId), eq(homework.studentId, bookings.studentId)),
    )
    .where(and(eq(bookings.studentId, studentId), lessonScope))
    .orderBy(desc(lessons.startsAt));

  if (rows.length === 0 && u.role !== "admin") {
    throw new HTTPException(404, { message: "student not found in your lessons" });
  }

  const [student] = await db.select().from(userTable).where(eq(userTable.id, studentId)).limit(1);
  if (!student) throw new HTTPException(404, { message: "student not found" });

  const snapshot = await getStudentAccessSnapshot(studentId);

  const leadRows = await db
    .select()
    .from(leads)
    .where(eq(leads.userId, studentId))
    .orderBy(desc(leads.createdAt))
    .limit(10);

  const attended = rows.filter((r) => r.booking.attendanceStatus === "attended").length;
  const noShow = rows.filter((r) => r.booking.attendanceStatus === "no_show").length;

  return c.json({
    student: {
      id: student.id,
      nickname: student.nickname ?? student.name ?? null,
      email: student.email,
      avatarUrl: student.image ?? null,
      jlptLevel: student.jlptLevel ?? null,
      quizLevel: student.quizLevel ?? null,
      telegramId: student.telegramId ?? null,
      assignedPlanId: snapshot.access.assignedPlanId,
      createdAt: student.createdAt.toISOString(),
    },
    access: snapshot.access,
    assignedPlan: snapshot.assignedPlan,
    payments: snapshot.payments,
    progress: { attended, noShow, total: rows.length },
    lessons: rows.map((r) => ({
      lessonId: r.lesson.id,
      title: r.lesson.title,
      startsAt: r.lesson.startsAt.toISOString(),
      status: r.lesson.status,
      attendanceStatus: r.booking.attendanceStatus,
      postLessonNote: r.booking.postLessonNote,
      recommendation: r.booking.recommendation,
      homeworkStatus: r.homeworkStatus ?? "pending",
      homeworkMarkedAt: r.homeworkMarkedAt ? r.homeworkMarkedAt.toISOString() : null,
    })),
    leads: leadRows.map((l) => ({
      id: l.id,
      status: l.status,
      kind: l.kind,
      name: l.name,
      telegram: l.telegram,
      email: l.email,
      phone: l.phone,
      level: l.level,
      goal: l.goal,
      notes: l.notes,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

// Re-deliver access for a student who lost or never received the original
// invite: magic-link email (real addresses only) and/or the Telegram login
// button, whichever channels the account has.
const recentInviteResends = new Map<string, number>();
const INVITE_RESEND_MS = 60_000;

teacherRoute.post("/students/:studentId/resend-invite", async (c) => {
  const studentId = c.req.param("studentId");

  const now = Date.now();
  const lastResend = recentInviteResends.get(studentId) ?? 0;
  if (now - lastResend < INVITE_RESEND_MS) {
    throw new HTTPException(429, { message: "invite_cooldown" });
  }
  recentInviteResends.set(studentId, now);
  for (const [key, at] of recentInviteResends) {
    if (now - at > INVITE_RESEND_MS) recentInviteResends.delete(key);
  }

  const [student] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      telegramId: userTable.telegramId,
    })
    .from(userTable)
    .where(and(eq(userTable.id, studentId), eq(userTable.role, "student")))
    .limit(1);
  if (!student) throw new HTTPException(404, { message: "student_not_found" });

  let sentEmail = false;
  let sentTelegram = false;
  if (student.email && !isTelegramPlaceholderEmail(student.email)) {
    await auth.api.signInMagicLink({
      body: {
        email: student.email,
        name: student.name,
        callbackURL: `${env.WEB_ORIGIN}/dashboard`,
      },
      headers: c.req.raw.headers,
    });
    sentEmail = true;
    await logNotification("auth.invite", "email", student.email, "sent", student.id);
  }
  if (student.telegramId) {
    sentTelegram = await sendAccountWelcome(student.telegramId, student.id).catch(() => false);
  }
  if (!sentEmail && !sentTelegram) {
    throw new HTTPException(400, { message: "no_delivery_channel" });
  }
  return c.json({ ok: true, sentEmail, sentTelegram });
});

teacherRoute.patch(
  "/students/:studentId/plan",
  zValidator("json", setStudentPlanInput),
  async (c) => {
    const studentId = c.req.param("studentId");
    const { planId } = c.req.valid("json");
    if (!paymentPlans.some((p) => p.id === planId)) {
      throw new HTTPException(400, { message: "unknown plan" });
    }

    const [student] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.id, studentId))
      .limit(1);
    if (!student) throw new HTTPException(404, { message: "student not found" });

    await db
      .insert(studentAccess)
      .values({ userId: studentId, assignedPlanId: planId, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: studentAccess.userId,
        set: { assignedPlanId: planId, updatedAt: new Date() },
      });

    return c.json({ studentId, assignedPlanId: planId });
  },
);

teacherRoute.get("/lessons", async (c) => {
  const u = c.get("user")!;
  const now = new Date();

  const rows = await db
    .select({
      lesson: lessons,
      // NB: aliased raw subqueries — drizzle strips table qualifiers from
      // sql`` column refs in single-table selects, which makes bare column
      // names resolve against the subquery's own table.
      studentCount:
        sql<number>`(SELECT COUNT(*) FROM bookings b WHERE b.lesson_id = lessons.id)`.as(
          "student_count",
        ),
      studentNames: sql<
        string | null
      >`(SELECT string_agg(COALESCE(u.nickname, u.name), ', ' ORDER BY COALESCE(u.nickname, u.name)) FROM bookings b INNER JOIN "user" u ON u.id = b.student_id WHERE b.lesson_id = lessons.id)`.as(
        "student_names",
      ),
      pendingAttendance:
        sql<number>`(SELECT COUNT(*) FROM bookings b WHERE b.lesson_id = lessons.id AND b.attendance_status = 'scheduled')`.as(
          "pending_attendance",
        ),
      pendingHomework:
        sql<number>`(SELECT COUNT(*) FROM bookings b WHERE b.lesson_id = lessons.id AND b.attendance_status = 'attended' AND NOT EXISTS (SELECT 1 FROM homework h WHERE h.lesson_id = b.lesson_id AND h.student_id = b.student_id AND h.status <> 'pending'))`.as(
          "pending_homework",
        ),
    })
    .from(lessons)
    .where(teacherLessonScope(u))
    .orderBy(desc(lessons.startsAt))
    .limit(100);

  return c.json(
    rows.map((r) => {
      const studentCount = Number(r.studentCount);
      return {
        ...toLessonDto(r.lesson, null, {
          studentCount,
          isParticipant: true,
          now,
          includeMeetingUrl: true,
        }),
        studentNames: r.studentNames ?? null,
        pendingAttendance: Number(r.pendingAttendance),
        pendingHomework: Number(r.pendingHomework),
      };
    }),
  );
});

teacherRoute.post("/lessons", zValidator("json", createLessonInput), async (c) => {
  const u = c.get("user")!;
  const body = c.req.valid("json");
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  validateNewLessonTime(startsAt, endsAt);

  const studentIds = [
    ...new Set([...(body.studentIds ?? []), ...(body.studentId ? [body.studentId] : [])]),
  ];
  if (studentIds.length > 8) {
    throw new HTTPException(400, { message: "too_many_students" });
  }

  if (studentIds.length > 0) {
    const students = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(inArray(userTable.id, studentIds), eq(userTable.role, "student")));
    if (students.length !== studentIds.length) {
      throw new HTTPException(400, { message: "unknown_student" });
    }
  }

  if (body.unitId) {
    const [unit] = await db
      .select({ id: units.id })
      .from(units)
      .where(eq(units.id, body.unitId))
      .limit(1);
    if (!unit) throw new HTTPException(400, { message: "unknown_unit" });
  }

  const created = await db.transaction(async (tx) => {
    const [lesson] = await tx
      .insert(lessons)
      .values({
        teacherId: u.id,
        title: body.title,
        startsAt,
        endsAt,
        unitId: body.unitId ?? null,
        meetingUrl: body.meetingUrl,
        metadata: body.metadata,
        ...(studentIds.length > 0 ? { maxStudents: studentIds.length } : {}),
      })
      .returning();
    if (!lesson) throw new HTTPException(500, { message: "failed_to_create_lesson" });

    const invited =
      studentIds.length > 0
        ? await tx
            .insert(bookings)
            .values(studentIds.map((studentId) => ({ lessonId: lesson.id, studentId })))
            .returning({ id: bookings.id, studentId: bookings.studentId })
        : [];
    return { lesson, invited };
  });

  await Promise.all(
    created.invited.map((booking) =>
      sendLessonConfirmation(
        { bookingId: booking.id, userId: booking.studentId },
        created.lesson.title,
        created.lesson.startsAt,
        created.lesson.meetingUrl,
      ),
    ),
  );

  return c.json(
    toLessonDto(created.lesson, null, {
      includeMeetingUrl: true,
      studentCount: created.invited.length,
    }),
    201,
  );
});

teacherRoute.patch("/lessons/:id", zValidator("json", updateLessonInput), async (c) => {
  const u = c.get("user")!;
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [existing] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, existing)) throw new HTTPException(403, { message: "not your lesson" });

  const patch: Partial<typeof lessons.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) patch.title = body.title;
  if (body.startsAt !== undefined) patch.startsAt = new Date(body.startsAt);
  if (body.endsAt !== undefined) patch.endsAt = new Date(body.endsAt);
  if (body.status !== undefined) patch.status = body.status;
  if (body.meetingUrl !== undefined) patch.meetingUrl = body.meetingUrl;
  if (body.unitId !== undefined) {
    if (body.unitId) {
      const [unit] = await db
        .select({ id: units.id })
        .from(units)
        .where(eq(units.id, body.unitId))
        .limit(1);
      if (!unit) throw new HTTPException(400, { message: "unknown_unit" });
    }
    patch.unitId = body.unitId;
  }

  const [row] = await db.update(lessons).set(patch).where(eq(lessons.id, id)).returning();
  if (!row) throw new HTTPException(500, { message: "update failed" });
  return c.json(toLessonDto(row, null, { includeMeetingUrl: true }));
});

teacherRoute.delete("/lessons/:id", async (c) => {
  const u = c.get("user")!;
  const id = c.req.param("id");

  const [existing] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, existing)) throw new HTTPException(403, { message: "not your lesson" });

  await db
    .update(lessons)
    .set({ deletedAt: new Date(), status: "cancelled" })
    .where(eq(lessons.id, id));
  return c.json({ ok: true });
});

teacherRoute.get("/lessons/:id/students", async (c) => {
  const u = c.get("user")!;
  const id = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

  const rows = await db
    .select({
      bookingId: bookings.id,
      studentId: userTable.id,
      nickname: userTable.nickname,
      email: userTable.email,
      avatarUrl: userTable.image,
      bookedAt: bookings.createdAt,
      attendanceStatus: bookings.attendanceStatus,
      postLessonNote: bookings.postLessonNote,
      recommendation: bookings.recommendation,
      homeworkStatus: homework.status,
      homeworkMarkedAt: homework.markedAt,
      jlptLevel: userTable.jlptLevel,
      quizLevel: userTable.quizLevel,
    })
    .from(bookings)
    .innerJoin(userTable, eq(userTable.id, bookings.studentId))
    .leftJoin(
      homework,
      and(eq(homework.lessonId, bookings.lessonId), eq(homework.studentId, bookings.studentId)),
    )
    .where(eq(bookings.lessonId, id));

  return c.json(
    rows.map((r) => ({
      bookingId: r.bookingId,
      studentId: r.studentId,
      nickname: r.nickname,
      email: r.email,
      avatarUrl: r.avatarUrl,
      bookedAt: r.bookedAt,
      attendanceStatus: r.attendanceStatus,
      postLessonNote: r.postLessonNote,
      recommendation: r.recommendation,
      homeworkStatus: r.homeworkStatus ?? "pending",
      homeworkMarkedAt: r.homeworkMarkedAt ? r.homeworkMarkedAt.toISOString() : null,
      jlptLevel: r.jlptLevel ?? null,
      quizLevel: r.quizLevel ?? null,
    })),
  );
});

const addLessonStudentInput = z.object({ studentId: z.string().min(1) });

teacherRoute.post("/lessons/:id/students", zValidator("json", addLessonStudentInput), async (c) => {
  const u = c.get("user")!;
  const id = c.req.param("id");
  const { studentId } = c.req.valid("json");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });
  if (lesson.status === "cancelled" || lesson.deletedAt) {
    throw new HTTPException(400, { message: "lesson_cancelled" });
  }

  const [student] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.id, studentId), eq(userTable.role, "student")))
    .limit(1);
  if (!student) throw new HTTPException(400, { message: "unknown_student" });

  const added = await db.transaction(async (tx) => {
    const [countRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(eq(bookings.lessonId, id));
    const current = Number(countRow?.count ?? 0);
    if (current >= 8) throw new HTTPException(400, { message: "too_many_students" });

    const inserted = await tx
      .insert(bookings)
      .values({ lessonId: id, studentId })
      .onConflictDoNothing({ target: [bookings.lessonId, bookings.studentId] })
      .returning({ id: bookings.id });

    // maxStudents was frozen at the creation-time roster size; grow it so
    // the stored capacity never contradicts the actual roster.
    if (inserted.length > 0 && current + 1 > lesson.maxStudents) {
      await tx
        .update(lessons)
        .set({ maxStudents: current + 1, updatedAt: new Date() })
        .where(eq(lessons.id, id));
    }
    return inserted[0];
  });

  if (added) {
    await sendLessonConfirmation(
      { bookingId: added.id, userId: studentId },
      lesson.title,
      lesson.startsAt,
      lesson.meetingUrl,
    );
  }
  return c.json({ ok: true, added: Boolean(added) }, added ? 201 : 200);
});

teacherRoute.delete("/lessons/:id/students/:studentId", async (c) => {
  const u = c.get("user")!;
  const id = c.req.param("id");
  const studentId = c.req.param("studentId");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.lessonId, id), eq(bookings.studentId, studentId)))
    .limit(1);
  if (!booking) throw new HTTPException(404, { message: "booking not found" });
  // An attended booking already carries notes/homework/SRS state — removing it
  // would silently orphan that record, so it stays.
  if (booking.attendanceStatus === "attended") {
    throw new HTTPException(400, { message: "student_already_attended" });
  }

  await db.delete(bookings).where(eq(bookings.id, booking.id));
  return c.json({ ok: true });
});

teacherRoute.patch(
  "/lessons/:id/students/:studentId/level",
  zValidator("json", setStudentLevelInput),
  async (c) => {
    const u = c.get("user")!;
    const lessonId = c.req.param("id");
    const studentId = c.req.param("studentId");
    const { jlptLevel } = c.req.valid("json");

    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
    if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.lessonId, lessonId), eq(bookings.studentId, studentId)))
      .limit(1);
    if (!booking) throw new HTTPException(404, { message: "student not booked on this lesson" });

    const [row] = await db
      .update(userTable)
      .set({ jlptLevel, updatedAt: new Date() })
      .where(eq(userTable.id, studentId))
      .returning();
    if (!row) throw new HTTPException(404, { message: "student not found" });

    return c.json({ studentId: row.id, jlptLevel: row.jlptLevel ?? null });
  },
);

teacherRoute.patch(
  "/lessons/:id/homework/:studentId",
  zValidator("json", setHomeworkStatusInput),
  async (c) => {
    const u = c.get("user")!;
    const lessonId = c.req.param("id");
    const studentId = c.req.param("studentId");
    const { status } = c.req.valid("json");

    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
    if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.lessonId, lessonId), eq(bookings.studentId, studentId)))
      .limit(1);
    if (!booking) throw new HTTPException(404, { message: "student not booked on this lesson" });

    const now = new Date();
    const [row] = await db
      .insert(homework)
      .values({ lessonId, studentId, status, markedBy: u.id, markedAt: now })
      .onConflictDoUpdate({
        target: [homework.lessonId, homework.studentId],
        set: { status, markedBy: u.id, markedAt: now, updatedAt: now },
      })
      .returning();
    if (!row) throw new HTTPException(500, { message: "update failed" });

    return c.json({
      studentId: row.studentId,
      status: row.status,
      markedAt: row.markedAt ? row.markedAt.toISOString() : null,
    });
  },
);

// All homework submissions for a lesson (with AI markup), newest first.
teacherRoute.get("/lessons/:id/submissions", async (c) => {
  const u = c.get("user")!;
  const lessonId = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

  const rows = await db
    .select({
      submission: homeworkSubmissions,
      nickname: userTable.nickname,
      email: userTable.email,
    })
    .from(homeworkSubmissions)
    .innerJoin(userTable, eq(userTable.id, homeworkSubmissions.studentId))
    .where(eq(homeworkSubmissions.lessonId, lessonId))
    .orderBy(desc(homeworkSubmissions.createdAt));

  return c.json(
    rows.map((r) => ({
      ...toSubmissionDto(r.submission),
      nickname: r.nickname ?? null,
      email: r.email,
    })),
  );
});

teacherRoute.post(
  "/submissions/:id/review",
  zValidator("json", reviewSubmissionInput),
  async (c) => {
    const u = c.get("user")!;
    const submissionId = c.req.param("id");
    const { decision, comment } = c.req.valid("json");

    const [submission] = await db
      .select()
      .from(homeworkSubmissions)
      .where(eq(homeworkSubmissions.id, submissionId))
      .limit(1);
    if (!submission) throw new HTTPException(404, { message: "submission not found" });

    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, submission.lessonId))
      .limit(1);
    if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
    if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

    const now = new Date();
    const [row] = await db
      .update(homeworkSubmissions)
      .set({
        status: decision,
        teacherComment: comment ?? null,
        reviewedBy: u.id,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(homeworkSubmissions.id, submissionId))
      .returning();
    if (!row) throw new HTTPException(500, { message: "update failed" });

    // Approval is the accountability gate — mirror it into the teacher-facing
    // homework status so existing dashboards and stats pick it up.
    if (decision === "approved") {
      await db
        .insert(homework)
        .values({
          lessonId: submission.lessonId,
          studentId: submission.studentId,
          status: "done",
          markedBy: u.id,
          markedAt: now,
        })
        .onConflictDoUpdate({
          target: [homework.lessonId, homework.studentId],
          set: { status: "done", markedBy: u.id, markedAt: now, updatedAt: now },
        });
    }

    return c.json(toSubmissionDto(row));
  },
);

teacherRoute.patch(
  "/lessons/:id/students/:studentId/post-lesson",
  zValidator("json", postLessonInput),
  async (c) => {
    const u = c.get("user")!;
    const lessonId = c.req.param("id");
    const studentId = c.req.param("studentId");
    const body = c.req.valid("json");

    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
    if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

    const patch: Partial<typeof bookings.$inferInsert> = {};
    if (body.attendanceStatus !== undefined) patch.attendanceStatus = body.attendanceStatus;
    if (body.postLessonNote !== undefined) patch.postLessonNote = body.postLessonNote;
    if (body.recommendation !== undefined) patch.recommendation = body.recommendation;

    const [row] = await db
      .update(bookings)
      .set(patch)
      .where(and(eq(bookings.lessonId, lessonId), eq(bookings.studentId, studentId)))
      .returning();
    if (!row) throw new HTTPException(404, { message: "student not booked on this lesson" });

    if (body.attendanceStatus === "attended") {
      await materializeCardsForAttendance(studentId, lessonId);
      await materializeUnitDeckForAttendance(studentId, lessonId);
    }

    return c.json({
      studentId: row.studentId,
      attendanceStatus: row.attendanceStatus,
      postLessonNote: row.postLessonNote,
      recommendation: row.recommendation,
    });
  },
);

const MAX_MATERIAL_SIZE = 10 * 1024 * 1024;

teacherRoute.post("/lessons/:id/materials", async (c) => {
  const u = c.get("user")!;
  const lessonId = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

  const form = await c.req.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) {
    throw new HTTPException(400, { message: "file required" });
  }
  if (file.size > MAX_MATERIAL_SIZE) {
    throw new HTTPException(413, { message: "file too large (max 10MB)" });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const key = `materials/${lessonId}/${Date.now()}.${ext}`;
  const body = new Uint8Array(await file.arrayBuffer());
  const url = await putObject(key, body, file.type);

  const [row] = await db
    .insert(lessonMaterials)
    .values({
      lessonId,
      uploadedBy: u.id,
      title: title || file.name,
      fileUrl: url,
      fileType: file.type,
    })
    .returning();

  return c.json(
    {
      id: row!.id,
      lessonId: row!.lessonId,
      title: row!.title,
      fileUrl: row!.fileUrl,
      fileType: row!.fileType,
      createdAt: row!.createdAt.toISOString(),
    },
    201,
  );
});

teacherRoute.delete("/lessons/:id/materials/:materialId", async (c) => {
  const u = c.get("user")!;
  const lessonId = c.req.param("id");
  const materialId = c.req.param("materialId");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

  // The S3 object is left in place: it's cheap, and a dangling fileUrl in a
  // student's open tab keeps working until the page refreshes.
  const [removed] = await db
    .delete(lessonMaterials)
    .where(and(eq(lessonMaterials.id, materialId), eq(lessonMaterials.lessonId, lessonId)))
    .returning({ id: lessonMaterials.id });
  if (!removed) throw new HTTPException(404, { message: "material not found" });

  return c.json({ ok: true });
});

teacherRoute.get("/lessons/:id/cards", async (c) => {
  const u = c.get("user")!;
  const lessonId = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

  const rows = await db
    .select()
    .from(lessonCards)
    .where(eq(lessonCards.lessonId, lessonId))
    .orderBy(asc(lessonCards.position), asc(lessonCards.createdAt));
  return c.json(rows.map(toLessonCardDto));
});

teacherRoute.post("/lessons/:id/cards", zValidator("json", addLessonCardInput), async (c) => {
  const u = c.get("user")!;
  const lessonId = c.req.param("id");
  const body = c.req.valid("json");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

  const [maxPos] = await db
    .select({
      value: sql<number>`COALESCE(MAX(${lessonCards.position}), -1) + 1`.as("value"),
    })
    .from(lessonCards)
    .where(eq(lessonCards.lessonId, lessonId));

  const [row] = await db
    .insert(lessonCards)
    .values({
      lessonId,
      word: body.word,
      reading: body.reading,
      meaning: body.meaning,
      notes: body.notes,
      position: Number(maxPos?.value ?? 0),
    })
    .returning();
  if (!row) throw new HTTPException(500, { message: "insert failed" });

  await materializeNewCardForAttendedBookings(row.id);
  return c.json(toLessonCardDto(row), 201);
});

teacherRoute.delete("/lessons/:id/cards/:cardId", async (c) => {
  const u = c.get("user")!;
  const lessonId = c.req.param("id");
  const cardId = c.req.param("cardId");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!canManageLesson(u, lesson)) throw new HTTPException(403, { message: "not your lesson" });

  await db
    .delete(lessonCards)
    .where(and(eq(lessonCards.id, cardId), eq(lessonCards.lessonId, lessonId)));
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Curriculum authoring: units (lesson-sized slices of a level) and the level
// vocab they hand out. This is the cold-path CMS surface — lesson prep never
// mutates units; it only points lessons at them.
// ---------------------------------------------------------------------------

const createUnitInput = z.object({
  levelId: z.number().int().min(1).max(30),
  title: z.string().trim().min(1).max(200),
  sourceBook: z.string().trim().max(200).nullable().optional(),
  sourceChapter: z.string().trim().max(100).nullable().optional(),
});

const updateUnitInput = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  position: z.number().int().min(0).max(999).optional(),
  sourceBook: z.string().trim().max(200).nullable().optional(),
  sourceChapter: z.string().trim().max(100).nullable().optional(),
});

teacherRoute.get("/units", async (c) => {
  // Raw aliases in the correlated subqueries: drizzle strips table qualifiers
  // from sql`` fragments in single-table selects.
  const rows = await db
    .select({
      unit: units,
      vocabCount: sql<number>`(select count(*) from level_vocab lv where lv.unit_id = units.id)`.as(
        "vocab_count",
      ),
      lessonCount:
        sql<number>`(select count(*) from lessons l where l.unit_id = units.id and l.deleted_at is null)`.as(
          "lesson_count",
        ),
    })
    .from(units)
    .orderBy(asc(units.levelId), asc(units.position), asc(units.createdAt));

  return c.json(
    rows.map((r) => ({
      id: r.unit.id,
      levelId: r.unit.levelId,
      position: r.unit.position,
      title: r.unit.title,
      sourceBook: r.unit.sourceBook ?? null,
      sourceChapter: r.unit.sourceChapter ?? null,
      vocabCount: Number(r.vocabCount),
      lessonCount: Number(r.lessonCount),
    })),
  );
});

teacherRoute.post("/units", zValidator("json", createUnitInput), async (c) => {
  const body = c.req.valid("json");
  const [positionRow] = await db
    .select({ nextPosition: sql<number>`coalesce(max(position), 0) + 1` })
    .from(units)
    .where(eq(units.levelId, body.levelId));
  const nextPosition = Number(positionRow?.nextPosition ?? 1);

  const [row] = await db
    .insert(units)
    .values({
      levelId: body.levelId,
      position: nextPosition,
      title: body.title,
      sourceBook: body.sourceBook ?? null,
      sourceChapter: body.sourceChapter ?? null,
    })
    .returning();
  if (!row) throw new HTTPException(500, { message: "unit_create_failed" });
  return c.json({ ok: true, unitId: row.id }, 201);
});

teacherRoute.patch("/units/:id", zValidator("json", updateUnitInput), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const patch: Partial<typeof units.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) patch.title = body.title;
  if (body.position !== undefined) patch.position = body.position;
  if (body.sourceBook !== undefined) patch.sourceBook = body.sourceBook;
  if (body.sourceChapter !== undefined) patch.sourceChapter = body.sourceChapter;

  const [row] = await db.update(units).set(patch).where(eq(units.id, id)).returning();
  if (!row) throw new HTTPException(404, { message: "unit_not_found" });
  return c.json({ ok: true });
});

teacherRoute.delete("/units/:id", async (c) => {
  const id = c.req.param("id");
  // FKs detach dependents (level_vocab.unit_id and lessons.unit_id both SET
  // NULL); already-materialized student flashcards are untouched.
  const [row] = await db.delete(units).where(eq(units.id, id)).returning({ id: units.id });
  if (!row) throw new HTTPException(404, { message: "unit_not_found" });
  return c.json({ ok: true });
});

const createLevelVocabInput = z.object({
  levelId: z.number().int().min(1).max(30),
  word: z.string().trim().min(1).max(100),
  reading: z.string().trim().min(1).max(200),
  meaning: z.string().trim().min(1).max(300),
  unitId: z.string().uuid().nullable().optional(),
});

const updateLevelVocabInput = z.object({
  word: z.string().trim().min(1).max(100).optional(),
  reading: z.string().trim().min(1).max(200).optional(),
  meaning: z.string().trim().min(1).max(300).optional(),
  unitId: z.string().uuid().nullable().optional(),
});

async function assertUnitInLevel(unitId: string, levelId: number) {
  const [unit] = await db
    .select({ levelId: units.levelId })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1);
  if (!unit) throw new HTTPException(400, { message: "unknown_unit" });
  if (unit.levelId !== levelId) throw new HTTPException(400, { message: "unit_level_mismatch" });
}

teacherRoute.post("/level-vocab", zValidator("json", createLevelVocabInput), async (c) => {
  const body = c.req.valid("json");
  if (body.unitId) await assertUnitInLevel(body.unitId, body.levelId);

  const [vocabPositionRow] = await db
    .select({ nextPosition: sql<number>`coalesce(max(position), 0) + 1` })
    .from(levelVocab)
    .where(eq(levelVocab.levelId, body.levelId));
  const nextPosition = Number(vocabPositionRow?.nextPosition ?? 1);

  const [row] = await db
    .insert(levelVocab)
    .values({
      levelId: body.levelId,
      word: body.word,
      reading: body.reading,
      meaningRu: body.meaning,
      meaningEn: body.meaning,
      position: nextPosition,
      unitId: body.unitId ?? null,
    })
    .onConflictDoNothing({ target: [levelVocab.levelId, levelVocab.word] })
    .returning();
  if (!row) throw new HTTPException(400, { message: "word_already_in_level" });
  return c.json({ ok: true, vocabId: row.id }, 201);
});

teacherRoute.patch("/level-vocab/:id", zValidator("json", updateLevelVocabInput), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [existing] = await db.select().from(levelVocab).where(eq(levelVocab.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "vocab_not_found" });
  if (body.unitId) await assertUnitInLevel(body.unitId, existing.levelId);

  const patch: Partial<typeof levelVocab.$inferInsert> = {};
  if (body.word !== undefined) patch.word = body.word;
  if (body.reading !== undefined) patch.reading = body.reading;
  if (body.meaning !== undefined) patch.meaningRu = body.meaning;
  if (body.unitId !== undefined) patch.unitId = body.unitId;
  await db.update(levelVocab).set(patch).where(eq(levelVocab.id, id));

  // Propagate display-field fixes to already-materialized student cards (SRS
  // state untouched). The NOT EXISTS guard skips students whose deck already
  // has the new word from another source — the (user_id, word) index would
  // reject those rows.
  const word = body.word ?? existing.word;
  const reading = body.reading ?? existing.reading;
  const meaning = body.meaning ?? existing.meaningRu ?? existing.meaningEn;
  if (body.word !== undefined || body.reading !== undefined || body.meaning !== undefined) {
    await db.execute(sql`
      update flashcards f
      set word = ${word}, reading = ${reading}, meaning = ${meaning}, updated_at = now()
      where f.level_vocab_id = ${id}
        and not exists (
          select 1 from flashcards f2
          where f2.user_id = f.user_id and f2.word = ${word} and f2.id <> f.id
        )
    `);
  }
  return c.json({ ok: true });
});

teacherRoute.delete("/level-vocab/:id", async (c) => {
  const id = c.req.param("id");
  // flashcards.level_vocab_id is SET NULL — students keep already-learned cards.
  const [row] = await db
    .delete(levelVocab)
    .where(eq(levelVocab.id, id))
    .returning({ id: levelVocab.id });
  if (!row) throw new HTTPException(404, { message: "vocab_not_found" });
  return c.json({ ok: true });
});
