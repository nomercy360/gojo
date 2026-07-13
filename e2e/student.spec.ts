import { expect, test } from "@playwright/test";
import { e2eAccounts, studentAuthFile } from "./support/auth";
import { expectPageHeading } from "./support/ui";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test.describe("student", () => {
  test.use({ storageState: studentAuthFile });

  test("can open the dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expectPageHeading(page, "Твой личный кабинет");
    await expect(page.getByText(e2eAccounts.student.nickname, { exact: true })).toBeVisible();
  });

  test("cannot open the teacher area", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test("passwordless session opens the dashboard in a real browser", async ({ page }) => {
  // Auth is passwordless (Telegram / magic link); dev-login is the supported
  // way to establish a session in tests. Drive it through the browser context
  // so the session cookie is exercised end-to-end, then load the dashboard.
  const res = await page.request.post(`${apiURL}/dev-auth/dev-login`, {
    data: e2eAccounts.student,
  });
  expect(res.ok()).toBeTruthy();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectPageHeading(page, "Твой личный кабинет");
});
