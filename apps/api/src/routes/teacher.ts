import {
  bookings,
  homework,
  homeworkSubmissions,
  leads,
  lessonCards,
  lessonMaterials,
  lessons,
  studentAccess,
  user as userTable,
} from "@gojo/db";
import {
  addLessonCardInput,
  createStudentInput,
  reviewSubmissionInput,
  setHomeworkStatusInput,
  setStudentLevelInput,
  setStudentPlanInput,
} from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
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
} from "../lib/materialize.ts";
import { putObject } from "../s3.ts";
import { sendLessonConfirmation } from "./lessons.ts";
import { toLessonCardDto, toLessonDto, toSubmissionDto } from "./mappers.ts";
import { getStudentAccessSnapshot, paymentPlans } from "./payments.ts";

export const teacherRoute = new Hono<AuthContext>();

const createLessonInput = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  // studentId remains accepted for older clients. New clients send studentIds
  // so one lesson can invite a whole group at creation time.
  studentId: z.string().min(1).optional(),
  studentIds: z.array(z.string().min(1)).max(8).optional(),
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
  meetingUrl: z.string().url().max(500).nullable().optional(),
});

const leadStatusInput = z.object({
  status: z
    .enum(["new", "contacted", "trial_booked", "trial_done", "converted", "lost"])
    .optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
});

const createTrialLessonInput = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
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
      assigneeId: r.lead.assigneeId,
      assigneeName: r.assigneeNickname ?? r.assigneeEmail ?? null,
      trialLessonId: r.lead.trialLessonId,
      kind: r.lead.kind,
      status: r.lead.status,
      name: r.lead.name,
      telegram: r.lead.telegram,
      email: r.lead.email,
      phone: r.lead.phone,
      level: r.lead.level,
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
        },
        lesson.title,
        lesson.startsAt,
      );
    } else {
      await sendLessonConfirmation({ email: lead.email }, lesson.title, lesson.startsAt);
    }

    return c.json(toLessonDto(lesson, null), 201);
  },
);

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

teacherRoute.patch("/students/:studentId", zValidator("json", updateStudentInput), async (c) => {
  const studentId = c.req.param("studentId");
  const body = c.req.valid("json");
  const normalizedEmail = body.email.toLowerCase();

  if (body.assignedPlanId && !paymentPlans.some((plan) => plan.id === body.assignedPlanId)) {
    throw new HTTPException(400, { message: "unknown_plan" });
  }

  const activeUntil = body.activeUntil ? new Date(body.activeUntil) : null;
  if (body.assignedPlanId === "monthly-standard") {
    if (!activeUntil || activeUntil.getTime() <= Date.now()) {
      throw new HTTPException(400, { message: "invalid_access_end" });
    }
    if (body.lessonCredits !== 0) {
      throw new HTTPException(400, { message: "monthly_plan_cannot_have_credits" });
    }
  } else if (body.assignedPlanId === "bundle-8") {
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

// Accounts are admin-provisioned only (no public self-signup) — this is the
// one path that creates a student login. Auth is passwordless: we create the
// user directly, then email a magic-link invite that activates the account.
teacherRoute.post("/students", zValidator("json", createStudentInput), async (c) => {
  const {
    email,
    name,
    nickname,
    telegramUsername,
    telegramId,
    planId,
    activeUntil: activeUntilIso,
    lessonCredits,
  } = c.req.valid("json");
  const normalizedEmail = email.toLowerCase();
  if (!paymentPlans.some((p) => p.id === planId)) {
    throw new HTTPException(400, { message: "unknown plan" });
  }
  const activeUntil = activeUntilIso ? new Date(activeUntilIso) : null;
  if (planId === "monthly-standard") {
    if (!activeUntil || activeUntil.getTime() <= Date.now()) {
      throw new HTTPException(400, { message: "invalid_access_end" });
    }
    if (lessonCredits !== 0) {
      throw new HTTPException(400, { message: "monthly_plan_cannot_have_credits" });
    }
  }
  if (planId === "bundle-8" && (activeUntil || lessonCredits < 1)) {
    throw new HTTPException(400, { message: "invalid_lesson_credits" });
  }

  const ctx = await auth.$context;
  if (await ctx.internalAdapter.findUserByEmail(normalizedEmail)) {
    throw new HTTPException(400, { message: "email already registered" });
  }
  if (telegramUsername) {
    const [existingTelegram] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.telegramUsername, telegramUsername))
      .limit(1);
    if (existingTelegram) {
      throw new HTTPException(400, { message: "telegram_username_already_in_use" });
    }
  }
  if (telegramId) {
    const [existingTelegramId] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.telegramId, telegramId))
      .limit(1);
    if (existingTelegramId) {
      throw new HTTPException(400, { message: "telegram_already_in_use" });
    }
  }
  const created = await ctx.internalAdapter.createUser({
    email: normalizedEmail,
    name,
    emailVerified: false,
    role: "student",
    ...(nickname ? { nickname } : {}),
    ...(telegramUsername ? { telegramUsername } : {}),
    ...(telegramId ? { telegramId } : {}),
  });

  await db.insert(studentAccess).values({
    userId: created.id,
    assignedPlanId: planId,
    activeUntil: planId === "monthly-standard" ? activeUntil : null,
    lessonCredits: planId === "bundle-8" ? lessonCredits : 0,
    updatedAt: new Date(),
  });

  // Passwordless activation: a magic link that signs them straight in.
  await auth.api.signInMagicLink({
    body: { email: normalizedEmail, name, callbackURL: `${env.WEB_ORIGIN}/dashboard` },
    headers: c.req.raw.headers,
  });

  return c.json({ ok: true, userId: created.id }, 201);
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
      studentCount:
        sql<number>`(SELECT COUNT(*) FROM ${bookings} WHERE ${bookings.lessonId} = ${lessons.id})`.as(
          "student_count",
        ),
    })
    .from(lessons)
    .where(teacherLessonScope(u))
    .orderBy(desc(lessons.startsAt))
    .limit(100);

  return c.json(
    rows.map((r) => {
      const studentCount = Number(r.studentCount);
      return toLessonDto(r.lesson, null, {
        studentCount,
        isParticipant: true,
        now,
        includeMeetingUrl: true,
      });
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

  const created = await db.transaction(async (tx) => {
    const [lesson] = await tx
      .insert(lessons)
      .values({
        teacherId: u.id,
        title: body.title,
        startsAt,
        endsAt,
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
