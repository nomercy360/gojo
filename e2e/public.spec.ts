import { expect, test } from "@playwright/test";

test("landing page is available", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Gojo Learn/i);
  await expect(page.locator("h1")).toBeVisible();
});

test("guest is redirected away from protected pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Войти" })).toBeVisible();
});

test("API health and authorization boundary respond correctly", async ({ request }) => {
  const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";
  const health = await request.get(`${apiURL}/health`);
  await expect(health).toBeOK();
  await expect(health.json()).resolves.toMatchObject({ ok: true, service: "gojo-api" });

  const me = await request.get(`${apiURL}/dev-auth/me`);
  expect(me.status()).toBe(401);
});
