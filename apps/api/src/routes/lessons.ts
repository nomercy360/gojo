import { bookings, lessons, users } from "@gojo/db";
import { and, asc, eq, gte } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { toLessonDto } from "./mappers.ts";

export const lessonsRoute = new Hono<AuthContext>();

lessonsRoute.get("/", async (c) => {
  const rows = await db
    .select({
      lesson: lessons,
      teacherNickname: users.nickname,
    })
    .from(lessons)
    .leftJoin(users, eq(users.id, lessons.teacherId))
    .where(and(gte(lessons.startsAt, new Date()), eq(lessons.status, "scheduled")))
    .orderBy(asc(lessons.startsAt))
    .limit(50);

  return c.json(rows.map((r) => toLessonDto(r.lesson, r.teacherNickname)));
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
