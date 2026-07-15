import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./support/auth";
import { deleteLead } from "./support/data";

const mailpitURL = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";
const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";
const webURL = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const consent = { personalDataConsent: true as const, consentVersion: "2026-07-13" as const };

type MailpitMessages = {
  messages: Array<{
    ID: string;
    Subject: string;
    To: Array<{ Address: string }>;
  }>;
};

for (const loginCase of [
  {
    label: "student",
    email: e2eAccounts.student.email,
    role: "student",
    destination: "/dashboard",
    heading: "Личный кабинет",
  },
  {
    label: "admin",
    email: e2eAccounts.admin.email,
    role: "admin",
    destination: "/teacher",
    heading: "Студенты",
  },
] as const) {
  test(`${loginCase.label} magic link opens the correct dashboard`, async ({ page, request }) => {
    const beforeMessageId = await latestMailIdOrNull(request, loginCase.email);
    const response = await request.post(`${apiURL}/auth/sign-in/magic-link`, {
      data: {
        email: loginCase.email,
        callbackURL: `${webURL}${loginCase.destination}`,
        metadata: { expectedRole: loginCase.role },
      },
      headers: { Origin: webURL },
    });
    expect(response.ok()).toBeTruthy();
    await expect
      .poll(() => latestMailIdOrNull(request, loginCase.email), { timeout: 10_000 })
      .not.toBe(beforeMessageId);

    const messageId = await latestMailId(request, loginCase.email);
    const messageResponse = await request.get(`${mailpitURL}/api/v1/message/${messageId}`);
    await expect(messageResponse).toBeOK();
    const message = (await messageResponse.json()) as { HTML: string };
    const magicLink = message.HTML.match(/href="([^"]+)"/)?.[1];
    expect(magicLink).toBeTruthy();

    await page.goto(magicLink!);
    await expect(page).toHaveURL(`${webURL}${loginCase.destination}`);
    await expect(page.getByRole("heading", { name: loginCase.heading })).toBeVisible();
  });
}

test("student signs in with a one-time email code", async ({ page, request }) => {
  const email = e2eAccounts.student.email;
  const beforeMessageId = await latestMailIdOrNull(request, email);

  await page.goto("/login");
  await page.getByLabel("Email или Telegram").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Получить код" }).click();
  await expect(page.getByLabel("Цифра кода 1")).toBeVisible();
  await expect
    .poll(() => latestMailIdOrNull(request, email), { timeout: 10_000 })
    .not.toBe(beforeMessageId);

  const messageId = await latestMailId(request, email);
  const messageResponse = await request.get(`${mailpitURL}/api/v1/message/${messageId}`);
  await expect(messageResponse).toBeOK();
  const message = (await messageResponse.json()) as { HTML: string };
  const code = message.HTML.match(/>(\d{6})</)?.[1];
  expect(code).toBeTruthy();

  await page.getByLabel("Цифра кода 1").fill(code!);
  await page.getByRole("button", { name: "Подтвердить", exact: true }).click();
  await expect(page).toHaveURL(`${webURL}/dashboard`);
  await expect(page.getByRole("heading", { name: "Личный кабинет" })).toBeVisible();
});

test("booking submission sends a confirmation email", async ({ request }) => {
  const email = `e2e-booking-mail-${Date.now()}@gojo.local`;
  const before = await mailCount(request, email);
  let leadId: string | undefined;
  try {
    const response = await request.post(`${apiURL}/leads`, {
      data: { ...consent, kind: "booking", name: "Mail Test", email },
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
        ...consent,
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

async function latestMailId(request: import("@playwright/test").APIRequestContext, email: string) {
  const messageId = await latestMailIdOrNull(request, email);
  expect(messageId).toBeTruthy();
  return messageId!;
}

async function latestMailIdOrNull(
  request: import("@playwright/test").APIRequestContext,
  email: string,
) {
  const response = await request.get(`${mailpitURL}/api/v1/messages`);
  await expect(response).toBeOK();
  const body = (await response.json()) as MailpitMessages;
  const message = body.messages.find((item) => item.To.some((to) => to.Address === email));
  return message?.ID ?? null;
}
