import { funnelEvents } from "@gojo/db";
import { trackEventInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AuthContext } from "../auth/middleware.ts";
import { db } from "../db.ts";

// Public — funnel events fire from guest sessions (kana trainer, booking
// modal). loadSession has already run, so a logged-in user is attached when
// present. Event names are allow-listed in @gojo/shared; add rate limiting
// if it attracts spam.
export const eventsRoute = new Hono<AuthContext>();

eventsRoute.post("/", zValidator("json", trackEventInput), async (c) => {
  const { name, anonymousId, props } = c.req.valid("json");
  const user = c.get("user");
  await db.insert(funnelEvents).values({
    name,
    anonymousId,
    userId: user?.id ?? null,
    props: props ?? null,
  });
  return c.json({ ok: true }, 201);
});
