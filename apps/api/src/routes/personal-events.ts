import { personalEvents } from "@gojo/db";
import { type PersonalEventDto, createPersonalEventInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, gte } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";

export const personalEventsRoute = new Hono<AuthContext>();

personalEventsRoute.use("*", requireAuth);

function toDto(e: typeof personalEvents.$inferSelect): PersonalEventDto {
  return {
    id: e.id,
    title: e.title,
    startsAt: e.startsAt.toISOString(),
    durationMinutes: e.durationMinutes,
  };
}

// Upcoming personal events only — this feeds the LK schedule, not a full history.
personalEventsRoute.get("/", async (c) => {
  const u = c.get("user")!;
  const rows = await db
    .select()
    .from(personalEvents)
    .where(and(eq(personalEvents.userId, u.id), gte(personalEvents.startsAt, new Date())))
    .orderBy(asc(personalEvents.startsAt))
    .limit(50);
  return c.json(rows.map(toDto));
});

personalEventsRoute.post("/", zValidator("json", createPersonalEventInput), async (c) => {
  const u = c.get("user")!;
  const { title, startsAt, durationMinutes } = c.req.valid("json");
  const [row] = await db
    .insert(personalEvents)
    .values({ userId: u.id, title, startsAt: new Date(startsAt), durationMinutes })
    .returning();
  return c.json(toDto(row!), 201);
});

personalEventsRoute.delete("/:id", async (c) => {
  const u = c.get("user")!;
  const id = c.req.param("id");
  const [deleted] = await db
    .delete(personalEvents)
    .where(and(eq(personalEvents.id, id), eq(personalEvents.userId, u.id)))
    .returning({ id: personalEvents.id });
  if (!deleted) throw new HTTPException(404, { message: "not found" });
  return c.json({ ok: true });
});
