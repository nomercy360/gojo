import { expect, test } from "@playwright/test";
import { e2eAccounts, mutableStudentAuthFile } from "./support/auth";
import { deleteLead, findLead, findUserId, setTrialUsed } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

test("guest creates a booking lead", async ({ request }) => {
  let leadId: string | undefined;
  try {
    const response = await request.post(`${apiURL}/leads`, {
      data: {
        kind: "booking",
        name: "Максуд",
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

test("repeated active booking submission updates one lead", async ({ request }) => {
  const email = `e2e-dedup-${Date.now()}@gojo.local`;
  let leadId: string | undefined;
  try {
    const first = await request.post(`${apiURL}/leads`, {
      data: { kind: "booking", name: "First name", email },
    });
    expect(first.status()).toBe(201);
    leadId = ((await first.json()) as { id: string }).id;

    const repeated = await request.post(`${apiURL}/leads`, {
      data: { kind: "booking", name: "Updated name", email: email.toUpperCase() },
    });
    expect(repeated.status()).toBe(200);
    await expect(repeated.json()).resolves.toMatchObject({ id: leadId, alreadyExists: true });
    await expect(findLead(leadId)).resolves.toMatchObject({ name: "First name", email });
  } finally {
    await deleteLead(leadId);
  }
});

test.describe("lead linking", () => {
  test.use({ storageState: mutableStudentAuthFile });

  test("student links a matching guest lead", async ({ request }) => {
    let leadId: string | undefined;
    try {
      const studentId = await findUserId(e2eAccounts.mutableStudent.email);
      const created = await request.post(`${apiURL}/leads`, {
        data: {
          kind: "booking",
          name: "E2E Linked Lead",
          email: e2eAccounts.mutableStudent.email,
        },
      });
      leadId = ((await created.json()) as { id: string }).id;
      await expect(findLead(leadId)).resolves.toMatchObject({ userId: studentId });

      const linked = await request.post(`${apiURL}/leads/link-current`);
      await expect(linked).toBeOK();
      await expect(linked.json()).resolves.toMatchObject({ ok: true, linked: 0 });
    } finally {
      await deleteLead(leadId);
    }
  });

  test("does not create another free-lesson lead after trial was used", async ({ request }) => {
    const studentId = await findUserId(e2eAccounts.mutableStudent.email);
    await setTrialUsed(studentId, true);
    try {
      const response = await request.post(`${apiURL}/leads`, {
        data: {
          kind: "booking",
          name: "Existing Student",
          email: e2eAccounts.mutableStudent.email,
        },
      });
      expect(response.status()).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        alreadyExists: true,
        reason: "account_has_trial",
      });
    } finally {
      await setTrialUsed(studentId, false);
    }
  });
});
