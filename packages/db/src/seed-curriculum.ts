import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";
import { levelGrammar, levelKanji, levelVocab, levels } from "./schema/curriculum.ts";

/**
 * Idempotent curriculum seeder: 30 level rows + N5 content (levels 1-8).
 * Content tables are skipped when non-empty, same policy as seed-kanji —
 * re-runs on every deploy are no-ops. To re-seed after editing data files,
 * truncate the level_* tables first.
 */

const BAND_RANGES: Array<[number, number, "N5" | "N4" | "N3"]> = [
  [1, 8, "N5"],
  [9, 18, "N4"],
  [19, 30, "N3"],
];

const N5_LEVELS = 8;

type Client = ReturnType<typeof drizzle<typeof schema>>;

/** Split items into `parts` chunks whose sizes differ by at most one. */
function chunkEven<T>(items: T[], parts: number): T[][] {
  const out: T[][] = [];
  const base = Math.floor(items.length / parts);
  const extra = items.length % parts;
  let offset = 0;
  for (let i = 0; i < parts; i++) {
    const size = base + (i < extra ? 1 : 0);
    out.push(items.slice(offset, offset + size));
    offset += size;
  }
  return out;
}

async function isEmpty(db: Client, table: typeof levelKanji | typeof levelVocab | typeof levelGrammar | typeof levels): Promise<boolean> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(table);
  return Number(row?.n ?? 0) === 0;
}

async function seedLevels(db: Client): Promise<void> {
  if (!(await isEmpty(db, levels))) {
    console.log("[seed] levels already seeded, skipping");
    return;
  }
  const rows = [];
  for (const [from, to, band] of BAND_RANGES) {
    for (let id = from; id <= to; id++) rows.push({ id, band });
  }
  await db.insert(levels).values(rows).onConflictDoNothing();
  console.log(`[seed] inserted ${rows.length} levels`);
}

async function seedLevelKanji(db: Client, dataDir: string): Promise<void> {
  if (!(await isEmpty(db, levelKanji))) {
    console.log("[seed] level_kanji already seeded, skipping");
    return;
  }
  const mapping = JSON.parse(await readFile(`${dataDir}/jlpt-kanji.json`, "utf8")) as Record<
    string,
    { jlpt: number; freq: number }
  >;
  // N5 kanji, most frequent first, spread evenly across levels 1-8.
  const n5 = Object.entries(mapping)
    .filter(([, v]) => v.jlpt === 5)
    .sort((a, b) => a[1].freq - b[1].freq)
    .map(([ch]) => ch);

  const rows = chunkEven(n5, N5_LEVELS).flatMap((chunk, i) =>
    chunk.map((character, position) => ({ levelId: i + 1, character, position })),
  );
  await db.insert(levelKanji).values(rows).onConflictDoNothing();
  console.log(`[seed] inserted ${rows.length} level_kanji rows across ${N5_LEVELS} levels`);
}

async function seedLevelVocab(db: Client, dataDir: string): Promise<void> {
  if (!(await isEmpty(db, levelVocab))) {
    console.log("[seed] level_vocab already seeded, skipping");
    return;
  }
  const text = await readFile(`${dataDir}/n5-vocab.csv`, "utf8");
  const lines = text.split("\n").slice(1); // header: expression,reading,meaning,tags
  const words: Array<{ word: string; reading: string; meaningEn: string }> = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.trim()) continue;
    // Simple CSV: only the meaning column is ever quoted in this file.
    const m = line.match(/^([^,]*),([^,]*),(?:"([^"]*)"|([^,]*)),/);
    if (!m) continue;
    const word = m[1]!.trim();
    const reading = m[2]!.trim();
    const meaningEn = (m[3] ?? m[4] ?? "").trim();
    if (!word || !reading || !meaningEn || seen.has(word)) continue;
    seen.add(word);
    words.push({ word, reading, meaningEn });
  }

  const rows = chunkEven(words, N5_LEVELS).flatMap((chunk, i) =>
    chunk.map((w, position) => ({ levelId: i + 1, position, ...w })),
  );
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await db.insert(levelVocab).values(rows.slice(i, i + chunkSize)).onConflictDoNothing();
  }
  console.log(`[seed] inserted ${rows.length} level_vocab rows across ${N5_LEVELS} levels`);
}

async function seedLevelGrammar(db: Client, dataDir: string): Promise<void> {
  if (!(await isEmpty(db, levelGrammar))) {
    console.log("[seed] level_grammar already seeded, skipping");
    return;
  }
  const points = JSON.parse(await readFile(`${dataDir}/n5-grammar.json`, "utf8")) as Array<{
    level: number;
    title: string;
    pattern: string;
    descriptionRu: string;
    exampleJa: string;
    exampleRu: string;
  }>;
  const positionByLevel = new Map<number, number>();
  const rows = points.map((p) => {
    const position = positionByLevel.get(p.level) ?? 0;
    positionByLevel.set(p.level, position + 1);
    return {
      levelId: p.level,
      title: p.title,
      pattern: p.pattern,
      descriptionRu: p.descriptionRu,
      exampleJa: p.exampleJa,
      exampleRu: p.exampleRu,
      position,
    };
  });
  await db.insert(levelGrammar).values(rows).onConflictDoNothing();
  console.log(`[seed] inserted ${rows.length} level_grammar rows`);
}

export async function runCurriculumSeed(dataDir: string): Promise<void> {
  const url = process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo";
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema, casing: "snake_case" });
  try {
    await seedLevels(db);
    await seedLevelKanji(db, dataDir);
    await seedLevelVocab(db, dataDir);
    await seedLevelGrammar(db, dataDir);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  const dataDir = fileURLToPath(new URL("../data", import.meta.url));
  await runCurriculumSeed(dataDir);
}
