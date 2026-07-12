import { expect, test } from "@playwright/test";
import { e2eAccounts, mutableStudentAuthFile, studentAuthFile } from "./support/auth";
import { deletePersonalEvent } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test("personal events require authentication", async ({ playwright }) => {
  const guest = await playwright.request.newContext();
  try {
    const response = await guest.get(`${apiURL}/personal-events`);
    expect(response.status()).toBe(401);
  } finally {
    await guest.dispose();
  }
});

test.describe("personal events", () => {
  test.use({ storageState: mutableStudentAuthFile });

  let eventId: string | undefined;
  test.afterEach(async () => deletePersonalEvent(eventId));

  test("student creates, lists, and deletes an event", async ({ request }) => {
    const title = `E2E practice ${Date.now()}`;
    const created = await request.post(`${apiURL}/personal-events`, {
      data: {
        title,
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 25,
      },
    });
    expect(created.status()).toBe(201);
    eventId = ((await created.json()) as { id: string }).id;

    const listed = await request.get(`${apiURL}/personal-events`);
    await expect(listed.json()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: eventId, title, durationMinutes: 25 }),
      ]),
    );

    const deleted = await request.delete(`${apiURL}/personal-events/${eventId}`);
    await expect(deleted).toBeOK();
    eventId = undefined;
  });

  test("student cannot delete another student's event", async ({ playwright, request }) => {
    const owner = await playwright.request.newContext({ storageState: studentAuthFile });
    try {
      const created = await owner.post(`${apiURL}/personal-events`, {
        data: {
          title: `E2E owned event ${Date.now()}`,
          startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 15,
        },
      });
      expect(created.status()).toBe(201);
      eventId = ((await created.json()) as { id: string }).id;

      const forbidden = await request.delete(`${apiURL}/personal-events/${eventId}`);
      expect(forbidden.status()).toBe(404);
      expect(e2eAccounts.student.email).not.toBe(e2eAccounts.mutableStudent.email);
    } finally {
      await owner.dispose();
    }
  });
});
