"use client";

import { fetchKanjiListAction } from "@/app/kanji/actions";
import { useTrainingHeartbeat } from "@/lib/use-training-heartbeat";
import type { KanjiDto } from "@gojo/shared";
import { useCallback, useEffect, useState } from "react";

// ── Design tokens (matches kana trainer) ────────────────────────────────────
const C = {
  cream: "#f8f4ec",
  cream2: "#efe7d8",
  white: "#ffffff",
  orange: "#e8420a",
  ink: "#252525",
  ink3: "#6b6b6b",
  muted: "#a0a0a0",
  border: "rgba(0,0,0,0.06)",
  green: "#4a8f3a",
  greenBg: "#e5f0de",
  red: "#c8302c",
  redBg: "#fbe5e3",
};

type Difficulty = "easy" | "medium" | "hard" | "all";
type Phase = "setup" | "loading" | "playing" | "summary";
type AnswerState = "idle" | "correct" | "wrong";

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: "easy", label: "Лёгкий", hint: "1–2 класс · базовые кандзи" },
  { id: "medium", label: "Средний", hint: "3–4 класс" },
  { id: "hard", label: "Сложный", hint: "5–6 класс и выше" },
  { id: "all", label: "Все", hint: "весь словарь" },
];

const ROUNDS = 10;

function saveGuestTrainerProgress(activity: "kanji", correct: number, total: number) {
  try {
    const key = "gojo:guest-trainer-progress";
    const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
    localStorage.setItem(
      key,
      JSON.stringify([
        ...prev,
        {
          activity,
          correct,
          total,
          completedAt: new Date().toISOString(),
        },
      ]),
    );
  } catch {
    // localStorage can be unavailable; the signup CTA still works.
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function firstReading(k: KanjiDto): string | null {
  const raw = k.onyomiJa || k.kunyomiJa || k.onyomi || k.kunyomi;
  if (!raw) return null;
  return raw.split(/[、,]/)[0]?.trim() ?? null;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.orange,
        marginBottom: 16,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 24,
          height: 2,
          background: C.orange,
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  );
}

function SetupScreen({ onStart }: { onStart: (difficulty: Difficulty) => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Label>Тренажёр · Gojo</Label>

        <h1
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: C.ink,
            marginBottom: 8,
            lineHeight: 1.1,
          }}
        >
          Кандзи
        </h1>
        <p
          style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif",
            fontSize: 16,
            color: C.ink3,
            marginBottom: 40,
            lineHeight: 1.6,
          }}
        >
          {ROUNDS} иероглифов · угадай значение
        </p>

        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 10,
            }}
          >
            Сложность
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: `1.5px solid ${difficulty === d.id ? C.orange : "rgba(0,0,0,0.08)"}`,
                  background: difficulty === d.id ? C.orange : C.white,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: difficulty === d.id ? C.white : C.ink,
                    marginBottom: 3,
                  }}
                >
                  {d.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    fontSize: 11,
                    color: difficulty === d.id ? "rgba(255,255,255,0.65)" : C.ink3,
                  }}
                >
                  {d.hint}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStart(difficulty)}
          className="transition-opacity hover:opacity-90 focus-visible:opacity-90"
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 10,
            border: "none",
            background: C.orange,
            color: C.white,
            cursor: "pointer",
            fontFamily: "var(--font-manrope), system-ui, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.01em",
          }}
        >
          Начать
        </button>
      </div>
    </div>
  );
}

function SummaryScreen({
  correct,
  total,
  mistakes,
  onRetryMistakes,
  onRestart,
  isLoggedIn,
}: {
  correct: number;
  total: number;
  mistakes: KanjiDto[];
  onRetryMistakes: () => void;
  onRestart: () => void;
  isLoggedIn: boolean;
}) {
  const pct = Math.round((correct / total) * 100);

  useEffect(() => {
    saveGuestTrainerProgress("kanji", correct, total);
  }, [correct, total]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Label>Готово</Label>
        <h1
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: C.ink,
            marginBottom: 8,
          }}
        >
          {correct} из {total}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif",
            fontSize: 15,
            color: C.ink3,
            marginBottom: 28,
          }}
        >
          {pct}% правильных ответов
        </p>

        {mistakes.length > 0 ? (
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: 12,
              }}
            >
              Стоит повторить
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mistakes.map((k) => (
                <div key={k.character} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-noto-serif-jp), serif",
                      fontSize: 26,
                      color: C.ink,
                      width: 34,
                      flexShrink: 0,
                    }}
                  >
                    {k.character}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-manrope), system-ui, sans-serif",
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.ink,
                      }}
                    >
                      {k.meaning}
                    </div>
                    {firstReading(k) ? (
                      <div
                        style={{
                          fontFamily: "var(--font-manrope), system-ui, sans-serif",
                          fontSize: 11,
                          color: C.ink3,
                        }}
                      >
                        {firstReading(k)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mistakes.length > 0 ? (
            <button
              type="button"
              onClick={onRetryMistakes}
              style={{
                padding: "14px",
                borderRadius: 10,
                border: "none",
                background: C.orange,
                color: C.white,
                cursor: "pointer",
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Повторить ошибки
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRestart}
            style={{
              padding: "14px",
              borderRadius: 10,
              border: "1.5px solid rgba(0,0,0,0.12)",
              background: C.white,
              color: C.ink,
              cursor: "pointer",
              fontFamily: "var(--font-manrope), system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Начать заново
          </button>
          {!isLoggedIn && (
            <>
              <a
                href="/login?mode=signup"
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  background: C.ink,
                  color: C.white,
                  textAlign: "center",
                  textDecoration: "none",
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                Зарегистрироваться и начать полноценное обучение
              </a>
              <a
                href="/login"
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "transparent",
                  color: C.ink,
                  textAlign: "center",
                  textDecoration: "none",
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Уже есть аккаунт — войти и сохранить баллы
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type Question = { item: KanjiDto; choices: string[]; correct: string };

function buildQuestions(pool: KanjiDto[], rounds: KanjiDto[]): Question[] {
  return rounds.map((item) => {
    const distractorPool = pool.filter((k) => k.character !== item.character);
    const distractors = shuffle(distractorPool)
      .slice(0, 3)
      .map((k) => k.meaning);
    const choices = shuffle([item.meaning, ...distractors]);
    return { item, choices, correct: item.meaning };
  });
}

export function KanjiGame({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [pool, setPool] = useState<KanjiDto[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<KanjiDto[]>([]);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only counts time while actually playing a round, not on setup/summary screens.
  useTrainingHeartbeat("kanji", phase === "playing");

  async function start(diff: Difficulty, customRounds?: KanjiDto[]) {
    setDifficulty(diff);
    setPhase("loading");
    setError(null);
    try {
      const rounds = customRounds ?? (await fetchKanjiListAction(diff, ROUNDS));
      if (rounds.length < 4) {
        setError("Недостаточно кандзи для этой сложности. Попробуй другую.");
        setPhase("setup");
        return;
      }
      const extraPool =
        rounds.length < ROUNDS + 8 ? await fetchKanjiListAction(diff, ROUNDS + 12) : rounds;
      const fullPool = extraPool.length >= rounds.length ? extraPool : rounds;

      setPool(fullPool);
      setQuestions(buildQuestions(fullPool, rounds));
      setIndex(0);
      setCorrectCount(0);
      setMistakes([]);
      setAnswerState("idle");
      setSelectedChoice(null);
      setPhase("playing");
    } catch {
      setError("Не удалось загрузить кандзи. Попробуй ещё раз.");
      setPhase("setup");
    }
  }

  const current = questions[index] ?? null;

  const handleChoice = useCallback(
    (choice: string) => {
      if (answerState !== "idle" || !current) return;
      setSelectedChoice(choice);
      const isCorrect = choice === current.correct;
      setAnswerState(isCorrect ? "correct" : "wrong");
      if (isCorrect) setCorrectCount((n) => n + 1);
      else
        setMistakes((prev) =>
          prev.find((k) => k.character === current.item.character) ? prev : [...prev, current.item],
        );
      setTimeout(() => {
        setAnswerState("idle");
        setSelectedChoice(null);
        if (index + 1 >= questions.length) setPhase("summary");
        else setIndex((i) => i + 1);
      }, 900);
    },
    [answerState, current, index, questions.length],
  );

  useEffect(() => {
    if (phase !== "playing" || !current) return;
    const handler = (e: KeyboardEvent) => {
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx !== -1 && current.choices[idx]) handleChoice(current.choices[idx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, current, handleChoice]);

  if (phase === "setup")
    return (
      <>
        <SetupScreen onStart={start} />
        {error ? (
          <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, textAlign: "center" }}>
            <span
              style={{
                background: C.redBg,
                color: C.red,
                padding: "8px 16px",
                borderRadius: 8,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </span>
          </div>
        ) : null}
      </>
    );

  if (phase === "loading")
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif",
            color: C.ink3,
            fontSize: 14,
          }}
        >
          Загружаем кандзи…
        </span>
      </div>
    );

  if (phase === "summary")
    return (
      <SummaryScreen
        correct={correctCount}
        total={questions.length}
        mistakes={mistakes}
        onRetryMistakes={() => start(difficulty, shuffle(mistakes))}
        onRestart={() => setPhase("setup")}
        isLoggedIn={isLoggedIn}
      />
    );

  if (!current) return null;

  const cardBg =
    answerState === "correct" ? C.greenBg : answerState === "wrong" ? C.redBg : C.white;
  const cardBorder =
    answerState === "correct"
      ? `1px solid ${C.green}30`
      : answerState === "wrong"
        ? `1px solid ${C.red}30`
        : `1px solid ${C.border}`;
  const charColor = answerState === "correct" ? C.green : answerState === "wrong" ? C.red : C.ink;
  const progress = index / questions.length;
  const reading = firstReading(current.item);

  return (
    <div
      style={{ minHeight: "100vh", background: C.cream, display: "flex", flexDirection: "column" }}
    >
      {/* Top bar */}
      <div
        style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}
      >
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={() => setPhase("setup")}
            style={{
              fontFamily: "var(--font-manrope), system-ui, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: C.ink3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Настройки
          </button>
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 12,
              fontWeight: 700,
              color: C.ink3,
            }}
          >
            {index + 1} / {questions.length}
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 12,
              fontWeight: 700,
              color: C.orange,
            }}
          >
            ✓ {correctCount}
          </div>
        </div>
        <div
          style={{
            maxWidth: 560,
            margin: "8px auto 0",
            height: 3,
            background: C.cream2,
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: C.orange,
              borderRadius: 99,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          maxWidth: 560,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 20,
            background: cardBg,
            border: cardBorder,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            transition: "background 0.2s, border 0.2s",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-noto-serif-jp), serif",
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1,
              color: charColor,
              transition: "color 0.2s",
            }}
          >
            {current.item.character}
          </span>
          {answerState !== "idle" && reading ? (
            <span
              style={{
                marginTop: 6,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: charColor,
              }}
            >
              {reading}
            </span>
          ) : null}
        </div>

        <div
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: C.muted,
            marginBottom: 20,
          }}
        >
          Что означает этот иероглиф?
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
          {current.choices.map((choice, i) => {
            const isSelected = selectedChoice === choice;
            const isCorrectChoice = choice === current.correct;
            let bg = C.white;
            let border = "1px solid rgba(0,0,0,0.08)";
            let color = C.ink;

            if (answerState !== "idle" && isSelected) {
              bg = isCorrectChoice ? C.greenBg : C.redBg;
              border = `1px solid ${isCorrectChoice ? `${C.green}50` : `${C.red}50`}`;
              color = isCorrectChoice ? C.green : C.red;
            } else if (answerState !== "idle" && isCorrectChoice) {
              bg = C.greenBg;
              border = `1px solid ${C.green}50`;
              color = C.green;
            }

            return (
              <button
                key={choice}
                type="button"
                onClick={() => handleChoice(choice)}
                disabled={answerState !== "idle"}
                style={{
                  position: "relative",
                  padding: "18px 12px",
                  borderRadius: 12,
                  border,
                  background: bg,
                  color,
                  cursor: answerState === "idle" ? "pointer" : "default",
                  transition: "all 0.15s",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 8,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    opacity: 0.25,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {choice}
                </span>
              </button>
            );
          })}
        </div>

        <p
          style={{
            marginTop: 20,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 10,
            color: C.muted,
            letterSpacing: "0.06em",
          }}
        >
          Клавиши 1–4 для быстрого ответа
        </p>
      </div>
    </div>
  );
}
