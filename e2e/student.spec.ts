import { expect, test } from "@playwright/test";
import { devPassword, e2eAccounts, studentAuthFile } from "./support/auth";
import { LoginPage, expectPageHeading } from "./support/ui";

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

test("can sign in through the real login form", async ({ page }) => {
  const login = new LoginPage(page);
  await login.open();
  await login.signIn(e2eAccounts.student.email, devPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectPageHeading(page, "Твой личный кабинет");
});
