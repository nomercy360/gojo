import { expect, test } from "@playwright/test";
import { e2eAccounts, mutableStudentAuthFile } from "./support/auth";
import { deleteLead } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test("guest creates a booking lead", async ({ request }) => {
  let leadId: string | undefined;
  try {
    const response = await request.post(`${apiURL}/leads`, {
      data: {
        kind: "booking",
        name: "E2E Lead",
        email: `e2e-lead-${Date.now()}@gojo.local`,
        contact: "@e2e",
      },
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { ok: boolean; id: string };
    expect(body.ok).toBe(true);
    leadId = body.id;
  } finally {
    await deleteLead(leadId);
  }
});

test.describe("lead linking", () => {
  test.use({ storageState: mutableStudentAuthFile });

  test("student links a matching guest lead", async ({ request }) => {
    let leadId: string | undefined;
    try {
      const created = await request.post(`${apiURL}/leads`, {
        data: {
          kind: "booking",
          name: "E2E Linked Lead",
          email: e2eAccounts.mutableStudent.email,
        },
      });
      leadId = ((await created.json()) as { id: string }).id;

      const linked = await request.post(`${apiURL}/leads/link-current`);
      await expect(linked).toBeOK();
      await expect(linked.json()).resolves.toMatchObject({ ok: true, linked: 1 });
    } finally {
      await deleteLead(leadId);
    }
  });
});
