import { bookings, lessonMaterials, lessons, users } from "@gojo/db";
import { and, asc, count, eq, gte, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifySession } from "../auth/jwt.ts";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { toLessonDto } from "./mappers.ts";

export const lessonsRoute = new Hono<AuthContext>();

lessonsRoute.get("/", async (c) => {
  // Optional auth: if Bearer is present, include booking status per lesson
  let userId: string | null = null;
  const header = c.req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = await verifySession(header.slice(7));
      userId = payload.sub;
    } catch {
      // anonymous — fine
    }
  }

  const rows = await db
    .select({
      lesson: lessons,
      teacherNickname: users.nickname,
      studentCount:
        sql<number>`(SELECT COUNT(*) FROM ${bookings} WHERE ${bookings.lessonId} = ${lessons.id})`.as(
          "student_count",
        ),
    })
    .from(lessons)
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .where(and(gte(lessons.startsAt, new Date()), eq(lessons.status, "scheduled")))
    .orderBy(asc(lessons.startsAt))
    .limit(50);

  let bookedSet = new Set<string>();
  if (userId && rows.length > 0) {
    const lessonIds = rows.map((r) => r.lesson.id);
    const userBookings = await db
      .select({ lessonId: bookings.lessonId })
      .from(bookings)
      .where(and(eq(bookings.studentId, userId), inArray(bookings.lessonId, lessonIds)));
    bookedSet = new Set(userBookings.map((b) => b.lessonId));
  }

  return c.json(
    rows.map((r) =>
      toLessonDto(r.lesson, r.teacherNickname, {
        booked: userId ? bookedSet.has(r.lesson.id) : undefined,
        studentCount: Number(r.studentCount),
      }),
    ),
  );
});

lessonsRoute.get("/my-stats", requireAuth, async (c) => {
  const auth = c.get("auth");
  const now = new Date();

  const [completed] = await db
    .select({ value: count() })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .where(
      and(
        eq(bookings.studentId, auth.sub),
        eq(lessons.status, "completed"),
      ),
    );

  const [upcoming] = await db
    .select({ value: count() })
    .from(bookings)
    .innerJoin(lessons, eq(lessons.id, bookings.lessonId))
    .where(
      and(
        eq(bookings.studentId, auth.sub),
        eq(lessons.status, "scheduled"),
        gte(lessons.startsAt, now),
      ),
    );

  const [total] = await db
    .select({ value: count() })
    .from(bookings)
    .where(eq(bookings.studentId, auth.sub));

  return c.json({
    completedLessons: completed?.value ?? 0,
    upcomingLessons: upcoming?.value ?? 0,
    totalBookings: total?.value ?? 0,
  });
});

lessonsRoute.get("/:id/materials", async (c) => {
  const id = c.req.param("id");
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
  const [row] = await db
    .select({ lesson: lessons, teacherNickname: users.nickname })
    .from(lessons)
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .where(eq(lessons.id, id))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: "lesson not found" });
  return c.json(toLessonDto(row.lesson, row.teacherNickname));
});

lessonsRoute.post("/:id/book", requireAuth, async (c) => {
  const auth = c.get("auth");
  const lessonId = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (lesson.status !== "scheduled") {
    throw new HTTPException(400, { message: "lesson is not bookable" });
  }

  const [booking] = await db
    .insert(bookings)
    .values({ lessonId, studentId: auth.sub })
    .onConflictDoNothing({ target: [bookings.lessonId, bookings.studentId] })
    .returning();

  if (booking) return c.json(booking, 201);

  const [existing] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.lessonId, lessonId), eq(bookings.studentId, auth.sub)))
    .limit(1);
  return c.json(existing, 200);
});
