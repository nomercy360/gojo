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
import {
  LEVEL_ORDER,
  QUIZ_QUESTIONS,
  placementFor,
  questionsForDeclared,
} from "../data/quiz-questions.ts";
import { db } from "../db.ts";
import { notifyLead } from "../lead-notifications.ts";
import { sendEmail } from "../mailer.ts";

export const onboardingRoute = new Hono<AuthContext>();

onboardingRoute.get("/quiz/questions", (c) => {
  const questions: QuizQuestionDto[] = QUIZ_QUESTIONS.map((q) => ({
    id: q.id,
    level: q.level,
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
  const result = scoreQuiz(c.req.valid("json"));

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

  const notes = buildQuizLeadNotes(data, result);
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
  const served = questionsForDeclared(input.declared);
  const answerById = new Map(input.answers.map((a) => [a.questionId, a.choiceIndex]));
  let correct = 0;
  const byLevel: QuizResultDto["byLevel"] = [];
  for (const level of LEVEL_ORDER) {
    const questions = served.filter((q) => q.level === level);
    if (questions.length === 0) continue;
    const levelCorrect = questions.filter((q) => answerById.get(q.id) === q.correctIndex).length;
    correct += levelCorrect;
    byLevel.push({ level, correct: levelCorrect, total: questions.length });
  }

  return {
    level: placementFor(input.declared, byLevel),
    correct,
    total: served.length,
    byLevel,
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

const DECLARED_LABEL: Record<NonNullable<QuizSubmitInput["declared"]>, string> = {
  new: "совсем с нуля",
  kana: "читает кану",
  n5: "база есть (~N5)",
  n4: "средний и выше (~N4+)",
};

function buildQuizLeadNotes(data: QuizSubmitInput, result: QuizResultDto): string {
  const answerById = new Map(data.answers.map((a) => [a.questionId, a.choiceIndex]));
  const lines = [
    `Квиз уровня: ${result.level === "start" ? "с нуля (ниже N5)" : result.level}`,
    `Со слов: ${data.declared ? DECLARED_LABEL[data.declared] : "не указано"}`,
    `Результат: ${result.correct}/${result.total}`,
    "",
    "Ответы:",
  ];
  for (const q of questionsForDeclared(data.declared)) {
    const picked = answerById.get(q.id);
    const pickedLabel =
      picked === undefined
        ? "нет ответа"
        : picked === -1
          ? "не знаю (пропустил)"
          : (q.choices[picked] ?? `вариант ${picked}`);
    const marker = picked === q.correctIndex ? "✓" : "×";
    lines.push(`${marker} ${q.id} (${q.level}): ${pickedLabel}`);
  }
  return lines.join("\n");
}

async function sendQuizResultEmail(to: string, name: string, result: QuizResultDto): Promise<void> {
  const levelLabel = result.level === "start" ? "старт с самых азов" : `примерно ${result.level}`;
  const subject =
    result.level === "start"
      ? "Твой план: начинаем японский с самых азов"
      : `Твой примерный уровень японского — ${result.level}`;
  const escapedName = escapeHtml(name);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #252525;">
      <h1 style="margin: 0 0 12px;">${escapedName}, твой результат — ${levelLabel}</h1>
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
  if (level === "start")
    return "Начни с каны: 46 знаков хираганы в нашем бесплатном тренажёре, первое слово прочитаешь уже через несколько минут. Уровень уточним на первом уроке.";
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
