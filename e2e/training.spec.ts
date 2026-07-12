import { expect, test } from "@playwright/test";
import { e2eAccounts, mutableStudentAuthFile } from "./support/auth";
import { findUserId, resetTraining } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test.describe("training tracking", () => {
  test.use({ storageState: mutableStudentAuthFile });

  test.beforeEach(async () => resetTraining(await findUserId(e2eAccounts.mutableStudent.email)));
  test.afterEach(async () => resetTraining(await findUserId(e2eAccounts.mutableStudent.email)));

  test("accumulates bounded activity time", async ({ request }) => {
    const first = await request.post(`${apiURL}/training/track`, {
      data: { activity: "kana", seconds: 30 },
    });
    await expect(first).toBeOK();
    const second = await request.post(`${apiURL}/training/track`, {
      data: { activity: "review", seconds: 20 },
    });
    await expect(second).toBeOK();

    const totals = await request.get(`${apiURL}/training/me`);
    await expect(totals.json()).resolves.toEqual({
      reviewSeconds: 20,
      kanaSeconds: 30,
      kanjiSeconds: 0,
      totalSeconds: 50,
    });
  });

  test("rejects heartbeat intervals over 60 seconds", async ({ request }) => {
    const response = await request.post(`${apiURL}/training/track`, {
      data: { activity: "review", seconds: 61 },
    });
    expect(response.status()).toBe(400);
  });
});
