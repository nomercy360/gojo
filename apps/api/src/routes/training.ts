import { trainingTotals } from "@gojo/db";
import { type TrainingTotalsDto, trackTrainingInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";

export const trainingRoute = new Hono<AuthContext>();

trainingRoute.use("*", requireAuth);

// Bumped on every /track call: +1 if the last active day was yesterday, reset
// to 1 on a gap or first-ever activity, unchanged if already counted today.
const streakUpdate = {
  currentStreak: sql`case
    when ${trainingTotals.lastActiveDate} = current_date then ${trainingTotals.currentStreak}
    when ${trainingTotals.lastActiveDate} = current_date - interval '1 day' then ${trainingTotals.currentStreak} + 1
    else 1
  end`,
  lastActiveDate: sql`current_date`,
};

trainingRoute.post("/track", zValidator("json", trackTrainingInput), async (c) => {
  const u = c.get("user")!;
  const { activity, seconds } = c.req.valid("json");

  const zero = { reviewSeconds: 0, kanaSeconds: 0, kanjiSeconds: 0 };
  const streakInsert = { currentStreak: 1, lastActiveDate: sql`current_date` };
  if (activity === "review") {
    await db
      .insert(trainingTotals)
      .values({ userId: u.id, ...zero, reviewSeconds: seconds, ...streakInsert })
      .onConflictDoUpdate({
        target: trainingTotals.userId,
        set: {
          reviewSeconds: sql`${trainingTotals.reviewSeconds} + ${seconds}`,
          updatedAt: new Date(),
          ...streakUpdate,
        },
      });
  } else if (activity === "kana") {
    await db
      .insert(trainingTotals)
      .values({ userId: u.id, ...zero, kanaSeconds: seconds, ...streakInsert })
      .onConflictDoUpdate({
        target: trainingTotals.userId,
        set: {
          kanaSeconds: sql`${trainingTotals.kanaSeconds} + ${seconds}`,
          updatedAt: new Date(),
          ...streakUpdate,
        },
      });
  } else {
    await db
      .insert(trainingTotals)
      .values({ userId: u.id, ...zero, kanjiSeconds: seconds, ...streakInsert })
      .onConflictDoUpdate({
        target: trainingTotals.userId,
        set: {
          kanjiSeconds: sql`${trainingTotals.kanjiSeconds} + ${seconds}`,
          updatedAt: new Date(),
          ...streakUpdate,
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
    kanjiSeconds: row?.kanjiSeconds ?? 0,
    totalSeconds: (row?.reviewSeconds ?? 0) + (row?.kanaSeconds ?? 0) + (row?.kanjiSeconds ?? 0),
  };
  return c.json(response);
});
