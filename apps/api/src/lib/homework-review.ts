import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  homeworkSubmissions,
  lessonCards,
  lessons,
  user as userTable,
} from "@gojo/db";
import { homeworkAiReviewSchema } from "@gojo/shared";
import * as Sentry from "@sentry/bun";
import { asc, eq } from "drizzle-orm";
import { db } from "../db.ts";
import { env } from "../env.ts";

const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

const SYSTEM_PROMPT = `Ты — ассистент преподавателя японского языка на платформе Gojo. Студенты — русскоязычные, уровни N5–N3. Твоя задача — first-pass проверка письменной домашней работы: преподаватель увидит твою разметку и подтвердит или дополнит её, поэтому будь точным и не выдумывай ошибок.

Правила:
- Все пояснения пиши по-русски; японские примеры оставляй на японском.
- В "errors" включай только реальные ошибки (грамматика, частицы, порядок слов, неверное слово или чтение). "quote" — точная цитата из работы.
- "naturalness" — 1–3 предложения о том, звучит ли текст естественно, даже если грамматически верен.
- Если дан список целевой лексики урока, отметь, какие слова студент использовал (targetVocabUsed) и какие проигнорировал (targetVocabMissing). Без списка оставь оба массива пустыми.
- "score": 5 — безошибочно и естественно, 3 — есть ошибки, но смысл передан, 1 — задание не выполнено или текст не по теме.
- "suggestedDecision": "needs_revision" если ошибок много, задание выполнено не полностью или не использована целевая лексика; иначе "approve". Решение принимает преподаватель — это только рекомендация.
- "summary" — 2–3 предложения для студента: что получилось и над чем работать. Доброжелательно, без воды.`;

/**
 * Fire-and-forget Claude first-pass for a freshly inserted submission.
 * No-op when ANTHROPIC_API_KEY is unset. Failures are recorded on the row
 * (aiReviewError) so the teacher falls back to reviewing raw text.
 */
export function queueAiReview(submissionId: string): void {
  if (!client) return;
  runAiReview(submissionId).catch(async (err) => {
    console.error(`homework ai review failed for ${submissionId}:`, err);
    Sentry.captureException(err);
    try {
      await db
        .update(homeworkSubmissions)
        .set({
          aiReviewError: err instanceof Error ? err.message : String(err),
          updatedAt: new Date(),
        })
        .where(eq(homeworkSubmissions.id, submissionId));
    } catch (dbErr) {
      console.error(`failed to record ai review error for ${submissionId}:`, dbErr);
    }
  });
}

async function runAiReview(submissionId: string): Promise<void> {
  if (!client) return;

  const [submission] = await db
    .select()
    .from(homeworkSubmissions)
    .where(eq(homeworkSubmissions.id, submissionId))
    .limit(1);
  if (!submission || submission.status !== "submitted") return;

  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, submission.lessonId))
    .limit(1);
  const [student] = await db
    .select({ jlptLevel: userTable.jlptLevel })
    .from(userTable)
    .where(eq(userTable.id, submission.studentId))
    .limit(1);
  const cards = await db
    .select({ word: lessonCards.word, reading: lessonCards.reading, meaning: lessonCards.meaning })
    .from(lessonCards)
    .where(eq(lessonCards.lessonId, submission.lessonId))
    .orderBy(asc(lessonCards.position));

  const context = [
    lesson ? `Урок: «${lesson.title}»${lesson.metadata?.topic ? ` (тема: ${lesson.metadata.topic})` : ""}.` : null,
    lesson?.jlptLevel ? `Уровень урока: ${lesson.jlptLevel}.` : null,
    student?.jlptLevel ? `Уровень студента: ${student.jlptLevel}.` : null,
    cards.length > 0
      ? `Целевая лексика урока:\n${cards.map((c) => `- ${c.word}（${c.reading}）— ${c.meaning}`).join("\n")}`
      : "Целевая лексика урока не задана.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${context}\n\nРабота студента:\n<homework>\n${submission.content}\n</homework>`,
      },
    ],
    output_config: { format: zodOutputFormat(homeworkAiReviewSchema) },
  });

  if (response.stop_reason !== "end_turn") {
    throw new Error(`ai review stopped with ${response.stop_reason}`);
  }
  const review = response.parsed_output;
  if (!review) throw new Error("ai review returned no parsed output");

  await db
    .update(homeworkSubmissions)
    .set({
      aiReview: review,
      aiReviewedAt: new Date(),
      aiReviewError: null,
      status: "ai_reviewed",
      updatedAt: new Date(),
    })
    .where(eq(homeworkSubmissions.id, submissionId));
}
