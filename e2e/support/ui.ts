import { type Page, expect } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/login");
    await expect(this.page.getByRole("heading", { name: "Вход для студента" })).toBeVisible();
  }

  // Auth is passwordless. Request a one-time code by email.
  async requestCode(email: string) {
    const form = this.page.locator("main form");
    await form.getByLabel("Email или Telegram").fill(email);
    await form.getByRole("button", { name: "Получить код" }).click();
  }
}

export async function expectPageHeading(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible();
}
