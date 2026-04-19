import { flashcards } from "@gojo/db";
import { type ReviewQueueDto, submitReviewInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { MAX_STAGE, UNLEARNED_STAGE, promoteToSeed, review } from "../lib/srs.ts";
import { toFlashcardDto } from "./mappers.ts";

export const reviewRoute = new Hono<AuthContext>();

reviewRoute.use("*", requireAuth);

reviewRoute.get("/queue", async (c) => {
  const u = c.get("user")!;
  const now = new Date();

  const due = await db
    .select()
    .from(flashcards)
    .where(
      and(
        eq(flashcards.userId, u.id),
        lte(flashcards.due, now),
        sql`${flashcards.stage} >= 0 AND ${flashcards.stage} < ${MAX_STAGE}`,
      ),
    )
    .orderBy(asc(flashcards.due))
    .limit(50);

  const unlearned = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.userId, u.id), eq(flashcards.stage, UNLEARNED_STAGE)))
    .orderBy(asc(flashcards.createdAt))
    .limit(20);

  const [counts] = await db
    .select({
      total: sql<number>`COUNT(*)`.as("total"),
      dueCount:
        sql<number>`SUM(CASE WHEN ${flashcards.due} <= NOW() AND ${flashcards.stage} >= 0 AND ${flashcards.stage} < ${MAX_STAGE} THEN 1 ELSE 0 END)`.as(
          "due_count",
        ),
      unlearnedCount:
        sql<number>`SUM(CASE WHEN ${flashcards.stage} = ${UNLEARNED_STAGE} THEN 1 ELSE 0 END)`.as(
          "unlearned_count",
        ),
      burnedCount:
        sql<number>`SUM(CASE WHEN ${flashcards.stage} = ${MAX_STAGE} THEN 1 ELSE 0 END)`.as(
          "burned_count",
        ),
    })
    .from(flashcards)
    .where(eq(flashcards.userId, u.id));

  const response: ReviewQueueDto = {
    due: due.map(toFlashcardDto),
    unlearned: unlearned.map(toFlashcardDto),
    stats: {
      dueCount: Number(counts?.dueCount ?? 0),
      unlearnedCount: Number(counts?.unlearnedCount ?? 0),
      burnedCount: Number(counts?.burnedCount ?? 0),
      totalCards: Number(counts?.total ?? 0),
    },
  };
  return c.json(response);
});

reviewRoute.post(
  "/cards/:id",
  zValidator("json", submitReviewInput),
  async (c) => {
    const u = c.get("user")!;
    const cardId = c.req.param("id");
    const { correct } = c.req.valid("json");

    const [card] = await db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, u.id)))
      .limit(1);
    if (!card) throw new HTTPException(404, { message: "card not found" });
    if (card.stage < 0) {
      throw new HTTPException(400, { message: "card not yet promoted from unlearned" });
    }

    const next = review(
      {
        stage: card.stage,
        modifier: Number(card.modifier),
        streak: card.streak,
        lapses: card.lapses,
        due: card.due,
        lastReview: card.lastReview,
      },
      correct,
    );

    const [updated] = await db
      .update(flashcards)
      .set({
        stage: next.stage,
        modifier: next.modifier.toFixed(2),
        streak: next.streak,
        lapses: next.lapses,
        due: next.due,
        lastReview: next.lastReview,
        updatedAt: new Date(),
      })
      .where(eq(flashcards.id, cardId))
      .returning();
    if (!updated) throw new HTTPException(500, { message: "update failed" });

    return c.json(toFlashcardDto(updated));
  },
);

reviewRoute.post("/cards/:id/promote", async (c) => {
  const u = c.get("user")!;
  const cardId = c.req.param("id");

  const [card] = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, u.id)))
    .limit(1);
  if (!card) throw new HTTPException(404, { message: "card not found" });
  if (card.stage !== UNLEARNED_STAGE) {
    return c.json(toFlashcardDto(card));
  }

  const seed = promoteToSeed();
  const [updated] = await db
    .update(flashcards)
    .set({
      stage: seed.stage,
      modifier: seed.modifier.toFixed(2),
      streak: seed.streak,
      lapses: seed.lapses,
      due: seed.due,
      lastReview: seed.lastReview,
      updatedAt: new Date(),
    })
    .where(eq(flashcards.id, cardId))
    .returning();
  if (!updated) throw new HTTPException(500, { message: "promote failed" });

  return c.json(toFlashcardDto(updated));
});
