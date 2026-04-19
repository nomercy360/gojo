import { kanji } from "@gojo/db";
import type { KanjiBreakdownEntry } from "@gojo/shared";
import { inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AuthContext } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { toKanjiDto } from "./mappers.ts";

export const kanjiRoute = new Hono<AuthContext>();

/**
 * Extract CJK unified ideographs from a word string. Reused from spfn —
 * kanji-to-word linkage is inferred at runtime, no join table needed.
 */
function extractKanji(word: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ch of word) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    // CJK Unified Ideographs: U+4E00..U+9FFF (main block only, enough for JLPT range)
    if (code >= 0x4e00 && code <= 0x9fff && !seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out;
}

kanjiRoute.get("/breakdown", async (c) => {
  const word = c.req.query("word")?.trim();
  if (!word) throw new HTTPException(400, { message: "word query param required" });

  const chars = extractKanji(word);
  if (chars.length === 0) return c.json([] as KanjiBreakdownEntry[]);

  const rows = await db.select().from(kanji).where(inArray(kanji.character, chars));
  const byChar = new Map(rows.map((r) => [r.character, r]));

  const result: KanjiBreakdownEntry[] = chars.map((ch) => {
    const row = byChar.get(ch);
    return row
      ? { character: ch, found: true, kanji: toKanjiDto(row) }
      : { character: ch, found: false, kanji: null };
  });
  return c.json(result);
});

kanjiRoute.get("/:char", async (c) => {
  const char = decodeURIComponent(c.req.param("char"));
  const [row] = await db
    .select()
    .from(kanji)
    .where(inArray(kanji.character, [char]))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: "kanji not found" });
  return c.json(toKanjiDto(row));
});
