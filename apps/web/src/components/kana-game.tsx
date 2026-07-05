"use client";

import { useTrainingHeartbeat } from "@/lib/use-training-heartbeat";
import { useCallback, useEffect, useMemo, useState } from "react";

// ── Design tokens (landing policy) ───────────────────────────────────────────
const C = {
  cream: "#f8f4ec",
  cream2: "#efe7d8",
  white: "#ffffff",
  orange: "#e8420a",
  ink: "#252525",
  ink2: "#4a4a4a",
  ink3: "#6b6b6b",
  muted: "#a0a0a0",
  border: "rgba(0,0,0,0.06)",
  green: "#4a8f3a",
  greenBg: "#e5f0de",
  red: "#c8302c",
  redBg: "#fbe5e3",
};

// ── Data ──────────────────────────────────────────────────────────────────────

interface Kana {
  kana: string;
  romaji: string;
  type: "hiragana" | "katakana";
}

const HIRAGANA: Kana[] = [
  { kana: "あ", romaji: "a", type: "hiragana" },
  { kana: "い", romaji: "i", type: "hiragana" },
  { kana: "う", romaji: "u", type: "hiragana" },
  { kana: "え", romaji: "e", type: "hiragana" },
  { kana: "お", romaji: "o", type: "hiragana" },
  { kana: "か", romaji: "ka", type: "hiragana" },
  { kana: "き", romaji: "ki", type: "hiragana" },
  { kana: "く", romaji: "ku", type: "hiragana" },
  { kana: "け", romaji: "ke", type: "hiragana" },
  { kana: "こ", romaji: "ko", type: "hiragana" },
  { kana: "さ", romaji: "sa", type: "hiragana" },
  { kana: "し", romaji: "shi", type: "hiragana" },
  { kana: "す", romaji: "su", type: "hiragana" },
  { kana: "せ", romaji: "se", type: "hiragana" },
  { kana: "そ", romaji: "so", type: "hiragana" },
  { kana: "た", romaji: "ta", type: "hiragana" },
  { kana: "ち", romaji: "chi", type: "hiragana" },
  { kana: "つ", romaji: "tsu", type: "hiragana" },
  { kana: "て", romaji: "te", type: "hiragana" },
  { kana: "と", romaji: "to", type: "hiragana" },
  { kana: "な", romaji: "na", type: "hiragana" },
  { kana: "に", romaji: "ni", type: "hiragana" },
  { kana: "ぬ", romaji: "nu", type: "hiragana" },
  { kana: "ね", romaji: "ne", type: "hiragana" },
  { kana: "の", romaji: "no", type: "hiragana" },
  { kana: "は", romaji: "ha", type: "hiragana" },
  { kana: "ひ", romaji: "hi", type: "hiragana" },
  { kana: "ふ", romaji: "fu", type: "hiragana" },
  { kana: "へ", romaji: "he", type: "hiragana" },
  { kana: "ほ", romaji: "ho", type: "hiragana" },
  { kana: "ま", romaji: "ma", type: "hiragana" },
  { kana: "み", romaji: "mi", type: "hiragana" },
  { kana: "む", romaji: "mu", type: "hiragana" },
  { kana: "め", romaji: "me", type: "hiragana" },
  { kana: "も", romaji: "mo", type: "hiragana" },
  { kana: "や", romaji: "ya", type: "hiragana" },
  { kana: "ゆ", romaji: "yu", type: "hiragana" },
  { kana: "よ", romaji: "yo", type: "hiragana" },
  { kana: "ら", romaji: "ra", type: "hiragana" },
  { kana: "り", romaji: "ri", type: "hiragana" },
  { kana: "る", romaji: "ru", type: "hiragana" },
  { kana: "れ", romaji: "re", type: "hiragana" },
  { kana: "ろ", romaji: "ro", type: "hiragana" },
  { kana: "わ", romaji: "wa", type: "hiragana" },
  { kana: "を", romaji: "wo", type: "hiragana" },
  { kana: "ん", romaji: "n", type: "hiragana" },
];

const KATAKANA: Kana[] = [
  { kana: "ア", romaji: "a", type: "katakana" },
  { kana: "イ", romaji: "i", type: "katakana" },
  { kana: "ウ", romaji: "u", type: "katakana" },
  { kana: "エ", romaji: "e", type: "katakana" },
  { kana: "オ", romaji: "o", type: "katakana" },
  { kana: "カ", romaji: "ka", type: "katakana" },
  { kana: "キ", romaji: "ki", type: "katakana" },
  { kana: "ク", romaji: "ku", type: "katakana" },
  { kana: "ケ", romaji: "ke", type: "katakana" },
  { kana: "コ", romaji: "ko", type: "katakana" },
  { kana: "サ", romaji: "sa", type: "katakana" },
  { kana: "シ", romaji: "shi", type: "katakana" },
  { kana: "ス", romaji: "su", type: "katakana" },
  { kana: "セ", romaji: "se", type: "katakana" },
  { kana: "ソ", romaji: "so", type: "katakana" },
  { kana: "タ", romaji: "ta", type: "katakana" },
  { kana: "チ", romaji: "chi", type: "katakana" },
  { kana: "ツ", romaji: "tsu", type: "katakana" },
  { kana: "テ", romaji: "te", type: "katakana" },
  { kana: "ト", romaji: "to", type: "katakana" },
  { kana: "ナ", romaji: "na", type: "katakana" },
  { kana: "ニ", romaji: "ni", type: "katakana" },
  { kana: "ヌ", romaji: "nu", type: "katakana" },
  { kana: "ネ", romaji: "ne", type: "katakana" },
  { kana: "ノ", romaji: "no", type: "katakana" },
  { kana: "ハ", romaji: "ha", type: "katakana" },
  { kana: "ヒ", romaji: "hi", type: "katakana" },
  { kana: "フ", romaji: "fu", type: "katakana" },
  { kana: "ヘ", romaji: "he", type: "katakana" },
  { kana: "ホ", romaji: "ho", type: "katakana" },
  { kana: "マ", romaji: "ma", type: "katakana" },
  { kana: "ミ", romaji: "mi", type: "katakana" },
  { kana: "ム", romaji: "mu", type: "katakana" },
  { kana: "メ", romaji: "me", type: "katakana" },
  { kana: "モ", romaji: "mo", type: "katakana" },
  { kana: "ヤ", romaji: "ya", type: "katakana" },
  { kana: "ユ", romaji: "yu", type: "katakana" },
  { kana: "ヨ", romaji: "yo", type: "katakana" },
  { kana: "ラ", romaji: "ra", type: "katakana" },
  { kana: "リ", romaji: "ri", type: "katakana" },
  { kana: "ル", romaji: "ru", type: "katakana" },
  { kana: "レ", romaji: "re", type: "katakana" },
  { kana: "ロ", romaji: "ro", type: "katakana" },
  { kana: "ワ", romaji: "wa", type: "katakana" },
  { kana: "ヲ", romaji: "wo", type: "katakana" },
  { kana: "ン", romaji: "n", type: "katakana" },
];

const ALL_KANA = [...HIRAGANA, ...KATAKANA];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(correct: Kana, pool: Kana[], count = 3): Kana[] {
  return shuffle(pool.filter((k) => k.romaji !== correct.romaji)).slice(0, count);
}

type SetupMode = "hiragana" | "katakana" | "both";
type Direction = "kana-to-romaji" | "romaji-to-kana";
type Phase = "setup" | "playing" | "summary";
type AnswerState = "idle" | "correct" | "wrong";
interface Question {
  item: Kana;
  choices: string[];
  correct: string;
}

function saveGuestTrainerProgress(activity: "kana", correct: number, total: number) {
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

// ── Section label (matches landing) ──────────────────────────────────────────

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

// ── Setup Screen ──────────────────────────────────────────────────────────────

function SetupScreen({ onStart }: { onStart: (mode: SetupMode, dir: Direction) => void }) {
  const [mode, setMode] = useState<SetupMode>("hiragana");
  const [dir, setDir] = useState<Direction>("kana-to-romaji");

  const counts: Record<SetupMode, number> = {
    hiragana: HIRAGANA.length,
    katakana: KATAKANA.length,
    both: ALL_KANA.length,
  };

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
          Хирагана
          <br />
          &amp; Катакана
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
          Выучи японские символы через многократные повторения
        </p>

        {/* Mode */}
        <div style={{ marginBottom: 24 }}>
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
            Набор символов
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {(["hiragana", "katakana", "both"] as SetupMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  padding: "16px 12px",
                  borderRadius: 12,
                  border: `1.5px solid ${mode === m ? C.orange : "rgba(0,0,0,0.08)"}`,
                  background: mode === m ? C.orange : C.white,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-noto-serif-jp), serif",
                    fontSize: 24,
                    lineHeight: 1,
                    color: mode === m ? C.white : C.ink,
                    marginBottom: 6,
                  }}
                >
                  {m === "hiragana" ? "あ" : m === "katakana" ? "ア" : "あア"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: mode === m ? "rgba(255,255,255,0.8)" : C.muted,
                  }}
                >
                  {m === "hiragana" ? "Хирагана" : m === "katakana" ? "Катакана" : "Оба набора"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    fontSize: 11,
                    color: mode === m ? "rgba(255,255,255,0.6)" : C.muted,
                    marginTop: 2,
                  }}
                >
                  {counts[m]} симв.
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Direction */}
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
            Режим
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(["kana-to-romaji", "romaji-to-kana"] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDir(d)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: `1.5px solid ${dir === d ? C.orange : "rgba(0,0,0,0.08)"}`,
                  background: dir === d ? C.orange : C.white,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: dir === d ? C.white : C.ink,
                    marginBottom: 3,
                  }}
                >
                  {d === "kana-to-romaji" ? "Символ → Ромадзи" : "Ромадзи → Символ"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    fontSize: 11,
                    color: dir === d ? "rgba(255,255,255,0.65)" : C.ink3,
                  }}
                >
                  {d === "kana-to-romaji"
                    ? "Видишь あ — выбираешь «a»"
                    : "Видишь «ka» — выбираешь か"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStart(mode, dir)}
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
            transition: "opacity 0.15s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onBlur={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Начать →
        </button>
      </div>
    </div>
  );
}

// ── Summary Screen ────────────────────────────────────────────────────────────

function SummaryScreen({
  correct,
  total,
  mistakes,
  onRetryMistakes,
  onRestart,
}: {
  correct: number;
  total: number;
  mistakes: Kana[];
  onRetryMistakes: () => void;
  onRestart: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  const rank =
    pct === 100 ? "完璧！" : pct >= 80 ? "よくできました" : pct >= 60 ? "がんばって" : "もう一度";

  useEffect(() => {
    saveGuestTrainerProgress("kana", correct, total);
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
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <Label>Результат</Label>

        <div
          style={{
            fontFamily: "var(--font-noto-serif-jp), serif",
            fontSize: 52,
            fontWeight: 700,
            color: C.orange,
            marginBottom: 8,
            lineHeight: 1,
          }}
        >
          {rank}
        </div>
        <div
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 38,
            fontWeight: 800,
            color: C.ink,
            letterSpacing: "-0.025em",
            lineHeight: 1,
          }}
        >
          {correct} <span style={{ fontSize: 20, color: C.ink3, fontWeight: 500 }}>из</span> {total}
        </div>
        <div
          style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif",
            fontSize: 14,
            color: C.ink3,
            marginTop: 6,
            marginBottom: 28,
          }}
        >
          Точность: {pct}%
        </div>

        <div
          style={{
            height: 6,
            width: "100%",
            background: C.cream2,
            borderRadius: 99,
            overflow: "hidden",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: C.orange,
              borderRadius: 99,
              transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        </div>

        {mistakes.length > 0 && (
          <div
            style={{
              background: C.white,
              borderRadius: 16,
              padding: "20px 24px",
              marginBottom: 16,
              textAlign: "left",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: C.red,
                marginBottom: 14,
              }}
            >
              Ошибки · {mistakes.length} символов
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {mistakes.map((k) => (
                <div
                  key={k.kana}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: C.cream,
                    borderRadius: 8,
                    padding: "8px 12px",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-noto-serif-jp), serif",
                      fontSize: 22,
                      fontWeight: 700,
                      color: C.ink,
                    }}
                  >
                    {k.kana}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.ink3,
                    }}
                  >
                    {k.romaji}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mistakes.length > 0 && (
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
              Повторить ошибки ({mistakes.length})
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            style={{
              padding: "14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.1)",
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
          <a
            href="/login?mode=signup"
            style={{
              padding: "14px",
              borderRadius: 10,
              background: C.ink,
              color: C.white,
              textDecoration: "none",
              fontFamily: "var(--font-manrope), system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Сохранить прогресс в аккаунте
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Game ─────────────────────────────────────────────────────────────────

export function KanaGame() {
  useTrainingHeartbeat("kana");
  const [phase, setPhase] = useState<Phase>("setup");
  const [setupMode, setSetupMode] = useState<SetupMode>("hiragana");
  const [direction, setDirection] = useState<Direction>("kana-to-romaji");
  const [queue, setQueue] = useState<Kana[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<Kana[]>([]);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const pool = useMemo(() => {
    if (setupMode === "hiragana") return HIRAGANA;
    if (setupMode === "katakana") return KATAKANA;
    return ALL_KANA;
  }, [setupMode]);

  const current = queue[queueIndex] ?? null;

  const question: Question | null = useMemo(() => {
    if (!current) return null;
    if (direction === "kana-to-romaji") {
      const choices = shuffle([
        current.romaji,
        ...pickDistractors(current, pool).map((k) => k.romaji),
      ]);
      return { item: current, choices, correct: current.romaji };
    }
    const samePool = pool.filter((k) => k.type === current.type);
    const choices = shuffle([
      current.kana,
      ...pickDistractors(current, samePool).map((k) => k.kana),
    ]);
    return { item: current, choices, correct: current.kana };
  }, [current, direction, pool]);

  function startGame(mode: SetupMode, dir: Direction, customQueue?: Kana[]) {
    setSetupMode(mode);
    setDirection(dir);
    const q =
      customQueue ??
      shuffle(mode === "hiragana" ? HIRAGANA : mode === "katakana" ? KATAKANA : ALL_KANA);
    setQueue(q);
    setQueueIndex(0);
    setCorrectCount(0);
    setMistakes([]);
    setAnswerState("idle");
    setSelectedChoice(null);
    setPhase("playing");
  }

  const handleChoice = useCallback(
    (choice: string) => {
      if (answerState !== "idle" || !question) return;
      setSelectedChoice(choice);
      const isCorrect = choice === question.correct;
      setAnswerState(isCorrect ? "correct" : "wrong");
      if (isCorrect) setCorrectCount((n) => n + 1);
      else
        setMistakes((prev) =>
          prev.find((k) => k.kana === question.item.kana) ? prev : [...prev, question.item],
        );
      setTimeout(() => {
        setAnswerState("idle");
        setSelectedChoice(null);
        if (queueIndex + 1 >= queue.length) setPhase("summary");
        else setQueueIndex((i) => i + 1);
      }, 700);
    },
    [answerState, question, queueIndex, queue.length],
  );

  useEffect(() => {
    if (phase !== "playing" || !question) return;
    const handler = (e: KeyboardEvent) => {
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx !== -1 && question.choices[idx]) handleChoice(question.choices[idx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, question, handleChoice]);

  if (phase === "setup") return <SetupScreen onStart={startGame} />;
  if (phase === "summary")
    return (
      <SummaryScreen
        correct={correctCount}
        total={queue.length}
        mistakes={mistakes}
        onRetryMistakes={() => startGame(setupMode, direction, shuffle(mistakes))}
        onRestart={() => setPhase("setup")}
      />
    );
  if (!question) return null;

  const isKanaToRomaji = direction === "kana-to-romaji";
  const progress = queueIndex / queue.length;

  const cardBg =
    answerState === "correct" ? C.greenBg : answerState === "wrong" ? C.redBg : C.white;
  const cardBorder =
    answerState === "correct"
      ? `1px solid ${C.green}30`
      : answerState === "wrong"
        ? `1px solid ${C.red}30`
        : `1px solid ${C.border}`;
  const charColor = answerState === "correct" ? C.green : answerState === "wrong" ? C.red : C.ink;

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
            {queueIndex + 1} / {queue.length}
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
        {/* Progress bar */}
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
        {/* Prompt card */}
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 20,
            background: cardBg,
            border: cardBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            transition: "background 0.2s, border 0.2s",
          }}
        >
          {isKanaToRomaji ? (
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
              {question.item.kana}
            </span>
          ) : (
            <span
              style={{
                fontFamily: "var(--font-fraunces), Georgia, serif",
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: charColor,
                transition: "color 0.2s",
              }}
            >
              {question.item.romaji}
            </span>
          )}
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
          {isKanaToRomaji ? "Как читается этот символ?" : "Выбери правильный символ"}
        </div>

        {/* Choices */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
          {question.choices.map((choice, i) => {
            const isSelected = selectedChoice === choice;
            const isCorrectChoice = choice === question.correct;
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
                {isKanaToRomaji ? (
                  <span
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {choice}
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: "var(--font-noto-serif-jp), serif",
                      fontSize: 34,
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    {choice}
                  </span>
                )}
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
