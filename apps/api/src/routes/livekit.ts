import { bookings, lessons, users } from "@gojo/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AccessToken } from "livekit-server-sdk";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";

export const livekitRoute = new Hono<AuthContext>();

/**
 * Issues a short-lived LiveKit access token for a lesson room.
 * Authorization: the caller must be the teacher OR have a booking for the lesson.
 */
livekitRoute.post("/token/:lessonId", requireAuth, async (c) => {
  const auth = c.get("auth");
  const lessonId = c.req.param("lessonId");

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HTTPException(404, { message: "lesson not found" });

  const isTeacher = lesson.teacherId === auth.sub;

  if (!isTeacher) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.lessonId, lessonId), eq(bookings.studentId, auth.sub)))
      .limit(1);
    if (!booking) throw new HTTPException(403, { message: "not enrolled in this lesson" });
  }

  const [user] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  if (!user) throw new HTTPException(404, { message: "user not found" });

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
