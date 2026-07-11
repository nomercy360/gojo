import { kanji, levelGrammar, levelKanji, levelVocab, levels } from "@gojo/db";
import type { LevelDetailDto, LevelSummaryDto } from "@gojo/shared";
import { asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";

export const levelsRoute = new Hono<AuthContext>();

levelsRoute.use("*", requireAuth);

levelsRoute.get("/", async (c) => {
  const user = c.get("user")!;
  const currentLevel = user.currentLevel ?? 1;
  const isAdmin = user.role === "admin";

  const count = sql<number>`count(*)`;
  const [levelRows, kanjiCounts, vocabCounts, grammarCounts] = await Promise.all([
    db.select().from(levels).orderBy(asc(levels.id)),
    db.select({ levelId: levelKanji.levelId, n: count }).from(levelKanji).groupBy(levelKanji.levelId),
    db.select({ levelId: levelVocab.levelId, n: count }).from(levelVocab).groupBy(levelVocab.levelId),
    db
      .select({ levelId: levelGrammar.levelId, n: count })
      .from(levelGrammar)
      .groupBy(levelGrammar.levelId),
  ]);
  const byLevel = (rows: Array<{ levelId: number; n: number }>) =>
    new Map(rows.map((r) => [r.levelId, Number(r.n)]));
  const kanjiBy = byLevel(kanjiCounts);
  const vocabBy = byLevel(vocabCounts);
  const grammarBy = byLevel(grammarCounts);

  const out: LevelSummaryDto[] = levelRows.map((r) => ({
    id: r.id,
    band: r.band,
    kanjiCount: kanjiBy.get(r.id) ?? 0,
    vocabCount: vocabBy.get(r.id) ?? 0,
    grammarCount: grammarBy.get(r.id) ?? 0,
    unlocked: isAdmin || r.id <= currentLevel,
    current: r.id === currentLevel,
  }));
  return c.json(out);
});

levelsRoute.get("/:id", async (c) => {
  const user = c.get("user")!;
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) throw new HTTPException(400, { message: "bad level id" });

  const [level] = await db.select().from(levels).where(eq(levels.id, id)).limit(1);
  if (!level) throw new HTTPException(404, { message: "level not found" });

  const currentLevel = user.currentLevel ?? 1;
  if (user.role !== "admin" && id > currentLevel) {
    throw new HTTPException(403, { message: "level locked" });
  }

  const [kanjiRows, vocabRows, grammarRows] = await Promise.all([
    db
      .select({
        character: levelKanji.character,
        position: levelKanji.position,
        meaning: kanji.meaning,
        kunyomi: kanji.kunyomi,
        onyomi: kanji.onyomi,
        strokeCount: kanji.strokeCount,
      })
      .from(levelKanji)
      .innerJoin(kanji, eq(kanji.character, levelKanji.character))
      .where(eq(levelKanji.levelId, id))
      .orderBy(asc(levelKanji.position)),
    db.select().from(levelVocab).where(eq(levelVocab.levelId, id)).orderBy(asc(levelVocab.position)),
    db
      .select()
      .from(levelGrammar)
      .where(eq(levelGrammar.levelId, id))
      .orderBy(asc(levelGrammar.position)),
  ]);

  const out: LevelDetailDto = {
    id: level.id,
    band: level.band,
    kanji: kanjiRows.map((k) => ({
      character: k.character,
      meaning: k.meaning,
      kunyomi: k.kunyomi ?? null,
      onyomi: k.onyomi ?? null,
      strokeCount: k.strokeCount,
      position: k.position,
    })),
    vocab: vocabRows.map((v) => ({
      id: v.id,
      word: v.word,
      reading: v.reading,
      meaning: v.meaningRu ?? v.meaningEn,
      position: v.position,
    })),
    grammar: grammarRows.map((g) => ({
      id: g.id,
      title: g.title,
      pattern: g.pattern ?? null,
      descriptionRu: g.descriptionRu,
      exampleJa: g.exampleJa ?? null,
      exampleRu: g.exampleRu ?? null,
      position: g.position,
    })),
  };
  return c.json(out);
});
