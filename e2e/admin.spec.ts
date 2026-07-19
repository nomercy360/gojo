import { expect, test } from "@playwright/test";
import { adminAuthFile, e2eAccounts, mutableStudentAuthFile } from "./support/auth";
import { findUserId, getStudentAccess, resetMutableStudent } from "./support/data";
import { expectPageHeading } from "./support/ui";

const webURL = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test.describe("admin", () => {
  test.use({ storageState: adminAuthFile });

  test("opens the teacher dashboard", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/teacher$/);
    // /teacher lands on the triage home; collections open from the sidebar.
    await expect(page.getByRole("heading", { name: /Сегодня/ })).toBeVisible();
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("button", { name: "Уроки" })).toBeVisible();
    await expect(page.locator("body > header")).toHaveCount(0);
    await sidebar.getByRole("button", { name: "Студенты" }).click();
    await expectPageHeading(page, "Студенты");

    await page.getByRole("button", { name: e2eAccounts.admin.email }).click();
    await expect(page.getByRole("menuitem", { name: "Управлять администраторами" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Выйти" })).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page.getByRole("button", { name: "Новый студент" })).toHaveCount(0);
    const directProvision = await page.request.post(`${apiURL}/teacher/students`, {
      data: {
        email: `forbidden-${Date.now()}@example.com`,
        name: "Forbidden Direct Student",
        planId: "group-8",
        activeUntil: null,
        lessonCredits: 8,
      },
    });
    expect(directProvision.status()).toBe(404);

    await page.goto("/teacher/students/new");
    await expect(page).toHaveURL(/collection=leads/);

    await sidebar.getByRole("button", { name: "Уроки" }).click();
    await expectPageHeading(page, "Уроки");
    await expect(page.getByRole("button", { name: "Новый урок" })).toBeVisible();
    await page.locator("tbody tr").first().getByRole("button").first().click();
    const lessonDialog = page.getByRole("dialog");
    await expect(lessonDialog.getByRole("button", { name: "Сохранить изменения" })).toBeVisible();
    await expect(lessonDialog.getByRole("link", { name: "Управлять" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await sidebar.getByRole("button", { name: "Заявки" }).click();
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
    await expect(dialog.getByLabel("Уровень квиза")).toHaveCount(0);
    await expect(dialog.getByText("Квиз · онбординг", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Учебный уровень", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel(/Уровень программы/)).toBeVisible();
    await expect(dialog.getByLabel("Тариф")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Полный профиль" })).toHaveCount(0);
  });

  test("grants monthly or lesson-package access without a payment", async ({ page, browser }) => {
    const studentId = await findUserId(e2eAccounts.mutableStudent.email);
    await resetMutableStudent(studentId);

    try {
      await page.goto("/teacher?collection=students");
      const search = page.getByPlaceholder("Поиск по имени, email или уровню");
      await search.fill(e2eAccounts.mutableStudent.email);
      let row = page.locator("tbody tr").filter({ hasText: e2eAccounts.mutableStudent.email });
      await row.getByRole("button").first().click();

      let dialog = page.getByRole("dialog");
      const plan = dialog.getByLabel("Тариф и доступ");
      await plan.selectOption("recorded-30");
      const accessEnd = dialog.getByLabel("Доступ до (включительно)");
      await expect(accessEnd).toBeVisible();
      const futureDate = await page.evaluate(() => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
      });
      await accessEnd.fill(futureDate);
      await dialog.getByRole("button", { name: "Сохранить студента" }).click();
      await expect(page.getByText("Студент сохранён")).toBeVisible();
      await expect(dialog).toBeHidden();

      await expect
        .poll(async () => {
          const access = await getStudentAccess(studentId);
          return {
            plan: access?.assignedPlanId,
            active: Boolean(access?.activeUntil && access.activeUntil.getTime() > Date.now()),
            credits: access?.lessonCredits,
          };
        })
        .toEqual({ plan: "recorded-30", active: true, credits: 0 });

      const studentContext = await browser.newContext({ storageState: mutableStudentAuthFile });
      try {
        const studentPage = await studentContext.newPage();
        await studentPage.goto("/dashboard");
        await expect(studentPage.getByText("Первые шаги", { exact: true })).toHaveCount(0);
        await expect(studentPage.getByText("Активен", { exact: true })).toBeVisible();
      } finally {
        await studentContext.close();
      }

      await search.fill(e2eAccounts.mutableStudent.email);
      row = page.locator("tbody tr").filter({ hasText: e2eAccounts.mutableStudent.email });
      await row.getByRole("button").first().click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("Тариф и доступ").selectOption("group-8");
      const credits = dialog.getByLabel("Осталось уроков");
      await expect(credits).toHaveValue("8");
      await dialog.getByRole("button", { name: "Сохранить студента" }).click();
      await expect(page.getByText("Студент сохранён")).toBeVisible();
      await expect(dialog).toBeHidden();

      await expect
        .poll(async () => {
          const access = await getStudentAccess(studentId);
          return {
            plan: access?.assignedPlanId,
            activeUntil: access?.activeUntil ?? null,
            credits: access?.lessonCredits,
          };
        })
        .toEqual({ plan: "group-8", activeUntil: null, credits: 8 });
    } finally {
      await resetMutableStudent(studentId);
    }
  });

  test("rejects a past local lesson time without resetting the form", async ({ page }) => {
    await page.goto("/teacher?collection=lessons");
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
