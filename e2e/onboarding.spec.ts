import { expect, test } from "@playwright/test";
import { e2eAccounts, mutableStudentAuthFile } from "./support/auth";
import { findUserId, resetMutableStudent } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

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
    level: expect.stringMatching(/^N[1-5]$/),
    total: questions.length,
    correct: expect.any(Number),
  });
});

test.describe("authenticated quiz", () => {
  test.use({ storageState: mutableStudentAuthFile });

  test("persists the indicative level", async ({ request }) => {
    const studentId = await findUserId(e2eAccounts.mutableStudent.email);
    await resetMutableStudent(studentId);
    try {
      const questionsResponse = await request.get(`${apiURL}/onboarding/quiz/questions`);
      const questions = (await questionsResponse.json()) as Array<{ id: string }>;
      const quizResponse = await request.post(`${apiURL}/onboarding/quiz`, {
        data: {
          answers: questions.map((question) => ({ questionId: question.id, choiceIndex: 0 })),
        },
      });
      await expect(quizResponse).toBeOK();
      const result = (await quizResponse.json()) as { level: string };

      const me = await request.get(`${apiURL}/dev-auth/me`);
      await expect(me.json()).resolves.toMatchObject({ quizLevel: result.level });
    } finally {
      await resetMutableStudent(studentId);
    }
  });
});
