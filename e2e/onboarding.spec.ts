import { expect, test } from "@playwright/test";
import { QUIZ_QUESTIONS } from "../apps/api/src/data/quiz-questions";
import { e2eAccounts, mutableStudentAuthFile } from "./support/auth";
import { findUserId, resetMutableStudent } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

/** Answer key derived from the served bank so tests track bank edits. */
function answersWhere(pickCorrect: (q: (typeof QUIZ_QUESTIONS)[number]) => boolean) {
  return QUIZ_QUESTIONS.map((q) => ({
    questionId: q.id,
    choiceIndex: pickCorrect(q) ? q.correctIndex : (q.correctIndex + 1) % q.choices.length,
  }));
}

test("quiz questions are public and do not expose answers", async ({ request }) => {
  const response = await request.get(`${apiURL}/onboarding/quiz/questions`);
  await expect(response).toBeOK();
  const questions = (await response.json()) as Array<Record<string, unknown>>;
  expect(questions.length).toBeGreaterThan(0);
  expect(questions[0]).toMatchObject({ id: expect.any(String), choices: expect.any(Array) });
  expect(questions[0]).not.toHaveProperty("correctIndex");
});

test("guest can complete the level quiz", async ({ request }) => {
  const questionsResponse = await request.get(`${apiURL}/onboarding/quiz/questions`);
  const questions = (await questionsResponse.json()) as Array<{ id: string }>;
  const response = await request.post(`${apiURL}/onboarding/quiz`, {
    data: { answers: questions.map((question) => ({ questionId: question.id, choiceIndex: 0 })) },
  });
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({
    level: expect.stringMatching(/^(start|N[2-5])$/),
    assessment: expect.stringMatching(/^(demonstrated|insufficient)$/),
    total: questions.length,
    correct: expect.any(Number),
  });
});

test("a single correct N5 answer does not claim N5", async ({ request }) => {
  const [firstN5] = QUIZ_QUESTIONS.filter((q) => q.level === "N5");
  const response = await request.post(`${apiURL}/onboarding/quiz`, {
    data: { declared: "n5", answers: answersWhere((q) => q.id === firstN5.id) },
  });
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({
    level: "start",
    correct: 1,
    total: QUIZ_QUESTIONS.length,
  });
});

test("one slip on an N5 question does not zero an otherwise perfect run", async ({ request }) => {
  const [firstN5] = QUIZ_QUESTIONS.filter((q) => q.level === "N5");
  const response = await request.post(`${apiURL}/onboarding/quiz`, {
    data: { answers: answersWhere((q) => q.id !== firstN5.id) },
  });
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({
    level: "N2",
    assessment: "demonstrated",
    correct: QUIZ_QUESTIONS.length - 1,
  });
});

test("fully answered all-wrong run is a demonstrated start, not insufficient", async ({
  request,
}) => {
  const response = await request.post(`${apiURL}/onboarding/quiz`, {
    data: { answers: answersWhere(() => false) },
  });
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({
    level: "start",
    assessment: "demonstrated",
    correct: 0,
  });
});

test("all-skipped N4 declaration is marked declared-only, not assigned N4", async ({ request }) => {
  const questionsResponse = await request.get(`${apiURL}/onboarding/quiz/questions`);
  const questions = (await questionsResponse.json()) as Array<{ id: string }>;
  const response = await request.post(`${apiURL}/onboarding/quiz`, {
    data: {
      declared: "n4",
      answers: questions.map((question) => ({ questionId: question.id, choiceIndex: -1 })),
    },
  });
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({
    level: "start",
    assessment: "declared_only",
    correct: 0,
    total: questions.length,
  });
});

test.describe("authenticated quiz", () => {
  test.use({ storageState: mutableStudentAuthFile });

  test("persists the indicative level, and a skipped retake does not erase it", async ({
    request,
  }) => {
    const studentId = await findUserId(e2eAccounts.mutableStudent.email);
    await resetMutableStudent(studentId);
    try {
      const quizResponse = await request.post(`${apiURL}/onboarding/quiz`, {
        data: { answers: answersWhere(() => true) },
      });
      await expect(quizResponse).toBeOK();
      const result = (await quizResponse.json()) as { level: string };
      expect(result.level).toBe("N2");

      const me = await request.get(`${apiURL}/dev-auth/me`);
      await expect(me.json()).resolves.toMatchObject({ quizLevel: result.level });

      // Retake with everything skipped: declared-only, must not null the level.
      const retake = await request.post(`${apiURL}/onboarding/quiz`, {
        data: {
          declared: "n4",
          answers: QUIZ_QUESTIONS.map((q) => ({ questionId: q.id, choiceIndex: -1 })),
        },
      });
      await expect(retake).toBeOK();
      const meAfter = await request.get(`${apiURL}/dev-auth/me`);
      await expect(meAfter.json()).resolves.toMatchObject({ quizLevel: result.level });
    } finally {
      await resetMutableStudent(studentId);
    }
  });
});
