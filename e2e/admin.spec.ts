import { expect, test } from "@playwright/test";
import { adminAuthFile, e2eAccounts } from "./support/auth";
import { expectPageHeading } from "./support/ui";

const webURL = process.env.E2E_WEB_URL ?? "http://localhost:3000";

test.describe("admin", () => {
  test.use({ storageState: adminAuthFile });

  test("opens the teacher dashboard", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/teacher$/);
    await expectPageHeading(page, "Студенты");
    await expect(page.getByRole("button", { name: "Уроки" })).toBeVisible();
    await expect(page.locator("body > header")).toHaveCount(0);

    await page.getByRole("button", { name: e2eAccounts.admin.email }).click();
    await expect(
      page.getByRole("menuitem", { name: "Управлять администраторами" }),
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Выйти" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Новый студент" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Новый студент" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Уроки" }).click();
    await expectPageHeading(page, "Уроки");
    await expect(page.getByRole("button", { name: "Новый урок" })).toBeVisible();

    await page.getByRole("button", { name: "Заявки" }).click();
    await expectPageHeading(page, "Заявки");
    await expect(page).toHaveURL(/collection=leads/);
    await page.reload();
    await expectPageHeading(page, "Заявки");
  });

  test("is routed from the student dashboard to the teacher area", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/teacher$/);
  });

  test("redirects an anonymous visitor away from every teacher collection", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    await context.clearCookies();
    const guestPage = await context.newPage();
    try {
      await guestPage.goto(`${webURL}/teacher?collection=leads`);
      await expect(guestPage).toHaveURL(/\/admin\/login$/);
    } finally {
      await context.close();
    }
  });

  test("edits admins and students inside workspace side panels", async ({ page }) => {
    await page.goto("/teacher");

    await page.getByRole("button", { name: "Администраторы" }).click();
    await expectPageHeading(page, "Администраторы");
    const adminRow = page.locator("tbody tr").first();
    await adminRow.getByRole("button").first().click();

    let dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Единая роль администратора и преподавателя/)).toBeVisible();
    await expect(dialog.getByLabel("Имя", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Отображаемое имя")).toBeVisible();
    await expect(dialog.getByLabel("Email")).toBeVisible();
    await expect(dialog.getByLabel(/Аватар/)).toBeVisible();
    await expect(dialog.getByLabel("Telegram ID")).toBeVisible();
    await dialog.getByRole("button", { name: "Сохранить администратора" }).click();
    await expect(page.getByText("Администратор сохранён")).toBeVisible();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Студенты" }).click();
    await page.locator("tbody tr").first().getByRole("button").first().click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Имя", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Отображаемое имя")).toBeVisible();
    await expect(dialog.getByLabel("Email")).toBeVisible();
    await expect(dialog.getByLabel(/Аватар/)).toBeVisible();
    await expect(dialog.getByLabel("Telegram ID")).toBeVisible();
    await expect(dialog.getByLabel("JLPT")).toBeVisible();
    await expect(dialog.getByLabel("Уровень квиза")).toBeVisible();
    await expect(dialog.getByLabel(/Уровень программы/)).toBeVisible();
    await expect(dialog.getByLabel("Тариф")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Полный профиль" })).toHaveCount(0);
  });

  test("rejects a past local lesson time without resetting the form", async ({ page }) => {
    await page.goto("/teacher");
    await page.getByRole("button", { name: "Уроки" }).click();
    await page.getByRole("button", { name: "Новый урок" }).click();

    const dialog = page.getByRole("dialog");
    const firstStudent = dialog.getByRole("checkbox").first();
    const today = await page.evaluate(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });

    await firstStudent.check();
    await dialog.getByLabel("Название").fill("Форма не должна сброситься");
    await dialog.getByLabel("Дата").fill(today);
    await dialog.getByLabel("Время").fill("00:01");
    await dialog.getByLabel("Мин").selectOption("90");
    await dialog.getByLabel(/Ссылка на встречу/).fill("https://meet.google.com/test-room");
    await dialog.getByRole("button", { name: "Создать урок" }).click();

    await expect(dialog.getByText("Урок нельзя создать в прошлом")).toBeVisible();
    await expect(dialog.getByText(/Время в часовом поясе браузера:/)).toBeVisible();
    await expect(firstStudent).toBeChecked();
    await expect(dialog.getByLabel("Название")).toHaveValue("Форма не должна сброситься");
    await expect(dialog.getByLabel("Дата")).toHaveValue(today);
    await expect(dialog.getByLabel("Время")).toHaveValue("00:01");
    await expect(dialog.getByLabel("Мин")).toHaveValue("90");
    await expect(dialog.getByLabel(/Ссылка на встречу/)).toHaveValue(
      "https://meet.google.com/test-room",
    );
  });
});
