import { bookings, homeworkSubmissions } from "@gojo/db";
import { submitHomeworkInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { queueAiReview } from "../lib/homework-review.ts";
import { toSubmissionDto } from "./mappers.ts";

export const homeworkRoute = new Hono<AuthContext>();

homeworkRoute.use("*", requireAuth);

async function requireBooking(lessonId: string, studentId: string) {
  const [booking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.lessonId, lessonId), eq(bookings.studentId, studentId)))
    .limit(1);
  if (!booking) throw new HTTPException(403, { message: "not booked on this lesson" });
}

// Own submission history for a lesson, newest first.
homeworkRoute.get("/lessons/:lessonId", async (c) => {
  const user = c.get("user")!;
  const lessonId = c.req.param("lessonId");
  await requireBooking(lessonId, user.id);

  const rows = await db
    .select()
    .from(homeworkSubmissions)
    .where(
      and(eq(homeworkSubmissions.lessonId, lessonId), eq(homeworkSubmissions.studentId, user.id)),
    )
    .orderBy(desc(homeworkSubmissions.createdAt));

  return c.json(rows.map(toSubmissionDto));
});

homeworkRoute.post("/lessons/:lessonId", zValidator("json", submitHomeworkInput), async (c) => {
  const user = c.get("user")!;
  const lessonId = c.req.param("lessonId");
  const { content } = c.req.valid("json");
  await requireBooking(lessonId, user.id);

  // One live attempt at a time: while the latest submission awaits the
  // teacher, a resubmit would only bury it in the review queue.
  const [latest] = await db
    .select({ status: homeworkSubmissions.status })
    .from(homeworkSubmissions)
    .where(
      and(eq(homeworkSubmissions.lessonId, lessonId), eq(homeworkSubmissions.studentId, user.id)),
    )
    .orderBy(desc(homeworkSubmissions.createdAt))
    .limit(1);
  if (latest && (latest.status === "submitted" || latest.status === "ai_reviewed")) {
    throw new HTTPException(409, { message: "previous submission is still being reviewed" });
  }
  if (latest && latest.status === "approved") {
    throw new HTTPException(409, { message: "homework already approved" });
  }

  const [row] = await db
    .insert(homeworkSubmissions)
    .values({ lessonId, studentId: user.id, content })
    .returning();
  if (!row) throw new HTTPException(500, { message: "insert failed" });

  queueAiReview(row.id);

  return c.json(toSubmissionDto(row), 201);
});
