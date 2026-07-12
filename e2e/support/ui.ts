import { type Page, expect } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/login");
    await expect(this.page.getByRole("heading", { name: "Войти" })).toBeVisible();
  }

  async signIn(email: string, password: string) {
    const form = this.page.locator("main form");
    await form.getByLabel("Email").fill(email);
    await form.getByLabel("Пароль").fill(password);
    await form.getByRole("button", { name: "Войти" }).click();
  }
}

export async function expectPageHeading(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible();
}
