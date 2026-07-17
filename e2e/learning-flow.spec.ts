import { expect, test } from "@playwright/test";
import { adminAuthFile, e2eAccounts, studentAuthFile } from "./support/auth";
import { cleanLearningFlow, findUserId } from "./support/data";
import { expectPageHeading } from "./support/ui";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

type Lesson = { id: string; title: string };
type Submission = { id: string; status: string; teacherComment: string | null };
type ReviewQueue = {
  unlearned: Array<{ word: string; reading: string; meaning: string }>;
  stats: { totalCards: number; unlearnedCount: number };
};

test.describe("connected learning journey", () => {
  test.use({ storageState: studentAuthFile });
  test.describe.configure({ mode: "serial" });

  let lessonId: string | undefined;
  let studentId: string | undefined;

  test.afterAll(async () => {
    await cleanLearningFlow(lessonId, studentId);
  });

  test("teacher assignment through homework approval creates a review card", async ({
    browser,
    page,
  }) => {
    const assignedStudentId = await findUserId(e2eAccounts.student.email);
    studentId = assignedStudentId;

    const adminContext = await browser.newContext({ storageState: adminAuthFile });
    const adminPage = await adminContext.newPage();
    const title = `E2E learning flow ${Date.now()}`;
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    try {
      await test.step("admin creates the lesson for the student and its review card", async () => {
        const lessonResponse = await adminPage.request.post(`${apiURL}/teacher/lessons`, {
          data: {
            title,
            studentId: assignedStudentId,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        });
        await expect(lessonResponse).toBeOK();
        const lesson = (await lessonResponse.json()) as Lesson;
        lessonId = lesson.id;

        const cardResponse = await adminPage.request.post(
          `${apiURL}/teacher/lessons/${lessonId}/cards`,
          {
            data: {
              word: "勉強",
              reading: "べんきょう",
              meaning: "study",
              notes: "E2E card",
            },
          },
        );
        await expect(cardResponse).toBeOK();
      });

      await test.step("student sees the assigned lesson with no booking action", async () => {
        await page.goto("/lessons");
        const lesson = page.locator("li").filter({ hasText: title });
        await expect(lesson).toBeVisible();
        // Lessons are teacher-assigned; there is no self-serve booking button.
        await expect(lesson.getByRole("button", { name: "Записаться" })).toHaveCount(0);

        const studentsResponse = await adminPage.request.get(
          `${apiURL}/teacher/lessons/${lessonId}/students`,
        );
        await expect(studentsResponse).toBeOK();
        await expect(studentsResponse.json()).resolves.toEqual(
          expect.arrayContaining([expect.objectContaining({ studentId: assignedStudentId })]),
        );
      });

      await test.step("attendance materializes the teacher card", async () => {
        const attendanceResponse = await adminPage.request.patch(
          `${apiURL}/teacher/lessons/${lessonId}/students/${assignedStudentId}/post-lesson`,
          { data: { attendanceStatus: "attended" } },
        );
        await expect(attendanceResponse).toBeOK();

        const queueResponse = await page.request.get(`${apiURL}/review/queue`);
        await expect(queueResponse).toBeOK();
        const queue = (await queueResponse.json()) as ReviewQueue;
        expect(queue.unlearned).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ word: "勉強", reading: "べんきょう", meaning: "study" }),
          ]),
        );
        expect(queue.stats.totalCards).toBeGreaterThanOrEqual(1);
        expect(queue.stats.unlearnedCount).toBeGreaterThanOrEqual(1);
      });

      await test.step("student submits homework in the UI", async () => {
        await page.goto(`/lessons/${lessonId}`);
        await expectPageHeading(page, title);
        await page
          .getByPlaceholder("Напиши свой текст на японском…")
          .fill("毎日、日本語を勉強します。新しい言葉を覚えます。");
        await page.getByRole("button", { name: "Отправить на проверку" }).click();
        await expect(page.getByText("На проверке", { exact: true })).toBeVisible();
      });

      await test.step("admin approves the submission in the UI", async () => {
        // The lesson opens as a side panel in the workspace, not a standalone page.
        await adminPage.goto(`/teacher?lesson=${lessonId}`);
        await expect(adminPage.getByRole("heading", { name: title })).toBeVisible();
        const submission = adminPage.locator("li").filter({
          hasText: "毎日、日本語を勉強します。新しい言葉を覚えます。",
        });
        await expect(submission).toBeVisible();
        await submission
          .getByPlaceholder("Комментарий студенту (необязательно)")
          .fill("Отличная работа");
        await submission.getByRole("button", { name: "Принять" }).click();
        await expect(submission.getByText("Принято", { exact: true })).toBeVisible();

        const submissionsResponse = await adminPage.request.get(
          `${apiURL}/teacher/lessons/${lessonId}/submissions`,
        );
        await expect(submissionsResponse).toBeOK();
        const submissions = (await submissionsResponse.json()) as Submission[];
        expect(submissions[0]).toMatchObject({
          status: "approved",
          teacherComment: "Отличная работа",
        });
      });

      await test.step("student sees the approved result", async () => {
        await page.reload();
        await expect(page.getByText("Принято", { exact: true })).toBeVisible();
        await expect(page.getByText("Отличная работа", { exact: true })).toBeVisible();
      });
    } finally {
      await adminContext.close();
    }
  });
});
