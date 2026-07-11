import {
  bookings,
  homework,
  lessonMaterials,
  lessons,
  studentAccess,
  trainingTotals,
  user as userTable,
} from "@gojo/db";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { AUTO_COMPLETE_AFTER_END_MS } from "../lib/lesson-state.ts";
import { sendTelegramMessage } from "../reminders.ts";
import { toLessonDto } from "./mappers.ts";

/**
 * Lazy self-heal: any scheduled lesson whose endsAt was more than 15 min ago
 * gets flipped to "completed". Called from read paths so we don't need a cron.
 * Cheap because the WHERE clause is covered by status + endsAt.
 */
async function autoCompletePastLessons(now: Date) {
  const cutoff = new Date(now.getTime() - AUTO_COMPLETE_AFTER_END_MS);
  await db
    .update(lessons)
    .set({ status: "completed", updatedAt: now })
    .where(and(eq(lessons.status, "scheduled"), lt(lessons.endsAt, cutoff)));
}

export const lessonsRoute = new Hono<AuthContext>();

/**
 * True if the user may see a lesson's private content (recording, materials):
 * either an admin, the teacher who owns it, or a student booked on it.
 */
async function hasLessonContentAccess(
  user: NonNullable<AuthContext["Variables"]["user"]>,
  lesson: typeof lessons.$inferSelect,
): Promise<boolean> {
  if (user.role === "admin" || lesson.teacherId === user.id) return true;
  const [b] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.lessonId, lesson.id), eq(bookings.studentId, user.id)))
    .limit(1);
  return !!b;
}

lessonsRoute.get("/", async (c) => {
  const user = c.get("user");
  const now = new Date();
  await autoCompletePastLessons(now);

  const rows = await db
    .select({
      lesson: lessons,
      teacherNickname: userTable.nickname,
      studentCount:
        sql<number>`(SELECT COUNT(*) FROM ${bookings} WHERE ${bookings.lessonId} = ${lessons.id})`.as(
          "student_count",
        ),
    })
    .from(lessons)
    .leftJoin(userTable, eq(userTable.id, lessons.teacherId))
    .where(and(gte(lessons.endsAt, now), eq(lessons.status, "scheduled")))
    .orderBy(asc(lessons.startsAt))
    .limit(50);

  let bookedSet = new Set<string>();
  if (user && rows.length > 0) {
    const lessonIds = rows.map((r) => r.lesson.id);
    const userBookings = await db
      .select({ lessonId: bookings.lessonId })
      .from(bookings)
      .where(and(eq(bookings.studentId, user.id), inArray(bookings.lessonId, lessonIds)));
    bookedSet = new Set(userBookings.map((b) => b.lessonId));
  }

  return c.json(
    rows.map((r) => {
      const studentCount = Number(r.studentCount);
      const booked = user ? bookedSet.has(r.lesson.id) : false;
      const isOwner = !!user && user.id === r.lesson.teacherId;
      return toLessonDto(r.lesson, r.teacherNickname, {
        booked: user ? booked : undefined,
        studentCount,
        isParticipant: booked || isOwner,
        now,
        includeMeetingUrl: booked || isOwner,
      });
    }),
  );
});

lessonsRoute.get("/my-stats", requireAuth, async (c) => {
  const user = c.get("user")!;
  const now = new Date();

  const [completed] = await db
    .select({ value: count() })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .where(and(eq(bookings.studentId, user.id), eq(lessons.status, "completed")));

  const [upcoming] = await db
    .select({ value: count() })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .where(
      and(
        eq(bookings.studentId, user.id),
        eq(lessons.status, "scheduled"),
        gte(lessons.startsAt, now),
      ),
    );

  const [total] = await db
    .select({ value: count() })
    .from(bookings)
    .where(eq(bookings.studentId, user.id));

  const [homeworkCounts] = await db
    .select({
      done: sql<number>`SUM(CASE WHEN ${homework.status} = 'done' THEN 1 ELSE 0 END)`.as("done"),
      marked:
        sql<number>`SUM(CASE WHEN ${homework.status} IN ('done', 'missed') THEN 1 ELSE 0 END)`.as(
          "marked",
        ),
    })
    .from(homework)
    .where(eq(homework.studentId, user.id));

  const [training] = await db
    .select()
    .from(trainingTotals)
    .where(eq(trainingTotals.userId, user.id))
    .limit(1);

  return c.json({
    completedLessons: completed?.value ?? 0,
    upcomingLessons: upcoming?.value ?? 0,
    totalBookings: total?.value ?? 0,
    homeworkDone: Number(homeworkCounts?.done ?? 0),
    homeworkTotal: Number(homeworkCounts?.marked ?? 0),
    trainingSeconds:
      (training?.reviewSeconds ?? 0) + (training?.kanaSeconds ?? 0) + (training?.kanjiSeconds ?? 0),
    currentStreak: training?.currentStreak ?? 0,
  });
});

lessonsRoute.get("/my-recordings", requireAuth, async (c) => {
  const user = c.get("user")!;

  const rows = await db
    .select({ lesson: lessons })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .where(and(eq(bookings.studentId, user.id), isNotNull(lessons.recordingUrl)))
    .orderBy(desc(lessons.startsAt));

  return c.json(
    rows.map((r) => ({
      lessonId: r.lesson.id,
      title: r.lesson.title,
      startsAt: r.lesson.startsAt.toISOString(),
      recordingUrl: r.lesson.recordingUrl,
    })),
  );
});

lessonsRoute.get("/:id/materials", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (!(await hasLessonContentAccess(user, lesson))) {
    throw new HTTPException(403, { message: "no access to this lesson" });
  }

  const rows = await db
    .select()
    .from(lessonMaterials)
    .where(eq(lessonMaterials.lessonId, id))
    .orderBy(asc(lessonMaterials.createdAt));

  return c.json(
    rows.map((m) => ({
      id: m.id,
      lessonId: m.lessonId,
      title: m.title,
      fileUrl: m.fileUrl,
      fileType: m.fileType,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

lessonsRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const now = new Date();
  await autoCompletePastLessons(now);

  const [row] = await db
    .select({
      lesson: lessons,
      teacherNickname: userTable.nickname,
      studentCount:
        sql<number>`(SELECT COUNT(*) FROM ${bookings} WHERE ${bookings.lessonId} = ${lessons.id})`.as(
          "student_count",
        ),
    })
    .from(lessons)
    .leftJoin(userTable, eq(userTable.id, lessons.teacherId))
    .where(eq(lessons.id, id))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: "lesson not found" });

  let booked = false;
  if (user) {
    const [b] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.lessonId, id), eq(bookings.studentId, user.id)))
      .limit(1);
    booked = !!b;
  }
  const isOwner = !!user && user.id === row.lesson.teacherId;
  const isAdmin = user?.role === "admin";
  const studentCount = Number(row.studentCount);
  return c.json(
    toLessonDto(row.lesson, row.teacherNickname, {
      booked: user ? booked : undefined,
      studentCount,
      isParticipant: booked || isOwner,
      now,
      includeRecording: booked || isOwner || isAdmin,
      includeMeetingUrl: booked || isOwner || isAdmin,
    }),
  );
});

lessonsRoute.post("/:id/book", requireAuth, async (c) => {
  const user = c.get("user")!;
  if (user.role !== "student") {
    throw new HTTPException(403, { message: "only students can book lessons" });
  }
  const lessonId = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (lesson.status !== "scheduled") {
    throw new HTTPException(400, { message: "lesson is not bookable" });
  }

  const [existing] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.lessonId, lessonId), eq(bookings.studentId, user.id)))
    .limit(1);
  if (existing) return c.json(existing, 200);

  const accessUse = await resolveBookingAccess(user.id);
  if (!accessUse.allowed) {
    throw new HTTPException(402, { message: "payment required" });
  }

  const [booking] = await db
    .insert(bookings)
    .values({ lessonId, studentId: user.id })
    .onConflictDoNothing({ target: [bookings.lessonId, bookings.studentId] })
    .returning();
  if (!booking) throw new HTTPException(500, { message: "booking failed" });

  await consumeBookingAccess(user.id, accessUse.mode);
  await sendBookingConfirmation(booking.id, user.id, lesson.title, lesson.startsAt);

  return c.json(booking, 201);
});

type BookingAccessUse =
  | { allowed: true; mode: "subscription" | "credit" | "trial" }
  | { allowed: false };

async function resolveBookingAccess(userId: string): Promise<BookingAccessUse> {
  const [access] = await db
    .select()
    .from(studentAccess)
    .where(eq(studentAccess.userId, userId))
    .limit(1);
  const now = Date.now();
  if (access?.activeUntil && access.activeUntil.getTime() > now) {
    return { allowed: true, mode: "subscription" };
  }
  if ((access?.lessonCredits ?? 0) > 0) {
    return { allowed: true, mode: "credit" };
  }
  if (!access?.trialUsed) {
    return { allowed: true, mode: "trial" };
  }
  return { allowed: false };
}

async function sendBookingConfirmation(
  bookingId: string,
  userId: string,
  title: string,
  startsAt: Date,
) {
  const [student] = await db
    .select({ telegramId: userTable.telegramId })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (student?.telegramId == null) return;
  try {
    const when = startsAt.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    await sendTelegramMessage(
      student.telegramId,
      `✅ Ты записан на урок «${title}» — ${when}`,
      "lesson.booking_confirmation",
      userId,
    );
    await db
      .update(bookings)
      .set({ bookingConfirmedAt: new Date() })
      .where(eq(bookings.id, bookingId));
  } catch (err) {
    console.error(`booking confirmation failed for ${bookingId}:`, err);
  }
}

async function consumeBookingAccess(userId: string, mode: "subscription" | "credit" | "trial") {
  const now = new Date();
  if (mode === "subscription") return;
  const [access] = await db
    .select()
    .from(studentAccess)
    .where(eq(studentAccess.userId, userId))
    .limit(1);
  if (mode === "credit") {
    await db
      .update(studentAccess)
      .set({ lessonCredits: Math.max((access?.lessonCredits ?? 0) - 1, 0), updatedAt: now })
      .where(eq(studentAccess.userId, userId));
    return;
  }
  await db
    .insert(studentAccess)
    .values({ userId, trialUsed: true, updatedAt: now })
    .onConflictDoUpdate({
      target: studentAccess.userId,
      set: { trialUsed: true, updatedAt: now },
    });
}
