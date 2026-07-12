import { expect, test } from "@playwright/test";
import { e2eAccounts } from "./support/auth";
import { expectPageHeading } from "./support/ui";

const mailpitURL = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";

type MailpitMessages = {
  messages: Array<{
    ID: string;
    Subject: string;
    To: Array<{ Address: string }>;
  }>;
};

test("reset-password page rejects a missing token", async ({ page }) => {
  await page.goto("/reset-password");
  await expectPageHeading(page, "Новый пароль");
  await expect(page.getByText(/Ссылка недействительна или устарела/)).toBeVisible();
});

test("forgot-password sends an email through Mailpit", async ({ page, request }) => {
  const before = await mailCount(request, e2eAccounts.mutableStudent.email);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(e2eAccounts.mutableStudent.email);
  await page.getByRole("button", { name: "Отправить ссылку" }).click();
  await expect(page.getByText(/мы отправили на него ссылку/)).toBeVisible();

  await expect
    .poll(() => mailCount(request, e2eAccounts.mutableStudent.email), { timeout: 10_000 })
    .toBeGreaterThan(before);
});

async function mailCount(request: import("@playwright/test").APIRequestContext, email: string) {
  const response = await request.get(`${mailpitURL}/api/v1/messages`);
  await expect(response).toBeOK();
  const body = (await response.json()) as MailpitMessages;
  return body.messages.filter((message) => message.To.some((to) => to.Address === email)).length;
}
