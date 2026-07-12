import { expect, test } from "@playwright/test";
import { adminAuthFile } from "./support/auth";
import { expectPageHeading } from "./support/ui";

test.describe("admin", () => {
  test.use({ storageState: adminAuthFile });

  test("opens the teacher dashboard", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/teacher$/);
    await expectPageHeading(page, "Мои уроки");
    await expect(page.getByRole("link", { name: /Мои студенты/ })).toBeVisible();
  });

  test("is routed from the student dashboard to the teacher area", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/teacher$/);
  });
});
