import { bookings, lessons } from "@gojo/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  AccessToken,
  EgressClient,
  EgressStatus,
  EncodedFileOutput,
  S3Upload,
  WebhookReceiver,
} from "livekit-server-sdk";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import { JOIN_WINDOW_MS, joinOpensAt } from "../lib/lesson-state.ts";

export const livekitRoute = new Hono<AuthContext>();

/**
 * LiveKit's WebSocket URL (`ws://host:7880`) → HTTP equivalent, used by the
 * server-sdk egress client to hit LK's REST API.
 */
function httpEndpoint(wsUrl: string): string {
  if (wsUrl.startsWith("wss://")) return "https://" + wsUrl.slice(6);
  if (wsUrl.startsWith("ws://")) return "http://" + wsUrl.slice(5);
  return wsUrl;
}

const egressClient = new EgressClient(
  httpEndpoint(env.LIVEKIT_URL),
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET,
);
const webhookReceiver = new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

/**
 * Start a RoomComposite egress for the lesson if nothing is recording yet.
 * Idempotent via listEgress. Output goes to the S3-compatible bucket in env.
 * Failures are logged but do NOT block the join token — recording is opt-in,
 * not a gate.
 */
async function ensureRoomRecording(lessonId: string): Promise<void> {
  if (!env.RECORDING_ENABLED) return;
  const room = `lesson-${lessonId}`;
  try {
    const active = await egressClient.listEgress({ roomName: room });
    const alreadyRunning = active.some(
      (e) =>
        e.status === EgressStatus.EGRESS_STARTING ||
        e.status === EgressStatus.EGRESS_ACTIVE,
    );
    if (alreadyRunning) return;

    const filepath = `recordings/${lessonId}/${Date.now()}.mp4`;
    const output = new EncodedFileOutput({
      filepath,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey: env.S3_ACCESS_KEY,
          secret: env.S3_SECRET_KEY,
          bucket: env.S3_BUCKET,
          endpoint: env.S3_INTERNAL_ENDPOINT ?? env.S3_ENDPOINT,
          region: env.S3_REGION,
          forcePathStyle: true,
        }),
      },
    });
    await egressClient.startRoomCompositeEgress(room, { file: output });
    console.log(`[recording] started egress for ${room} → ${filepath}`);
  } catch (err) {
    console.error(`[recording] failed to start egress for ${room}:`, err);
  }
}

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

  // Fire-and-forget — do not delay the token response.
  void ensureRoomRecording(lesson.id);

  return c.json({
    token: await token.toJwt(),
    url: env.LIVEKIT_URL,
    room: `lesson-${lesson.id}`,
  });
});

/**
 * LiveKit webhook receiver. Called by the LK server on room/egress events.
 *
 * We care about `egress_ended` — that's when the composite mp4 is finalised
 * and uploaded to S3. We parse the lesson id out of the room name
 * (`lesson-{uuid}`) and write the public URL back onto the lesson row so the
 * detail page's `<video>` finds it.
 */
livekitRoute.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const auth = c.req.header("authorization") ?? "";
  let event: Awaited<ReturnType<WebhookReceiver["receive"]>>;
  try {
    event = await webhookReceiver.receive(rawBody, auth);
  } catch (err) {
    console.error("[webhook] verify failed:", err);
    return c.text("unauthorized", 401);
  }

  if (event.event === "egress_ended" && event.egressInfo) {
    const info = event.egressInfo;
    const roomName = info.roomName;
    if (roomName?.startsWith("lesson-")) {
      const lessonId = roomName.slice("lesson-".length);
      const file = info.fileResults?.[0];
      if (file?.filename) {
        const publicUrl = file.location?.startsWith("http")
          ? file.location
          : `${env.S3_PUBLIC_URL}/${env.S3_BUCKET}/${file.filename}`;
        await db
          .update(lessons)
          .set({ recordingUrl: publicUrl, updatedAt: new Date() })
          .where(eq(lessons.id, lessonId));
        console.log(`[recording] lesson ${lessonId} → ${publicUrl}`);
      }
    }
  }

  return c.json({ ok: true });
});
