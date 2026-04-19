import type { JlptLevel } from "@gojo/shared";

export type QuizQuestion = {
  id: string;
  level: JlptLevel;
  prompt: string;
  choices: string[];
  correctIndex: number;
};

/**
 * Onboarding quiz bank. Two questions per JLPT level (N5 → N2).
 * Order is fixed: client sees them in the order they ship.
 * Correct answer stays on the server — submission only sends the picked index.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "n5-1",
    level: "N5",
    prompt: "Как читается かわ?",
    choices: ["kawa", "kaba", "kowa", "gawa"],
    correctIndex: 0,
  },
  {
    id: "n5-2",
    level: "N5",
    prompt: "わたし＿にほんじんです。 (Я японец.)",
    choices: ["は", "を", "が", "に"],
    correctIndex: 0,
  },
  {
    id: "n4-1",
    level: "N4",
    prompt: "Прошедшая простая форма глагола 食べる:",
    choices: ["食べた", "食べろ", "食べない", "食べよう"],
    correctIndex: 0,
  },
  {
    id: "n4-2",
    level: "N4",
    prompt: "Конструкция 〜てから означает:",
    choices: [
      "«после того, как…»",
      "«до того, как…»",
      "«вместо того, чтобы…»",
      "«пока… (длительность)»",
    ],
    correctIndex: 0,
  },
  {
    id: "n3-1",
    level: "N3",
    prompt: "Выбери правильное использование 〜ように (намерение):",
    choices: [
      "忘れないようにメモする",
      "忘れないようにメモの",
      "忘れないようにメモになる",
      "忘れないようにメモだ",
    ],
    correctIndex: 0,
  },
  {
    id: "n3-2",
    level: "N3",
    prompt: "Чтение слова 経済:",
    choices: ["けいざい", "けいえい", "せいじ", "きょうざい"],
    correctIndex: 0,
  },
  {
    id: "n2-1",
    level: "N2",
    prompt: "〜にもかかわらず по значению ближе всего к:",
    choices: ["«несмотря на»", "«благодаря»", "«в связи с»", "«в то же время»"],
    correctIndex: 0,
  },
  {
    id: "n2-2",
    level: "N2",
    prompt: "Грамматически корректный вариант с 〜わけではない:",
    choices: [
      "全部嫌いなわけではない",
      "全部嫌いわけではない",
      "全部嫌いだわけではない",
      "全部嫌いなわけがない",
    ],
    correctIndex: 0,
  },
];

/**
 * Score → JLPT level mapping (out of 8 questions).
 * 0–3 correct → N5, 4–5 → N4, 6–7 → N3, 8 → N2.
 */
export function scoreToLevel(correct: number): JlptLevel {
  if (correct >= 8) return "N2";
  if (correct >= 6) return "N3";
  if (correct >= 4) return "N4";
  return "N5";
}
