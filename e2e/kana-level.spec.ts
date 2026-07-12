import { expect, test } from "@playwright/test";

test.describe("public learning funnels", () => {
  test("level check sends a complete beginner to the kana trainer", async ({ page }) => {
    await page.goto("/onboarding/quiz");

    await expect(page.getByRole("heading", { name: "С чего начинаешь?" })).toBeVisible();
    await page.getByRole("button", { name: /Совсем с нуля/ }).click();
    await expect(page.getByRole("heading", { name: "Тест тебе пока не нужен." })).toBeVisible();

    await page.getByRole("link", { name: /Начать с каны/ }).click();
    await expect(page).toHaveURL(/\/kana$/);
    await expect(page.getByText("Хирагана · ряд «А» · 1/5")).toBeVisible();
    await expect(page.getByText("Прописная «а» с антенной на макушке.")).toBeVisible();
  });

  test("level check completes its declare, calibrate, and result steps", async ({ page }) => {
    await page.goto("/onboarding/quiz");
    await page.getByRole("button", { name: /База есть/ }).click();
    await expect(page.getByText("Шаг 2 из 3")).toBeVisible();

    for (let answered = 0; answered < 30; answered += 1) {
      if (await page.getByText("Шаг 3 из 3 · результат").isVisible()) break;
      await page.keyboard.press("1");
    }

    await expect(page.getByText("Шаг 3 из 3 · результат")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Твой старт — уровень N[1-5]/ })).toBeVisible();
    await expect(page.getByText("Твоя карта")).toBeVisible();
    await expect(page.getByText("Твоя карта")).toBeVisible();
  });

  test("zero demonstrated knowledge places below N5, never at it", async ({ page }) => {
    await page.goto("/onboarding/quiz");
    await page.getByRole("button", { name: /Совсем с нуля/ }).click();
    await page.getByRole("button", { name: "Всё равно пройти тест" }).click();

    // declared "совсем с нуля" serves the full 8-question bank — skip them all
    for (let skipped = 0; skipped < 8; skipped += 1) {
      await expect(page.getByText(`вопрос ${skipped + 1} / 8`)).toBeVisible();
      await page.getByRole("button", { name: "Не знаю — пропустить" }).click();
    }

    await expect(page.getByText("Шаг 3 из 3 · результат")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Недостаточно ответов для оценки" }),
    ).toBeVisible();
    // exactly one entry point on the map — kana, since nothing was demonstrated
    await expect(page.getByText("начнём отсюда")).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Начать с каны/ })).toBeVisible();
  });

  test("N4 declaration with every question skipped is not presented as a level", async ({
    page,
  }) => {
    await page.goto("/onboarding/quiz");
    await page.getByRole("button", { name: /Средний и выше/ }).click();

    for (let skipped = 0; skipped < 8; skipped += 1) {
      await page.getByRole("button", { name: "Не знаю — пропустить" }).click();
    }

    await expect(
      page.getByRole("heading", { name: "Недостаточно ответов для оценки" }),
    ).toBeVisible();
    await expect(page.getByText(/Ориентир со слов: N4/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Твой старт — уровень/ })).toHaveCount(0);
  });

  test("returning kana learner sees the compact map and booking handoff", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "gojo:kana-progress",
        JSON.stringify({
          learned: {
            hiragana: ["あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ"],
            katakana: [],
          },
          shownWords: [],
          wallShown: false,
        }),
      );
    });

    await page.goto("/kana");
    await expect(page.getByText(/10 из 46 · хирагана/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Следующий ряд: «СА»/ })).toBeVisible();

    await page.getByRole("button", { name: "Обсудить прогресс с преподавателем" }).click();
    await expect(page.getByRole("heading", { name: /Попробуй японский/ })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
