import {
  bookings,
  homework,
  leads,
  lessons,
  notificationLogs,
  payments,
  user as userTable,
} from "@gojo/db";
import { createStudentInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { auth } from "../auth.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";

export const adminRoute = new Hono<AuthContext>();

adminRoute.use("*", requireAuth);

adminRoute.get("/summary", async (c) => {
  const user = c.get("user")!;
  if (user.role !== "admin") throw new HTTPException(403, { message: "admin access required" });

  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60_000);

  const leadPipeline = await db
    .select({ status: leads.status, count: sql<number>`COUNT(*)`.as("count") })
    .from(leads)
    .groupBy(leads.status);

  const [revenue] = await db
    .select({
      value: sql<string>`COALESCE(SUM(CAST(${payments.amountValue} AS numeric)), 0)`.as("value"),
    })
    .from(payments)
    .where(eq(payments.status, "succeeded"));

  const [activeStudents] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${bookings.studentId})`.as("count") })
    .from(bookings);

  const [upcomingLessons] = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(lessons)
    .where(and(eq(lessons.status, "scheduled"), gte(lessons.startsAt, now)));

  const retentionRows = await db
    .select({
      studentId: userTable.id,
      email: userTable.email,
      nickname: userTable.nickname,
      lastLessonAt: sql<Date>`MAX(${lessons.startsAt})`.as("last_lesson_at"),
      missedHomework:
        sql<number>`SUM(CASE WHEN ${homework.status} = 'missed' THEN 1 ELSE 0 END)`.as(
          "missed_homework",
        ),
      noShows:
        sql<number>`SUM(CASE WHEN ${bookings.attendanceStatus} = 'no_show' THEN 1 ELSE 0 END)`.as(
          "no_shows",
        ),
    })
    .from(userTable)
    .leftJoin(bookings, eq(bookings.studentId, userTable.id))
    .leftJoin(lessons, eq(lessons.id, bookings.lessonId))
    .leftJoin(
      homework,
      and(eq(homework.studentId, userTable.id), eq(homework.lessonId, lessons.id)),
    )
    .where(eq(userTable.role, "student"))
    .groupBy(userTable.id, userTable.email, userTable.nickname)
    .orderBy(desc(sql`MAX(${lessons.startsAt})`))
    .limit(50);

  const teacherWorkload = await db
    .select({
      teacherId: userTable.id,
      email: userTable.email,
      nickname: userTable.nickname,
      lessonCount: sql<number>`COUNT(DISTINCT ${lessons.id})`.as("lesson_count"),
      attendedCount:
        sql<number>`SUM(CASE WHEN ${bookings.attendanceStatus} = 'attended' THEN 1 ELSE 0 END)`.as(
          "attended_count",
        ),
      minutes:
        sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${lessons.endsAt} - ${lessons.startsAt})) / 60), 0)`.as(
          "minutes",
        ),
    })
    .from(userTable)
    .leftJoin(lessons, eq(lessons.teacherId, userTable.id))
    .leftJoin(bookings, eq(bookings.lessonId, lessons.id))
    .where(eq(userTable.role, "teacher"))
    .groupBy(userTable.id, userTable.email, userTable.nickname)
    .orderBy(desc(sql`COUNT(DISTINCT ${lessons.id})`));

  const recentNotifications = await db
    .select()
    .from(notificationLogs)
    .orderBy(desc(notificationLogs.createdAt))
    .limit(20);

  return c.json({
    leadPipeline: leadPipeline.map((r) => ({ status: r.status, count: Number(r.count) })),
    revenueRub: Number(revenue?.value ?? 0),
    activeStudents: Number(activeStudents?.count ?? 0),
    upcomingLessons: Number(upcomingLessons?.count ?? 0),
    retentionRisks: retentionRows
      .map((r) => {
        const reasons = [];
        if (!r.lastLessonAt || new Date(r.lastLessonAt).getTime() < staleCutoff.getTime()) {
          reasons.push("inactive_14d");
        }
        if (Number(r.missedHomework ?? 0) > 0) reasons.push("missed_homework");
        if (Number(r.noShows ?? 0) > 0) reasons.push("no_show");
        return {
          studentId: r.studentId,
          email: r.email,
          nickname: r.nickname,
          lastLessonAt: r.lastLessonAt ? new Date(r.lastLessonAt).toISOString() : null,
          reasons,
        };
      })
      .filter((r) => r.reasons.length > 0),
    teacherWorkload: teacherWorkload.map((r) => ({
      teacherId: r.teacherId,
      email: r.email,
      nickname: r.nickname,
      lessonCount: Number(r.lessonCount),
      attendedCount: Number(r.attendedCount ?? 0),
      hours: Math.round((Number(r.minutes ?? 0) / 60) * 10) / 10,
    })),
    recentNotifications: recentNotifications.map((n) => ({
      id: n.id,
      event: n.event,
      channel: n.channel,
      recipient: n.recipient,
      status: n.status,
      error: n.error,
      createdAt: n.createdAt.toISOString(),
    })),
  });
});

// Accounts are admin-provisioned only (no public self-signup) — this is the
// one path that creates a student login. The admin never sets or sees a
// password: signUpEmail gets a throwaway random one, then
// requestPasswordReset immediately emails an activation link through the
// same mechanism a normal "forgot password" uses (see auth.ts
// sendResetPassword, which branches its copy on emailVerified).
adminRoute.post("/students", zValidator("json", createStudentInput), async (c) => {
  const admin = c.get("user")!;
  if (admin.role !== "admin") throw new HTTPException(403, { message: "admin access required" });

  const { email, name, nickname } = c.req.valid("json");
  const throwawayPassword = crypto.randomUUID() + crypto.randomUUID();

  const created = await auth.api.signUpEmail({
    body: {
      email,
      password: throwawayPassword,
      name,
      // biome-ignore lint/suspicious/noExplicitAny: additional fields beyond the base schema
      ...({ nickname, role: "student" } as any),
    },
  });

  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: `${env.WEB_ORIGIN}/reset-password`,
    },
  });

  return c.json({ ok: true, userId: created.user.id }, 201);
});
