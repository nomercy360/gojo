import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./support/auth";
import { deleteLead } from "./support/data";

const mailpitURL = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";
const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";
const webURL = process.env.E2E_WEB_URL ?? "http://localhost:3000";

type MailpitMessages = {
  messages: Array<{
    ID: string;
    Subject: string;
    To: Array<{ Address: string }>;
  }>;
};

test("magic-link sign-in sends an email through Mailpit", async ({ request }) => {
  const email = e2eAccounts.mutableStudent.email;
  const before = await mailCount(request, email);

  const response = await request.post(`${apiURL}/auth/sign-in/magic-link`, {
    data: { email, callbackURL: "/dashboard" },
    headers: { Origin: webURL },
  });
  expect(response.ok()).toBeTruthy();

  await expect.poll(() => mailCount(request, email), { timeout: 10_000 }).toBeGreaterThan(before);
});

test("booking submission sends a confirmation email", async ({ request }) => {
  const email = `e2e-booking-mail-${Date.now()}@gojo.local`;
  const before = await mailCount(request, email);
  let leadId: string | undefined;
  try {
    const response = await request.post(`${apiURL}/leads`, {
      data: { kind: "booking", name: "Mail Test", email },
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { id: string; emailSent: boolean };
    leadId = body.id;
    expect(body.emailSent).toBe(true);
    await expect.poll(() => mailCount(request, email)).toBeGreaterThan(before);
  } finally {
    await deleteLead(leadId);
  }
});

test("quiz analysis is delivered without requiring a phone", async ({ request }) => {
  const email = `e2e-quiz-mail-${Date.now()}@gojo.local`;
  const before = await mailCount(request, email);
  let leadId: string | undefined;
  try {
    const questionsResponse = await request.get(`${apiURL}/onboarding/quiz/questions`);
    const questions = (await questionsResponse.json()) as Array<{ id: string }>;
    const response = await request.post(`${apiURL}/onboarding/quiz/lead`, {
      data: {
        name: "Quiz Mail Test",
        email,
        declared: "kana",
        answers: questions.map((question) => ({ questionId: question.id, choiceIndex: 0 })),
      },
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { leadId: string; emailSent: boolean };
    leadId = body.leadId;
    expect(body.emailSent).toBe(true);
    await expect.poll(() => mailCount(request, email)).toBeGreaterThan(before);
  } finally {
    await deleteLead(leadId);
  }
});

async function mailCount(request: import("@playwright/test").APIRequestContext, email: string) {
  const response = await request.get(`${mailpitURL}/api/v1/messages`);
  await expect(response).toBeOK();
  const body = (await response.json()) as MailpitMessages;
  return body.messages.filter((message) => message.To.some((to) => to.Address === email)).length;
}
