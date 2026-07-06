import {
  bookings,
  homework,
  leads,
  lessonCards,
  lessonMaterials,
  lessons,
  studentAccess,
  user as userTable,
} from "@gojo/db";
import { addLessonCardInput, setHomeworkStatusInput, setStudentLevelInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { type AuthContext, requireAuth, requireTeacher } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { materializeNewCardForBookings } from "../lib/materialize.ts";
import { putObject } from "../s3.ts";
import { toLessonCardDto, toLessonDto } from "./mappers.ts";

export const teacherRoute = new Hono<AuthContext>();

const createLessonInput = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
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

const postLessonInput = z.object({
  attendanceStatus: z
    .enum(["scheduled", "attended", "no_show", "cancelled_by_student", "cancelled_by_teacher"])
    .optional(),
  postLessonNote: z.string().max(2000).nullable().optional(),
  recommendation: z.string().max(1000).nullable().optional(),
});

teacherRoute.use("*", requireAuth, requireTeacher);

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
      email: r.lead.email,
      contact: r.lead.contact,
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

    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!lead) throw new HTTPException(404, { message: "lead not found" });

    const [lesson] = await db
      .insert(lessons)
      .values({
        teacherId: u.id,
        title: body.title,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
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
      await db
        .insert(bookings)
        .values({ lessonId: lesson.id, studentId: lead.userId })
        .onConflictDoNothing({ target: [bookings.lessonId, bookings.studentId] });
      await db
        .insert(studentAccess)
        .values({ userId: lead.userId, trialUsed: true, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: studentAccess.userId,
          set: { trialUsed: true, updatedAt: new Date() },
        });
    }

    return c.json(toLessonDto(lesson, null), 201);
  },
);

teacherRoute.get("/students", async (c) => {
  const u = c.get("user")!;

  const rows = await db
    .select({
      studentId: userTable.id,
      nickname: userTable.nickname,
      email: userTable.email,
      avatarUrl: userTable.image,
      jlptLevel: userTable.jlptLevel,
      quizLevel: userTable.quizLevel,
      lessonCount: sql<number>`COUNT(DISTINCT ${bookings.lessonId})`.as("lesson_count"),
      lastLessonAt: sql<Date>`MAX(${lessons.startsAt})`.as("last_lesson_at"),
    })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .innerJoin(userTable, eq(userTable.id, bookings.studentId))
    .where(teacherLessonScope(u))
    .groupBy(
      userTable.id,
      userTable.nickname,
      userTable.email,
      userTable.image,
      userTable.jlptLevel,
      userTable.quizLevel,
    )
    .orderBy(desc(sql`MAX(${lessons.startsAt})`));

  return c.json(
    rows.map((r) => ({
      studentId: r.studentId,
      nickname: r.nickname ?? null,
      email: r.email,
      avatarUrl: r.avatarUrl ?? null,
      jlptLevel: r.jlptLevel ?? null,
      quizLevel: r.quizLevel ?? null,
      lessonCount: Number(r.lessonCount),
      lastLessonAt: r.lastLessonAt ? new Date(r.lastLessonAt).toISOString() : null,
    })),
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

  const leadRows = await db
    .select()
    .from(leads)
    .where(eq(leads.userId, studentId))
    .orderBy(desc(leads.createdAt))
    .limit(10);

  return c.json({
    student: {
      id: student.id,
      nickname: student.nickname ?? student.name ?? null,
      email: student.email,
      avatarUrl: student.image ?? null,
      jlptLevel: student.jlptLevel ?? null,
      quizLevel: student.quizLevel ?? null,
      telegramId: student.telegramId ?? null,
      createdAt: student.createdAt.toISOString(),
    },
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
      email: l.email,
      contact: l.contact,
      level: l.level,
      goal: l.goal,
      notes: l.notes,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

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
      });
    }),
  );
});

teacherRoute.post("/lessons", zValidator("json", createLessonInput), async (c) => {
  const u = c.get("user")!;
  const body = c.req.valid("json");

  const [row] = await db
    .insert(lessons)
    .values({
      teacherId: u.id,
      title: body.title,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      metadata: body.metadata,
    })
    .returning();

  if (!row) throw new HTTPException(500, { message: "failed to create lesson" });
  return c.json(toLessonDto(row, null), 201);
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

  const [row] = await db.update(lessons).set(patch).where(eq(lessons.id, id)).returning();
  if (!row) throw new HTTPException(500, { message: "update failed" });
  return c.json(toLessonDto(row, null));
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

  await materializeNewCardForBookings(row.id);
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
