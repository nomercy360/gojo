import {
  bookings,
  homework,
  lessonMaterials,
  lessons,
  trainingTotals,
  user as userTable,
} from "@gojo/db";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import { AUTO_COMPLETE_AFTER_END_MS } from "../lib/lesson-state.ts";
import { sendEmail } from "../mailer.ts";
import { logNotification, sendTelegramMessage } from "../reminders.ts";
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

// The student's own upcoming schedule. Lessons are teacher-assigned (there is
// no self-serve booking), so this returns only lessons the viewer is booked on —
// never a public marketplace feed. Logged-out or non-student viewers get [].
lessonsRoute.get("/", async (c) => {
  const user = c.get("user");
  const now = new Date();
  await autoCompletePastLessons(now);
  if (!user || user.role !== "student") return c.json([]);

  const rows = await db
    .select({ lesson: lessons, teacherNickname: userTable.nickname })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .leftJoin(userTable, eq(userTable.id, lessons.teacherId))
    .where(
      and(
        eq(bookings.studentId, user.id),
        gte(lessons.endsAt, now),
        inArray(lessons.status, ["scheduled", "in_progress"]),
      ),
    )
    .orderBy(asc(lessons.startsAt))
    .limit(50);

  return c.json(
    rows.map((r) =>
      toLessonDto(r.lesson, r.teacherNickname, {
        booked: true,
        studentCount: 1,
        isParticipant: true,
        now,
        includeMeetingUrl: true,
      }),
    ),
  );
});

// A student's calendar is week-based and needs both past and upcoming booked
// lessons. Keep it separate from the public upcoming-lessons feed above.
lessonsRoute.get("/my-calendar", requireAuth, async (c) => {
  const user = c.get("user")!;
  const from = new Date(c.req.query("from") ?? "");
  const to = new Date(c.req.query("to") ?? "");

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    to <= from ||
    to.getTime() - from.getTime() > 8 * 24 * 60 * 60 * 1000
  ) {
    return c.json({ error: "invalid calendar range" }, 400);
  }

  const rows = await db
    .select({ lesson: lessons })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .where(
      and(
        eq(bookings.studentId, user.id),
        gte(lessons.startsAt, from),
        lt(lessons.startsAt, to),
        inArray(lessons.status, ["scheduled", "completed"]),
      ),
    )
    .orderBy(asc(lessons.startsAt));

  const now = new Date();
  return c.json(
    rows.map(({ lesson }) =>
      toLessonDto(lesson, null, {
        booked: true,
        isParticipant: true,
        now,
        includeMeetingUrl: true,
      }),
    ),
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

type LessonConfirmationRecipient = {
  bookingId?: string;
  userId?: string;
  email?: string | null;
  telegramId?: number | null;
};

function isDeliverableEmail(email: string | null | undefined): email is string {
  return Boolean(email && !email.toLowerCase().endsWith("@telegram.gojo"));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Notify every available channel when a teacher schedules a student. */
export async function sendLessonConfirmation(
  recipient: LessonConfirmationRecipient,
  title: string,
  startsAt: Date,
) {
  const [student] = recipient.userId
    ? await db
        .select({ email: userTable.email, telegramId: userTable.telegramId })
        .from(userTable)
        .where(eq(userTable.id, recipient.userId))
        .limit(1)
    : [];
  const email = recipient.email ?? student?.email;
  const telegramId = recipient.telegramId ?? student?.telegramId;
  const when = startsAt.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  let delivered = false;

  if (telegramId != null) {
    try {
      const sent = await sendTelegramMessage(
        telegramId,
        `✅ Ты записан на урок «${title}» — ${when}`,
        "lesson.booking_confirmation",
        recipient.userId,
      );
      delivered ||= sent;
      if (!sent) {
        await logNotification(
          "lesson.booking_confirmation",
          "telegram",
          String(telegramId),
          "skipped",
          recipient.userId,
          "telegram_not_configured",
        );
      }
    } catch (err) {
      console.error("lesson Telegram confirmation failed:", err);
    }
  } else if (recipient.userId) {
    await logNotification(
      "lesson.booking_confirmation",
      "telegram",
      recipient.userId,
      "skipped",
      recipient.userId,
      "telegram_id_missing",
    );
  }

  if (isDeliverableEmail(email)) {
    try {
      const safeTitle = escapeHtml(title);
      const subjectTitle = title.replace(/[\r\n]+/g, " ");
      await sendEmail(
        email,
        `Урок «${subjectTitle}» запланирован`,
        `<p>Ты записан на урок <strong>«${safeTitle}»</strong>.</p><p>Начало: <strong>${escapeHtml(when)}</strong>.</p><p><a href="${env.WEB_ORIGIN}/lessons">Открыть расписание</a></p>`,
      );
      await logNotification(
        "lesson.booking_confirmation",
        "email",
        email,
        "sent",
        recipient.userId,
      );
      delivered = true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await logNotification(
        "lesson.booking_confirmation",
        "email",
        email,
        "failed",
        recipient.userId,
        error,
      );
      console.error("lesson email confirmation failed:", err);
    }
  } else if (recipient.userId) {
    await logNotification(
      "lesson.booking_confirmation",
      "email",
      recipient.userId,
      "skipped",
      recipient.userId,
      "email_missing",
    );
  }

  if (delivered && recipient.bookingId) {
    try {
      await db
        .update(bookings)
        .set({ bookingConfirmedAt: new Date() })
        .where(eq(bookings.id, recipient.bookingId));
    } catch (err) {
      console.error(`failed to mark booking ${recipient.bookingId} as confirmed:`, err);
    }
  }
}
