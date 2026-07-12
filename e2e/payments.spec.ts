import { expect, test } from "@playwright/test";
import { adminAuthFile, mutableStudentAuthFile } from "./support/auth";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test("payment plans are public", async ({ request }) => {
  const response = await request.get(`${apiURL}/payments/plans`);
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "monthly-standard", currency: "RUB" }),
      expect.objectContaining({ id: "bundle-8", lessonCredits: 8 }),
    ]),
  );
});

test("payment account details require authentication", async ({ request }) => {
  const response = await request.get(`${apiURL}/payments/me`);
  expect(response.status()).toBe(401);
});

test.describe("student checkout", () => {
  test.use({ storageState: mutableStudentAuthFile });

  test("reports unavailable payment configuration", async ({ request }) => {
    const response = await request.post(`${apiURL}/payments/checkout`, {
      data: { planId: "monthly-standard" },
    });
    expect(response.status()).toBe(503);
  });
});

test("admin cannot create a student payment", async ({ playwright }) => {
  const admin = await playwright.request.newContext({ storageState: adminAuthFile });
  try {
    const response = await admin.post(`${apiURL}/payments/checkout`, {
      data: { planId: "monthly-standard" },
    });
    expect(response.status()).toBe(403);
  } finally {
    await admin.dispose();
  }
});
