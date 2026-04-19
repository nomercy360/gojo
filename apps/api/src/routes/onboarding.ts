import { user as userTable } from "@gojo/db";
import { type QuizQuestionDto, type QuizResultDto, quizSubmitInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { QUIZ_QUESTIONS, scoreToLevel } from "../data/quiz-questions.ts";
import { db } from "../db.ts";

export const onboardingRoute = new Hono<AuthContext>();

onboardingRoute.get("/quiz/questions", (c) => {
  const questions: QuizQuestionDto[] = QUIZ_QUESTIONS.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    choices: q.choices,
  }));
  return c.json(questions);
});

onboardingRoute.post(
  "/quiz",
  requireAuth,
  zValidator("json", quizSubmitInput),
  async (c) => {
    const u = c.get("user")!;
    const { answers } = c.req.valid("json");

    const byId = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));
    let correct = 0;
    for (const a of answers) {
      const q = byId.get(a.questionId);
      if (q && a.choiceIndex === q.correctIndex) correct += 1;
    }

    const level = scoreToLevel(correct);

    const [row] = await db
      .update(userTable)
      .set({ jlptLevel: level, updatedAt: new Date() })
      .where(eq(userTable.id, u.id))
      .returning();
    if (!row) throw new HTTPException(404, { message: "user not found" });

    const result: QuizResultDto = {
      level,
      correct,
      total: QUIZ_QUESTIONS.length,
    };
    return c.json(result);
  },
);
