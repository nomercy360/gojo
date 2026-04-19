import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";
import { kanji, radicals } from "./schema/kanji.ts";

/**
 * Idempotent kanji + radicals seeder. Runs after migrations in CI deploy.
 * No-op if either table already has rows — lets us re-run safely on every
 * deploy without wiping or double-inserting reference data.
 */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
      } else if (c === "\r") {
        i++;
      } else {
        field += c;
        i++;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function str(v: string | undefined): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

type Client = ReturnType<typeof drizzle<typeof schema>>;

async function seedKanji(db: Client, dataDir: string): Promise<number> {
  const existing = await db.select().from(kanji).limit(1);
  if (existing.length > 0) {
    console.log("[seed] kanji already seeded, skipping");
    return 0;
  }

  const text = await readFile(`${dataDir}/ka_data.csv`, "utf8");
  const rows = parseCsv(text);
  const [header, ...records] = rows;
  if (!header) return 0;
  const idx: Record<string, number | undefined> = Object.fromEntries(
    header.map((h, i) => [h, i]),
  );
  const col = (r: string[], k: string): string | undefined => {
    const i = idx[k];
    return i === undefined ? undefined : r[i];
  };

  const batch = records
    .map((r) => {
      const character = str(col(r, "kanji"));
      if (!character) return null;
      const strokeCount = num(col(r, "kstroke"));
      if (strokeCount === null) return null;
      const meaning = str(col(r, "kmeaning")) ?? "";
      let examples: Array<[string, string]> | null = null;
      const rawExamples = str(col(r, "examples"));
      if (rawExamples) {
        try {
          examples = JSON.parse(rawExamples) as Array<[string, string]>;
        } catch {
          examples = null;
        }
      }
      return {
        character,
        kname: str(col(r, "kname")),
        strokeCount,
        meaning,
        grade: num(col(r, "kgrade")),
        kunyomiJa: str(col(r, "kunyomi_ja")),
        kunyomi: str(col(r, "kunyomi")),
        onyomiJa: str(col(r, "onyomi_ja")),
        onyomi: str(col(r, "onyomi")),
        examples,
        radical: str(col(r, "radical")),
        radOrder: num(col(r, "rad_order")),
        radStroke: num(col(r, "rad_stroke")),
        radNameJa: str(col(r, "rad_name_ja")),
        radName: str(col(r, "rad_name")),
        radMeaning: str(col(r, "rad_meaning")),
        radPositionJa: str(col(r, "rad_position_ja")),
        radPosition: str(col(r, "rad_position")),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    await db.insert(kanji).values(chunk).onConflictDoNothing();
    inserted += chunk.length;
  }
  console.log(`[seed] inserted ${inserted} kanji rows`);
  return inserted;
}

async function seedRadicals(db: Client, dataDir: string): Promise<number> {
  const existing = await db.select().from(radicals).limit(1);
  if (existing.length > 0) {
    console.log("[seed] radicals already seeded, skipping");
    return 0;
  }

  const text = await readFile(`${dataDir}/japanese-radicals.csv`, "utf8");
  const rows = parseCsv(text);
  const [header, ...records] = rows;
  if (!header) return 0;
  const idx: Record<string, number | undefined> = Object.fromEntries(
    header.map((h, i) => [h, i]),
  );
  const col = (r: string[], k: string): string | undefined => {
    const i = idx[k];
    return i === undefined ? undefined : r[i];
  };

  const batch = records
    .map((r) => {
      const id = num(col(r, "Radical ID#"));
      const character = str(col(r, "Radical"));
      const strokeCount = num(col(r, "Stroke#"));
      if (id === null || !character || strokeCount === null) return null;
      return {
        id,
        character,
        strokeCount,
        meaning: str(col(r, "Meaning")) ?? "",
        readingJa: str(col(r, "Reading-J")),
        reading: str(col(r, "Reading-R")),
        rFilename: str(col(r, "R-Filename")),
        animFilename: str(col(r, "Anim-Filename")),
        positionJa: str(col(r, "Position-J")),
        position: str(col(r, "Position-R")),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  await db.insert(radicals).values(batch).onConflictDoNothing();
  console.log(`[seed] inserted ${batch.length} radical rows`);
  return batch.length;
}

export async function runSeed(dataDir: string): Promise<void> {
  const url = process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo";
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema, casing: "snake_case" });
  try {
    await seedKanji(db, dataDir);
    await seedRadicals(db, dataDir);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  const dataDir = new URL("../data", import.meta.url).pathname;
  await runSeed(dataDir);
}
