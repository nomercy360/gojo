import { expect, test } from "@playwright/test";
import { e2eAccounts, studentAuthFile } from "./support/auth";
import { expectPageHeading } from "./support/ui";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test.describe("student", () => {
  test.use({ storageState: studentAuthFile });

  test("can open the dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expectPageHeading(page, "Личный кабинет");
    await expect(page.getByText("Первые шаги", { exact: true })).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "Основная навигация" });
    await expect(navigation.getByRole("link", { name: "Кабинет" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(navigation.getByRole("link", { name: "Оплата" })).toHaveAttribute(
      "href",
      "/payments",
    );
    await expect(navigation.getByRole("button", { name: "Выйти" })).toBeVisible();
  });

  test("cannot open the teacher area", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("shows aligned payment choices without an empty status summary", async ({ page }) => {
    await page.goto("/payments");
    await expectPageHeading(page, "Доступ к занятиям");

    const main = page.locator("main");
    await expect(main.getByText("Оплата", { exact: true })).toHaveCount(0);
    await expect(main.getByText("Текущий статус", { exact: true })).toHaveCount(0);
    await expect(main.getByText("История платежей", { exact: true })).toHaveCount(0);

    const checkoutButtons = main.getByRole("button", { name: "Оплатить через ЮKassa" });
    await expect(checkoutButtons).toHaveCount(2);
    const positions = await checkoutButtons.evaluateAll((buttons) =>
      buttons.map((button) => {
        const price = button.parentElement?.firstElementChild;
        return {
          buttonTop: button.getBoundingClientRect().top,
          priceTop: price?.getBoundingClientRect().top ?? -1,
        };
      }),
    );
    expect(Math.abs(positions[0]!.buttonTop - positions[1]!.buttonTop)).toBeLessThan(1);
    expect(Math.abs(positions[0]!.priceTop - positions[1]!.priceTop)).toBeLessThan(1);
  });
});

test("passwordless session opens the dashboard in a real browser", async ({ page }) => {
  // Auth is passwordless; dev-login is the supported
  // way to establish a session in tests. Drive it through the browser context
  // so the session cookie is exercised end-to-end, then load the dashboard.
  const res = await page.request.post(`${apiURL}/dev-auth/dev-login`, {
    data: e2eAccounts.student,
  });
  expect(res.ok()).toBeTruthy();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectPageHeading(page, "Личный кабинет");
});
