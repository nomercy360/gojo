import { bookings, lessonMaterials, lessons, users } from "@gojo/db";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { putObject } from "../s3.ts";
import { toLessonDto } from "./mappers.ts";

export const teacherRoute = new Hono<AuthContext>();

const requireTeacher = async (c: { get: (key: "auth") => { sub: string; role: string } }) => {
  const auth = c.get("auth");
  if (auth.role !== "teacher" && auth.role !== "admin") {
    throw new HTTPException(403, { message: "teacher access required" });
  }
  return auth;
};

const createLessonInput = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  metadata: z
    .object({
      topic: z.string().optional(),
      level: z.string().optional(),
    })
    .optional(),
});

const updateLessonInput = z.object({
  title: z.string().min(1).max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
});

teacherRoute.use("*", requireAuth);

teacherRoute.get("/lessons", async (c) => {
  const auth = await requireTeacher(c);

  const rows = await db
    .select({
      lesson: lessons,
      studentCount: sql<number>`(SELECT COUNT(*) FROM ${bookings} WHERE ${bookings.lessonId} = ${lessons.id})`.as("student_count"),
    })
    .from(lessons)
    .where(and(eq(lessons.teacherId, auth.sub), eq(lessons.deletedAt, sql`NULL`).if(false)))
    .orderBy(desc(lessons.startsAt))
    .limit(100);

  return c.json(
    rows.map((r) => ({
      ...toLessonDto(r.lesson, null, { studentCount: Number(r.studentCount) }),
    })),
  );
});

teacherRoute.post("/lessons", zValidator("json", createLessonInput), async (c) => {
  const auth = await requireTeacher(c);
  const body = c.req.valid("json");

  const [row] = await db
    .insert(lessons)
    .values({
      teacherId: auth.sub,
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
  const auth = await requireTeacher(c);
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [existing] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "lesson not found" });
  if (existing.teacherId !== auth.sub) {
    throw new HTTPException(403, { message: "not your lesson" });
  }

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
  const auth = await requireTeacher(c);
  const id = c.req.param("id");

  const [existing] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!existing) throw new HTTPException(404, { message: "lesson not found" });
  if (existing.teacherId !== auth.sub) {
    throw new HTTPException(403, { message: "not your lesson" });
  }

  await db
    .update(lessons)
    .set({ deletedAt: new Date(), status: "cancelled" })
    .where(eq(lessons.id, id));
  return c.json({ ok: true });
});

teacherRoute.get("/lessons/:id/students", async (c) => {
  const auth = await requireTeacher(c);
  const id = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (lesson.teacherId !== auth.sub) {
    throw new HTTPException(403, { message: "not your lesson" });
  }

  const rows = await db
    .select({
      bookingId: bookings.id,
      studentId: users.id,
      nickname: users.nickname,
      email: users.email,
      avatarUrl: users.avatarUrl,
      bookedAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.studentId))
    .where(eq(bookings.lessonId, id));

  return c.json(rows);
});

const MAX_MATERIAL_SIZE = 10 * 1024 * 1024;

teacherRoute.post("/lessons/:id/materials", async (c) => {
  const auth = await requireTeacher(c);
  const lessonId = c.req.param("id");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });
  if (lesson.teacherId !== auth.sub) {
    throw new HTTPException(403, { message: "not your lesson" });
  }

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
      uploadedBy: auth.sub,
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
