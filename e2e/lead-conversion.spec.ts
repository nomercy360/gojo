import { expect, test } from "@playwright/test";
import { adminAuthFile, e2eAccounts } from "./support/auth";
import {
  cleanLeadConversionFixture,
  createLeadConversionFixture,
  findUserId,
  getLeadConversion,
  resetMutableStudent,
} from "./support/data";

test.describe("lead conversion", () => {
  test.use({ storageState: adminAuthFile });

  test("creates an unpaid student and relinks the trial lesson", async ({ page }) => {
    const teacherId = await findUserId(e2eAccounts.admin.email);
    const email = `converted-${Date.now()}@example.com`;
    const fixture = await createLeadConversionFixture({
      teacherId,
      email,
      name: "E2E Converted Lead",
      goal: "Подготовиться к поездке",
      level: "N5",
    });
    let studentId: string | undefined;

    try {
      await page.goto("/teacher?collection=leads");
      await page.getByPlaceholder("Поиск по имени, контакту или цели").fill(email);
      await page.locator("tbody tr").filter({ hasText: email }).getByRole("button").first().click();

      let dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Конвертировать в студента" }).click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Конвертация заявки" })).toBeVisible();
      await expect(dialog.getByLabel("Имя")).toHaveValue("E2E Converted Lead");
      await expect(dialog.getByLabel(/Email/)).toHaveValue(email);
      await expect(dialog.getByLabel("Ориентир из заявки / квиза")).toHaveValue("N5");
      await expect(dialog.getByLabel("Тариф")).toHaveValue("");

      await dialog.getByLabel("JLPT по итогам пробного урока").selectOption("N5");
      await dialog.getByRole("button", { name: "Конвертировать в студента" }).click();
      await expect(page.getByText("Заявка конвертирована — пробный урок привязан")).toBeVisible();

      await expect
        .poll(async () => {
          const result = await getLeadConversion(fixture.leadId);
          studentId = result.student?.id;
          return {
            status: result.lead?.status,
            studentId: result.lead?.studentId,
            sourceLeadId: result.student?.sourceLeadId,
            jlptLevel: result.student?.jlptLevel,
            quizLevel: result.student?.quizLevel,
            notes: result.student?.notes,
            bookingStudentId: result.booking?.studentId,
            assignedPlanId: result.access?.assignedPlanId ?? null,
            activeUntil: result.access?.activeUntil ?? null,
            lessonCredits: result.access?.lessonCredits,
            trialUsed: result.access?.trialUsed,
          };
        })
        .toEqual({
          status: "converted",
          studentId: expect.any(String),
          sourceLeadId: fixture.leadId,
          jlptLevel: "N5",
          quizLevel: "N5",
          notes: "Цель: Подготовиться к поездке",
          bookingStudentId: expect.any(String),
          assignedPlanId: null,
          activeUntil: null,
          lessonCredits: 0,
          trialUsed: true,
        });
    } finally {
      await cleanLeadConversionFixture({ ...fixture, studentId });
    }
  });

  test("offers to link an existing student instead of creating a duplicate", async ({ page }) => {
    const teacherId = await findUserId(e2eAccounts.admin.email);
    const existingStudentId = await findUserId(e2eAccounts.mutableStudent.email);
    await resetMutableStudent(existingStudentId);
    const fixture = await createLeadConversionFixture({
      teacherId,
      email: e2eAccounts.mutableStudent.email,
      name: "E2E Duplicate Lead",
    });

    try {
      await page.goto("/teacher?collection=leads");
      await page
        .getByPlaceholder("Поиск по имени, контакту или цели")
        .fill(e2eAccounts.mutableStudent.email);
      await page
        .locator("tbody tr")
        .filter({ hasText: "E2E Duplicate Lead" })
        .getByRole("button")
        .first()
        .click();

      let dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Конвертировать в студента" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("JLPT по итогам пробного урока").selectOption("N4");
      await dialog.getByRole("button", { name: "Конвертировать в студента" }).click();

      await expect(dialog.getByText("Студент с таким контактом уже существует")).toBeVisible();
      await dialog
        .getByRole("button", { name: new RegExp(e2eAccounts.mutableStudent.email) })
        .click();
      await expect(page.getByText("Заявка конвертирована — пробный урок привязан")).toBeVisible();

      const result = await getLeadConversion(fixture.leadId);
      expect(result.lead?.studentId).toBe(existingStudentId);
      expect(result.booking?.studentId).toBe(existingStudentId);
    } finally {
      await cleanLeadConversionFixture(fixture);
      await resetMutableStudent(existingStudentId);
    }
  });
});
