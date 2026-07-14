import { expect, test } from "@playwright/test";
import {
  adminAuthFile,
  e2eAccounts,
  mutableStudentAuthFile,
  studentAuthFile,
} from "./support/auth";
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

  test("admin creates one group lesson and invites multiple students", async ({ browser }) => {
    const firstStudentId = await findUserId(e2eAccounts.student.email);
    const secondStudentId = await findUserId(e2eAccounts.mutableStudent.email);
    const adminContext = await browser.newContext({ storageState: adminAuthFile });
    const secondStudentContext = await browser.newContext({ storageState: mutableStudentAuthFile });

    try {
      const startsAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const response = await adminContext.request.post(`${apiURL}/teacher/lessons`, {
        data: {
          title: `E2E group lesson ${Date.now()}`,
          studentIds: [firstStudentId, secondStudentId],
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
        },
      });
      await expect(response).toBeOK();
      const lesson = (await response.json()) as { id: string; studentCount: number };
      lessonId = lesson.id;
      expect(lesson.studentCount).toBe(2);

      const invitees = await adminContext.request.get(
        `${apiURL}/teacher/lessons/${lesson.id}/students`,
      );
      await expect(invitees).toBeOK();
      await expect(invitees.json()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ studentId: firstStudentId }),
          expect.objectContaining({ studentId: secondStudentId }),
        ]),
      );

      const secondStudentFeed = await secondStudentContext.request.get(`${apiURL}/lessons`);
      await expect(secondStudentFeed).toBeOK();
      await expect(secondStudentFeed.json()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: lesson.id, studentCount: 2 })]),
      );
    } finally {
      await Promise.all([adminContext.close(), secondStudentContext.close()]);
    }
  });

  test("admin cannot create a lesson in the past", async ({ browser }) => {
    const adminContext = await browser.newContext({ storageState: adminAuthFile });
    try {
      const startsAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const response = await adminContext.request.post(`${apiURL}/teacher/lessons`, {
        data: {
          title: `E2E invalid past lesson ${Date.now()}`,
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
        },
      });
      expect(response.status()).toBe(400);
      await expect(response.text()).resolves.toContain("lesson_starts_in_past");
    } finally {
      await adminContext.close();
    }
  });
});
