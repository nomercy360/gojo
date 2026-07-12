import type { JlptLevel, QuizPlacement, QuizStartChoice } from "@gojo/shared";

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
 * Choice order is pre-shuffled here: correctIndex must vary between questions,
 * otherwise "always pick A" scores a perfect result.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "n5-1",
    level: "N5",
    prompt: "Что значит слово みず?",
    choices: ["вода", "огонь", "гора", "река"],
    correctIndex: 0,
  },
  {
    id: "n5-2",
    level: "N5",
    prompt: "わたし＿にほんじんです。 (Я японец.)",
    choices: ["を", "に", "は", "が"],
    correctIndex: 2,
  },
  {
    id: "n4-1",
    level: "N4",
    prompt: "Прошедшая простая форма глагола 食べる:",
    choices: ["食べろ", "食べない", "食べた", "食べよう"],
    correctIndex: 2,
  },
  {
    id: "n4-2",
    level: "N4",
    prompt: "Конструкция 〜てから означает:",
    choices: [
      "«до того, как…»",
      "«после того, как…»",
      "«пока… (длительность)»",
      "«вместо того, чтобы…»",
    ],
    correctIndex: 1,
  },
  {
    id: "n3-1",
    level: "N3",
    prompt: "Выбери правильное использование 〜ように (намерение):",
    choices: [
      "忘れないようにメモの",
      "忘れないようにメモになる",
      "忘れないようにメモだ",
      "忘れないようにメモする",
    ],
    correctIndex: 3,
  },
  {
    id: "n3-2",
    level: "N3",
    prompt: "Чтение слова 経済:",
    choices: ["けいえい", "きょうざい", "せいじ", "けいざい"],
    correctIndex: 3,
  },
  {
    id: "n2-1",
    level: "N2",
    prompt: "〜にもかかわらず по значению ближе всего к:",
    choices: ["«благодаря»", "«в связи с»", "«несмотря на»", "«в то же время»"],
    correctIndex: 2,
  },
  {
    id: "n2-2",
    level: "N2",
    prompt: "Грамматически корректный вариант с 〜わけではない:",
    choices: [
      "全部嫌いわけではない",
      "全部嫌いなわけではない",
      "全部嫌いなわけがない",
      "全部嫌いだわけではない",
    ],
    correctIndex: 1,
  },
];

export const LEVEL_ORDER: readonly JlptLevel[] = ["N5", "N4", "N3", "N2"];

/**
 * Levels the declaration vouches for — skipped by the quiz and credited
 * "со слов" on the map. Kana itself has no question in the bank, so "kana"
 * still probes from N5 up; it only moves the placement floor off "start".
 */
export function creditedLevels(declared: QuizStartChoice | undefined): readonly JlptLevel[] {
  if (declared === "n5") return ["N5"];
  if (declared === "n4") return ["N5", "N4"];
  return [];
}

/** The subset of the bank actually served, given the declaration. Must stay
 * a pure function of `declared`: the client filters by the same rule, and a
 * mismatch would score unserved questions as wrong. */
export function questionsForDeclared(declared: QuizStartChoice | undefined): QuizQuestion[] {
  const credited = new Set(creditedLevels(declared));
  return QUIZ_QUESTIONS.filter((q) => !credited.has(q.level));
}

/**
 * Placement = the lowest served level the user didn't fully clear.
 * Monotonic and honest by construction: 0 demonstrated never rounds up.
 * With nothing correct at N5 and no kana declared, the floor is "start"
 * (below N5) — the quiz can't claim a JLPT band from a blank slate.
 */
export function placementFor(
  declared: QuizStartChoice | undefined,
  byLevel: { level: JlptLevel; correct: number; total: number }[],
): QuizPlacement {
  const credited = new Set(creditedLevels(declared));
  for (const level of LEVEL_ORDER) {
    if (credited.has(level)) continue;
    const scored = byLevel.find((b) => b.level === level);
    if (!scored || scored.total === 0) continue;
    if (scored.correct < scored.total) {
      const knowsKana = declared === "kana" || credited.size > 0;
      if (level === "N5" && scored.correct === 0 && !knowsKana) return "start";
      return level;
    }
  }
  // Cleared everything served — N2 is the bank's ceiling.
  return "N2";
}
