import type { JlptLevel, QuizPlacement, QuizStartChoice } from "@gojo/shared";

export type QuizQuestion = {
  id: string;
  level: JlptLevel;
  prompt: string;
  choices: string[];
  correctIndex: number;
};

/**
 * Onboarding quiz bank. Three questions per JLPT level (N5 → N2); a level is
 * demonstrated at 2 of 3, so one careless slip doesn't zero the placement.
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
    choices: ["огонь", "вода", "гора", "река"],
    correctIndex: 1,
  },
  {
    id: "n5-2",
    level: "N5",
    prompt: "はじめまして。わたし＿マリアです。 (Здравствуйте, я Мария.)",
    choices: ["を", "に", "は", "が"],
    correctIndex: 2,
  },
  {
    id: "n5-3",
    level: "N5",
    prompt: "Чтение слова 学生 (студент):",
    choices: ["がくせい", "せんせい", "がっこう", "がくせん"],
    correctIndex: 0,
  },
  {
    id: "n4-1",
    level: "N4",
    prompt: "«Могу есть» — потенциальная форма глагола 食べる:",
    choices: ["食べられる", "食べさせる", "食べさせられる", "食べたい"],
    correctIndex: 0,
  },
  {
    id: "n4-2",
    level: "N4",
    prompt: "行かなければならない означает:",
    choices: [
      "«можно не идти»",
      "«не должен идти»",
      "«наверное, пойдёт»",
      "«обязательно нужно идти»",
    ],
    correctIndex: 3,
  },
  {
    id: "n4-3",
    level: "N4",
    prompt: "Пассивная форма глагола 読む (читать):",
    choices: ["読ませる", "読まれる", "読める", "読もう"],
    correctIndex: 1,
  },
  {
    id: "n3-1",
    level: "N3",
    prompt: "遅れない＿＿、朝早く家を出た。 (Вышел из дома пораньше, чтобы не опоздать.)",
    choices: ["ために", "ように", "かわりに", "ばかりに"],
    correctIndex: 1,
  },
  {
    id: "n3-2",
    level: "N3",
    prompt: "Чтение слова 経済:",
    choices: ["けいえい", "きょうざい", "せいじ", "けいざい"],
    correctIndex: 3,
  },
  {
    id: "n3-3",
    level: "N3",
    prompt: "彼は来るはずだ означает:",
    choices: [
      "«он наверняка придёт — есть основания так думать»",
      "«он обязан прийти»",
      "«он только что пришёл»",
      "«пусть приходит»",
    ],
    correctIndex: 0,
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
      "全部嫌いのわけではない",
      "全部嫌いだわけではない",
    ],
    correctIndex: 1,
  },
  {
    id: "n2-3",
    level: "N2",
    prompt: "行かざるを得ない означает:",
    choices: [
      "«ни за что не пойду»",
      "«могу и не пойти»",
      "«не собираюсь идти»",
      "«придётся пойти — выбора нет»",
    ],
    correctIndex: 3,
  },
];

export const LEVEL_ORDER: readonly JlptLevel[] = ["N5", "N4", "N3", "N2"];

/** The evidence bank served after declaration. Every level is retained: the
 * self-report controls framing, but never silently grants correct answers. */
export function questionsForDeclared(declared: QuizStartChoice | undefined): QuizQuestion[] {
  // Declaration changes the explanation, never the evidence. Re-test every
  // band so a confident self-assessment can still be corrected by answers.
  void declared;
  return QUIZ_QUESTIONS;
}

/**
 * A level counts as demonstrated at ≥2/3 of its questions: tolerant of one
 * slip, still out of reach of random clicking. With 3 questions the threshold
 * is 2 — a single lucky answer never clears a band.
 */
function levelDemonstrated(correct: number, total: number): boolean {
  return correct * 3 >= total * 2 && correct > 0;
}

/**
 * Placement = the highest level demonstrated in unbroken sequence from N5 up.
 * A failed band stops the walk: isolated success above a gap is not credited.
 */
export function placementFor(
  declared: QuizStartChoice | undefined,
  byLevel: { level: JlptLevel; correct: number; total: number }[],
): QuizPlacement {
  void declared;
  let demonstrated: QuizPlacement = "start";
  for (const level of LEVEL_ORDER) {
    const scored = byLevel.find((b) => b.level === level);
    if (!scored || scored.total === 0) continue;
    if (!levelDemonstrated(scored.correct, scored.total)) return demonstrated;
    demonstrated = level;
  }
  return demonstrated;
}
