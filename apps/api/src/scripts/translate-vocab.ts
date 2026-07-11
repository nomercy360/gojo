/**
 * One-time RU translation pass for level_vocab.meaningRu. Idempotent: only
 * touches rows where meaningRu is null, so it can be re-run after adding new
 * vocab. Requires ANTHROPIC_API_KEY.
 *
 *   bun --env-file=../../.env run src/scripts/translate-vocab.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { levelVocab } from "@gojo/db";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.ts";
import { env } from "../env.ts";

if (!env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(1);
}
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const batchSchema = z.object({
  translations: z.array(z.object({ id: z.string(), ru: z.string() })),
});

const rows = await db
  .select({
    id: levelVocab.id,
    word: levelVocab.word,
    reading: levelVocab.reading,
    meaningEn: levelVocab.meaningEn,
  })
  .from(levelVocab)
  .where(isNull(levelVocab.meaningRu));

console.log(`${rows.length} vocab rows to translate`);

const BATCH = 50;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const list = batch
    .map((r) => `${r.id} | ${r.word}（${r.reading}）| ${r.meaningEn}`)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    system:
      "Ты переводишь глоссы японских слов для русскоязычной платформы изучения японского (уровень N5). Для каждой строки дай краткий русский глосс (1-4 слова, через запятую если значений несколько) — перевод самого японского слова; английский глосс используй как подсказку. Глаголы — инфинитивом («встречаться, видеться»), прилагательные — мужским родом. Верни id без изменений.",
    messages: [{ role: "user", content: `Строки (id | слово（чтение）| en):\n${list}` }],
    output_config: { format: zodOutputFormat(batchSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`batch at ${i}: no parsed output`);
  for (const t of parsed.translations) {
    await db.update(levelVocab).set({ meaningRu: t.ru }).where(eq(levelVocab.id, t.id));
  }
  console.log(`translated ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
}

console.log("done");
process.exit(0);
