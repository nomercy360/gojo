import { expect, test } from "@playwright/test";
import { adminAuthFile, e2eAccounts, studentAuthFile } from "./support/auth";
import { cleanLearningFlow, findUserId } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test.describe("lesson assignment invariants", () => {
  test.use({ storageState: studentAuthFile });

  let lessonId: string | undefined;
  let studentId: string | undefined;

  test.afterEach(async () => {
    await cleanLearningFlow(lessonId, studentId);
  });

  test("teacher-assigned lesson books the student, and self-serve booking is gone", async ({
    browser,
    page,
  }) => {
    const assignedStudentId = await findUserId(e2eAccounts.student.email);
    studentId = assignedStudentId;

    const adminContext = await browser.newContext({ storageState: adminAuthFile });
    try {
      const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const lessonResponse = await adminContext.request.post(`${apiURL}/teacher/lessons`, {
        data: {
          title: `E2E assigned lesson ${Date.now()}`,
          studentId: assignedStudentId,
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
        },
      });
      await expect(lessonResponse).toBeOK();
      lessonId = ((await lessonResponse.json()) as { id: string }).id;

      // Assigning a student on creation books them immediately — the lesson
      // shows up on their own schedule feed with no action required.
      const feedResponse = await page.request.get(`${apiURL}/lessons`);
      await expect(feedResponse).toBeOK();
      await expect(feedResponse.json()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: lessonId })]),
      );

      // The self-serve booking endpoint has been removed.
      const bookingResponse = await page.request.post(`${apiURL}/lessons/${lessonId}/book`);
      expect(bookingResponse.status()).toBe(404);
    } finally {
      await adminContext.close();
    }
  });
});
