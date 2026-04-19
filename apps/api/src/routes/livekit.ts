import { bookings, lessons } from "@gojo/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AccessToken } from "livekit-server-sdk";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import { JOIN_WINDOW_MS, joinOpensAt } from "../lib/lesson-state.ts";

export const livekitRoute = new Hono<AuthContext>();

livekitRoute.post("/token/:lessonId", requireAuth, async (c) => {
  const user = c.get("user")!;
  const lessonId = c.req.param("lessonId");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });

  const isTeacher = lesson.teacherId === user.id;

  if (!isTeacher) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.lessonId, lessonId), eq(bookings.studentId, user.id)))
      .limit(1);
    if (!booking) throw new HTTPException(403, { message: "not enrolled in this lesson" });
  }

  const now = new Date();
  if (lesson.status === "cancelled") {
    throw new HTTPException(403, { message: "lesson cancelled" });
  }
  if (now.getTime() >= lesson.endsAt.getTime()) {
    throw new HTTPException(403, { message: "lesson ended" });
  }
  if (!isTeacher) {
    const opensAt = joinOpensAt(lesson);
    if (now.getTime() < opensAt.getTime()) {
      return c.json(
        {
          error: "join_too_early",
          message: `Войти можно за ${JOIN_WINDOW_MS / 60_000} минут до начала`,
          startsAt: lesson.startsAt.toISOString(),
          joinOpensAt: opensAt.toISOString(),
        },
        403,
      );
    }
  }

  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: user.id,
    name: user.nickname ?? user.email,
    ttl: 60 * 60,
  });
  token.addGrant({
    room: `lesson-${lesson.id}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isTeacher,
  });

  return c.json({
    token: await token.toJwt(),
    url: env.LIVEKIT_URL,
    room: `lesson-${lesson.id}`,
  });
});
