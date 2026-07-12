import { expect, test } from "@playwright/test";
import { adminAuthFile, e2eAccounts, studentAuthFile } from "./support/auth";
import {
  cleanLearningFlow,
  findUserId,
  grantBookingCredit,
  setLessonCapacity,
} from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test.describe("booking invariants", () => {
  test.use({ storageState: studentAuthFile });

  let lessonId: string | undefined;
  let studentId: string | undefined;

  test.afterEach(async () => {
    await cleanLearningFlow(lessonId, studentId);
  });

  test("full lessons reject direct API booking", async ({ browser, page }) => {
    const assignedStudentId = await findUserId(e2eAccounts.student.email);
    studentId = assignedStudentId;
    await grantBookingCredit(assignedStudentId);

    const adminContext = await browser.newContext({ storageState: adminAuthFile });
    try {
      const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const lessonResponse = await adminContext.request.post(`${apiURL}/teacher/lessons`, {
        data: {
          title: `E2E full lesson ${Date.now()}`,
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
        },
      });
      await expect(lessonResponse).toBeOK();
      lessonId = ((await lessonResponse.json()) as { id: string }).id;
      await setLessonCapacity(lessonId, 0);

      const bookingResponse = await page.request.post(`${apiURL}/lessons/${lessonId}/book`);
      expect(bookingResponse.status()).toBe(409);
      await expect(bookingResponse.text()).resolves.toBe("lesson is full");
    } finally {
      await adminContext.close();
    }
  });
});
