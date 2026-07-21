import { expect, test } from "@playwright/test";
import { e2eAccounts, mutableStudentAuthFile } from "./support/auth";
import { deleteLead, findLead, findUserId, resetMutableStudent } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test.describe("profile", () => {
  test.use({ storageState: mutableStudentAuthFile });

  test.afterEach(async () => {
    const studentId = await findUserId(e2eAccounts.mutableStudent.email);
    await resetMutableStudent(studentId);
  });

  test("student updates profile through the UI", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: "Только необходимые" }).click();
    await page.getByLabel("Имя", { exact: true }).fill("Hanako");
    await page.getByLabel("Фамилия", { exact: true }).fill("Yamada");
    await page.getByLabel("Никнейм").fill("Hana E2E");
    await page.getByRole("button", { name: "Сохранить изменения" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Профиль сохранён", { exact: true })).toBeVisible();
    await expect(page.getByText("Hana E2E", { exact: true })).toBeVisible();
  });

  test("profile API rejects names over 200 characters", async ({ request }) => {
    const response = await request.patch(`${apiURL}/users/me`, {
      data: { name: "x".repeat(201) },
    });
    expect(response.status()).toBe(400);
  });

  test("timezone update stays in sync on the account and its lead", async ({ request }) => {
    let leadId: string | undefined;
    try {
      const created = await request.post(`${apiURL}/leads`, {
        data: {
          kind: "booking",
          name: "E2E Timezone Lead",
          email: e2eAccounts.mutableStudent.email,
          timeZone: "Europe/Moscow",
          personalDataConsent: true,
          consentVersion: "2026-07-16",
        },
      });
      leadId = ((await created.json()) as { id: string }).id;

      const updated = await request.patch(`${apiURL}/users/me`, {
        data: { timeZone: "Asia/Tokyo" },
      });
      expect(updated).toBeOK();
      await expect(updated.json()).resolves.toMatchObject({ timeZone: "Asia/Tokyo" });
      await expect(findLead(leadId)).resolves.toMatchObject({ timeZone: "Asia/Tokyo" });
    } finally {
      await deleteLead(leadId);
    }
  });
});
