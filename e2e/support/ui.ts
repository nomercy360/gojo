import { type Page, expect } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/login");
    await expect(this.page.getByRole("heading", { name: "Вход для студента" })).toBeVisible();
  }

  // Auth is passwordless (Telegram / email magic link). Request a magic link by
  // email — the login form no longer has a password field.
  async requestMagicLink(email: string) {
    const form = this.page.locator("main form");
    await form.getByLabel("Email").fill(email);
    await form.getByRole("button", { name: /ссылк|Войти по/i }).click();
  }
}

export async function expectPageHeading(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible();
}
