import { user as userTable } from "@gojo/db";
import {
  type QuizQuestionDto,
  type QuizResultDto,
  type QuizSubmitInput,
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

// No requireAuth — the quiz is a public assessment, not part of any signup
// gate. Logged-in users additionally get quizLevel persisted; guests only get
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
    // "insufficient" means too few answers to judge — nothing else. A fully
    // answered all-wrong run is sufficient evidence: it demonstrates "start".
    assessment:
      answered === 0
        ? input.declared && input.declared !== "new"
          ? "declared_only"
          : "insufficient"
        : answered < Math.ceil(served.length / 2)
          ? "insufficient"
          : "demonstrated",
    correct,
    total: served.length,
    byLevel,
  };
}

async function persistQuizLevel(userId: string, result: QuizResultDto): Promise<void> {
  // Only demonstrated runs write: a retake that was skipped or abandoned must
  // not erase a level the user actually earned earlier.
  if (result.assessment !== "demonstrated") return;
  const [row] = await db
    .update(userTable)
    .set({
      quizLevel: result.level,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId))
    .returning();
  if (!row) throw new HTTPException(404, { message: "user not found" });
}
