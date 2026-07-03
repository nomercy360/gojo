import { trainingTotals } from "@gojo/db";
import { type TrainingTotalsDto, trackTrainingInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";

export const trainingRoute = new Hono<AuthContext>();

trainingRoute.use("*", requireAuth);

trainingRoute.post("/track", zValidator("json", trackTrainingInput), async (c) => {
  const u = c.get("user")!;
  const { activity, seconds } = c.req.valid("json");

  if (activity === "review") {
    await db
      .insert(trainingTotals)
      .values({ userId: u.id, reviewSeconds: seconds, kanaSeconds: 0 })
      .onConflictDoUpdate({
        target: trainingTotals.userId,
        set: {
          reviewSeconds: sql`${trainingTotals.reviewSeconds} + ${seconds}`,
          updatedAt: new Date(),
        },
      });
  } else {
    await db
      .insert(trainingTotals)
      .values({ userId: u.id, reviewSeconds: 0, kanaSeconds: seconds })
      .onConflictDoUpdate({
        target: trainingTotals.userId,
        set: {
          kanaSeconds: sql`${trainingTotals.kanaSeconds} + ${seconds}`,
          updatedAt: new Date(),
        },
      });
  }

  return c.json({ ok: true });
});

trainingRoute.get("/me", async (c) => {
  const u = c.get("user")!;
  const [row] = await db
    .select()
    .from(trainingTotals)
    .where(eq(trainingTotals.userId, u.id))
    .limit(1);

  const response: TrainingTotalsDto = {
    reviewSeconds: row?.reviewSeconds ?? 0,
    kanaSeconds: row?.kanaSeconds ?? 0,
    totalSeconds: (row?.reviewSeconds ?? 0) + (row?.kanaSeconds ?? 0),
  };
  return c.json(response);
});
