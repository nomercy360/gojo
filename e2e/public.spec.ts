import { expect, test } from "@playwright/test";

test("landing page is available", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Gojo Learn/i);
  await expect(page.locator("h1")).toBeVisible();
});

test("landing kana preview teaches both signs before revealing the word", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.locator("nav").getByRole("button", { name: "Бесплатный первый урок" }),
  ).toBeVisible();
  await expect(page.getByText("Знак 1 из 2")).toBeVisible();
  await expect(page.locator(".hero-kana-payoff")).toBeHidden();
  const initialCard = await page.locator(".hero-kana-card").boundingBox();

  await page.getByRole("button", { name: "su", exact: true }).click();
  await expect(page.getByText(/Верно — す читается su/)).toBeVisible();
  await expect(page.getByText("Знак 1 из 2")).toBeVisible();

  await page.getByRole("button", { name: "Следующий знак" }).click();
  await expect(page.getByText("Знак 2 из 2")).toBeVisible();
  await expect(page.locator(".hero-kana-symbol")).toHaveText("し");

  await page.getByRole("button", { name: "shi", exact: true }).click();
  await expect(page.getByText("Слово прочитано", { exact: true })).toBeVisible();
  await expect(page.getByText(/すし = суши/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Продолжить урок" })).toHaveAttribute(
    "href",
    "/kana",
  );

  const completedCard = await page.locator(".hero-kana-card").boundingBox();
  expect(Math.abs((completedCard?.height ?? 0) - (initialCard?.height ?? 0))).toBeLessThan(1);
});

test("analytics choice can be changed from the privacy page", async ({ page }) => {
  await page.goto("/privacy");
  await page.getByRole("button", { name: "Только необходимые" }).click();

  await page.getByRole("button", { name: "Настроить аналитику" }).click();
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: "Разрешить аналитику" }).click(),
  ]);
  await page.evaluate(() => localStorage.setItem("gojo:anon-id", "review-test-id"));

  await page.getByRole("button", { name: "Настроить аналитику" }).click();
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: "Только необходимые" }).click(),
  ]);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        consent: localStorage.getItem("gojo:analytics-consent"),
        anonymousId: localStorage.getItem("gojo:anon-id"),
      })),
    )
    .toEqual({ consent: "declined", anonymousId: null });
});

test("guest is redirected away from protected pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Вход для студента" })).toBeVisible();
});

test("student and admin have separate invite-only login screens", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Вход для студента" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", {
      name: "Войти",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByText("Впервые здесь?")).toHaveCount(0);
  await expect(page.getByText(/согласие на обработку персональных данных/i)).toHaveCount(0);

  await page.getByRole("link", { name: "Войти в панель" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Вход для администратора" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", {
      name: "Войти",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Войти через Telegram" })).toHaveCount(0);
  await expect(page.getByText("Впервые здесь?")).toHaveCount(0);
});

test("API health and authorization boundary respond correctly", async ({ request }) => {
  const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";
  const health = await request.get(`${apiURL}/health`);
  await expect(health).toBeOK();
  await expect(health.json()).resolves.toMatchObject({ ok: true, service: "gojo-api" });

  const me = await request.get(`${apiURL}/dev-auth/me`);
  expect(me.status()).toBe(401);
});
