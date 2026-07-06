import { leads, user as userTable } from "@gojo/db";
import {
  type QuizLeadResultDto,
  type QuizQuestionDto,
  type QuizResultDto,
  type QuizSubmitInput,
  quizLeadInput,
  quizSubmitInput,
} from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AuthContext } from "../auth/middleware.ts";
import { QUIZ_QUESTIONS, scoreToLevel } from "../data/quiz-questions.ts";
import { db } from "../db.ts";
import { notifyLead } from "../lead-notifications.ts";
import { sendEmail } from "../mailer.ts";

export const onboardingRoute = new Hono<AuthContext>();

onboardingRoute.get("/quiz/questions", (c) => {
  const questions: QuizQuestionDto[] = QUIZ_QUESTIONS.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    choices: q.choices,
  }));
  return c.json(questions);
});

// No requireAuth — the quiz is a public lead-magnet, not part of any signup
// gate. Logged-in users additionally get quizLevel persisted; guests just get
// the indicative result back (nothing to persist without an account).
onboardingRoute.post("/quiz", zValidator("json", quizSubmitInput), async (c) => {
  const u = c.get("user");
  const { answers } = c.req.valid("json");
  const result = scoreQuiz({ answers });

  // Indicative only — the official jlptLevel is set by a teacher after the
  // free consultation lesson (see PATCH /teacher/lessons/:id/students/:studentId/level).
  if (u) {
    await persistQuizLevel(u.id, result.level);
  }

  return c.json(result);
});

onboardingRoute.post("/quiz/lead", zValidator("json", quizLeadInput), async (c) => {
  const u = c.get("user");
  const data = c.req.valid("json");
  const result = scoreQuiz(data);

  if (u) {
    await persistQuizLevel(u.id, result.level);
  }

  const notes = buildQuizLeadNotes(data.answers, result);
  const [lead] = await db
    .insert(leads)
    .values({
      kind: "quiz",
      name: data.name,
      email: data.email,
      contact: data.contact || null,
      level: result.level,
      goal: "Получить подробный результат квиза и план обучения",
      notes,
      userId: u?.id ?? null,
    })
    .returning({ id: leads.id });

  void notifyLead({
    kind: "quiz",
    name: data.name,
    email: data.email,
    contact: data.contact,
    level: result.level,
    goal: `${result.correct}/${result.total} правильных; подробный результат отправлен на email`,
  });

  let emailSent = true;
  try {
    await sendQuizResultEmail(data.email, data.name, result);
  } catch (err) {
    emailSent = false;
    console.error("sendQuizResultEmail failed:", err);
  }

  const response: QuizLeadResultDto = {
    ...result,
    leadId: lead?.id,
    emailSent,
  };
  return c.json(response, 201);
});

function scoreQuiz(input: QuizSubmitInput): QuizResultDto {
  const byId = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));
  let correct = 0;
  for (const a of input.answers) {
    const q = byId.get(a.questionId);
    if (q && a.choiceIndex === q.correctIndex) correct += 1;
  }

  return {
    level: scoreToLevel(correct),
    correct,
    total: QUIZ_QUESTIONS.length,
  };
}

async function persistQuizLevel(userId: string, level: QuizResultDto["level"]): Promise<void> {
  const [row] = await db
    .update(userTable)
    .set({ quizLevel: level, updatedAt: new Date() })
    .where(eq(userTable.id, userId))
    .returning();
  if (!row) throw new HTTPException(404, { message: "user not found" });
}

function buildQuizLeadNotes(answers: QuizSubmitInput["answers"], result: QuizResultDto): string {
  const answerById = new Map(answers.map((a) => [a.questionId, a.choiceIndex]));
  const lines = [
    `Квиз уровня: ${result.level}`,
    `Результат: ${result.correct}/${result.total}`,
    "",
    "Ответы:",
  ];
  for (const q of QUIZ_QUESTIONS) {
    const picked = answerById.get(q.id);
    const pickedLabel =
      picked === undefined ? "нет ответа" : (q.choices[picked] ?? `вариант ${picked}`);
    const marker = picked === q.correctIndex ? "✓" : "×";
    lines.push(`${marker} ${q.id} (${q.level}): ${pickedLabel}`);
  }
  return lines.join("\n");
}

async function sendQuizResultEmail(to: string, name: string, result: QuizResultDto): Promise<void> {
  const subject = `Твой примерный уровень японского — ${result.level}`;
  const escapedName = escapeHtml(name);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #252525;">
      <h1 style="margin: 0 0 12px;">${escapedName}, твой примерный уровень — ${result.level}</h1>
      <p>Ты ответил(а) правильно на <strong>${result.correct} из ${result.total}</strong> вопросов.</p>
      <p>${resultBlurb(result.level)}</p>
      <p>Это предварительная оценка. На бесплатном первом уроке преподаватель проверит уровень точнее и предложит план занятий.</p>
      <p><a href="https://t.me/gojoedu" style="color: #e8420a; font-weight: 700;">Записаться на бесплатный урок в Telegram →</a></p>
      <p style="font-size: 12px; color: #6b6b6b;">Gojo Learn · школа японского</p>
    </div>
  `;
  await sendEmail(to, subject, html);
}

function resultBlurb(level: QuizResultDto["level"]): string {
  if (level === "N5")
    return "Лучше начать с базы: хирагана, катакана, простые фразы и первые грамматические конструкции.";
  if (level === "N4")
    return "База уже есть. Следующий шаг — уверенные глагольные формы, бытовые темы и больше практики чтения.";
  if (level === "N3")
    return "Ты уже можешь держаться на среднем уровне. Нужны сложные конструкции, чтение и разговорная автоматизация.";
  return "Уровень высокий: можно шлифовать нюансы, готовиться к JLPT и разбирать живые материалы.";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
