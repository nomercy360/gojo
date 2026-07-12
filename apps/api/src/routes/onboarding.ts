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
import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
import { env } from "../env.ts";
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
    await persistQuizLevel(u.id, result);
  }

  return c.json(result);
});

onboardingRoute.post("/quiz/lead", zValidator("json", quizLeadInput), async (c) => {
  const u = c.get("user");
  const data = c.req.valid("json");
  const result = scoreQuiz(data);

  if (u) {
    await persistQuizLevel(u.id, result);
  }

  const notes = buildQuizLeadNotes(data, result);
  const lead = await db.transaction(async (tx) => {
    const normalizedEmail = data.email.toLowerCase();
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${normalizedEmail}))`);
    const [existingUser] = u
      ? [{ id: u.id }]
      : await tx
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.email, normalizedEmail))
          .limit(1);
    const [canonicalLead] = await tx
      .select({ name: leads.name })
      .from(leads)
      .where(eq(leads.email, normalizedEmail))
      .orderBy(asc(leads.createdAt))
      .limit(1);
    const canonicalName = canonicalLead?.name ?? data.name;
    const [existingLead] = await tx
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.email, normalizedEmail),
          eq(leads.kind, "quiz"),
          inArray(leads.status, ["new", "contacted", "trial_booked"]),
        ),
      )
      .limit(1);
    const values = {
      name: canonicalName,
      email: normalizedEmail,
      level: result.assessment === "demonstrated" ? result.level : null,
      goal: "Получить подробный результат квиза и план обучения",
      notes,
      userId: existingUser?.id ?? null,
      updatedAt: new Date(),
    };
    if (existingLead) {
      const [updated] = await tx
        .update(leads)
        .set(values)
        .where(eq(leads.id, existingLead.id))
        .returning({ id: leads.id });
      return { ...updated, created: false, canonicalName };
    }
    const [created] = await tx
      .insert(leads)
      .values({ kind: "quiz", ...values })
      .returning({ id: leads.id });
    return { ...created, created: true, canonicalName };
  });

  if (lead.created) {
    void notifyLead({
      kind: "quiz",
      name: lead.canonicalName,
      email: data.email,
      level: result.assessment === "demonstrated" ? result.level : null,
      goal: `${result.correct}/${result.total} правильных; подробный результат отправлен на email`,
    });
  }

  let emailSent = true;
  try {
    await sendQuizResultEmail(data.email, lead.canonicalName, result);
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
  const answered = served.filter((question) => (answerById.get(question.id) ?? -1) >= 0).length;
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
    assessment:
      answered === 0
        ? input.declared && input.declared !== "new"
          ? "declared_only"
          : "insufficient"
        : answered < Math.ceil(served.length / 2) || correct === 0
          ? "insufficient"
          : "demonstrated",
    correct,
    total: served.length,
    byLevel,
  };
}

async function persistQuizLevel(userId: string, result: QuizResultDto): Promise<void> {
  const [row] = await db
    .update(userTable)
    .set({
      quizLevel: result.assessment === "demonstrated" ? result.level : null,
      updatedAt: new Date(),
    })
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
    `Квиз: ${result.assessment === "demonstrated" ? (result.level === "start" ? "с нуля (ниже N5)" : result.level) : "недостаточно данных"}`,
    `Статус оценки: ${result.assessment}`,
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
  const demonstrated = result.assessment === "demonstrated";
  const levelLabel = demonstrated
    ? result.level === "start"
      ? "старт с самых азов"
      : `примерно ${result.level}`
    : "пока недостаточно данных для оценки";
  const subject = !demonstrated
    ? "Результат теста японского — нужно больше ответов"
    : result.level === "start"
      ? "Твой план: начинаем японский с самых азов"
      : `Твой примерный уровень японского — ${result.level}`;
  const escapedName = escapeHtml(name);
  const breakdown = result.byLevel
    .map(({ level, correct, total }) => {
      const recommendation =
        correct === total
          ? "уровень подтверждён ответами"
          : correct === 0
            ? "стоит начать с основ этого уровня"
            : "есть база, но отдельные темы нужно закрепить";
      return `<li><strong>${level}</strong>: ${correct}/${total} — ${recommendation}</li>`;
    })
    .join("");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #252525;">
      <p style="margin:0 0 8px;color:#e8420a;font-weight:700">gojo</p>
      <h1 style="margin: 0 0 12px;">${escapedName}, вот с чего лучше начать</h1>
      <p>Предварительная оценка: <strong>${levelLabel}</strong>. Верных ответов: ${result.correct} из ${result.total}.</p>
      <h2 style="font-size: 18px;">Разбор по уровням</h2>
      <ul>${breakdown}</ul>
      <p>${demonstrated ? resultBlurb(result.level) : "Мы не будем присваивать уровень только по самооценке или пропускам. Ответь на большее число вопросов либо уточни уровень с преподавателем."}</p>
      <p>Это предварительная оценка. На бесплатном первом уроке преподаватель проверит уровень точнее и предложит план занятий.</p>
      <p><a href="${env.WEB_ORIGIN}/#pricing" style="color: #e8420a; font-weight: 700;">Записаться на бесплатный урок →</a></p>
      <p style="font-size: 12px; color: #6b6b6b;">Gojo Learn · школа японского языка · <a href="https://t.me/gojoedu">связаться с нами</a><br><a href="mailto:hello@gojolearn.ru?subject=Отписаться">Не получать письма о результатах и обучении</a></p>
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
