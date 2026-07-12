"use client";

import { track } from "@/lib/analytics";
import { useTrainingHeartbeat } from "@/lib/use-training-heartbeat";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookingModal } from "../booking-modal";
import {
  ALL_KANA,
  HIRAGANA,
  KATAKANA,
  type Kana,
  type KanaScript,
  type KanaWord,
  ROW_NAMES,
  pickDistractors,
  scriptRows,
  scriptWords,
  shuffle,
} from "./data";
import {
  type KanaProgress,
  loadKanaProgress,
  saveGuestTrainerProgress,
  saveKanaProgress,
} from "./progress";

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

const MONO = "var(--font-jetbrains-mono), monospace";
const MANROPE = "var(--font-manrope), system-ui, sans-serif";
const FRAUNCES = "var(--font-fraunces), Georgia, serif";
const NOTO = "var(--font-noto-serif-jp), serif";

const btnBase: React.CSSProperties = {
  width: "100%",
  padding: "15px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontFamily: MANROPE,
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.01em",
  transition: "opacity 0.15s",
};
const btnPrimary: React.CSSProperties = { ...btnBase, background: C.orange, color: C.white };
const btnInk: React.CSSProperties = { ...btnBase, background: C.ink, color: C.white };
const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  border: "1px solid rgba(0,0,0,0.14)",
  color: C.ink2,
  fontWeight: 600,
  padding: "13px",
  fontSize: 14,
};
const quietLink: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 14,
  background: "none",
  border: "none",
  cursor: "pointer",
  textAlign: "center",
  fontFamily: MANROPE,
  fontSize: 13,
  color: C.ink3,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

function KanaStyles() {
  return (
    <style>{`
      @keyframes gojo-kana-stamp {
        0% { transform: scale(1.9) rotate(-18deg); opacity: 0; }
        55% { transform: scale(0.86) rotate(6deg); opacity: 1; }
        75% { transform: scale(1.06) rotate(-2deg); }
        100% { transform: scale(1) rotate(-4deg); opacity: 1; }
      }
      .gojo-kana-stamp { animation: gojo-kana-stamp 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }
      @keyframes gojo-kana-rise {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }
      .gojo-kana-rise { animation: gojo-kana-rise 0.35s ease both; }
      @media (prefers-reduced-motion: reduce) {
        .gojo-kana-stamp, .gojo-kana-rise { animation: none; }
      }
    `}</style>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: MONO,
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

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
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
      <div style={{ width: "100%", maxWidth: wide ? 560 : 480 }}>{children}</div>
    </div>
  );
}

function Eyebrow({ children, hot }: { children: React.ReactNode; hot?: boolean }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: hot ? C.orange : C.muted,
      }}
    >
      {children}
    </div>
  );
}

const scriptNameRu = (s: KanaScript) => (s === "hiragana" ? "Хирагана" : "Катакана");

// ── Teach screen — one new character at a time ────────────────────────────────

function TeachScreen({
  script,
  rowIndex,
  teachIndex,
  isFirstEver,
  onNext,
  onExit,
}: {
  script: KanaScript;
  rowIndex: number;
  teachIndex: number;
  isFirstEver: boolean;
  onNext: () => void;
  onExit: () => void;
}) {
  const row = scriptRows(script)[rowIndex];
  const item = row[teachIndex];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // A focused button already advances on Enter/Space via its click.
      const onButton = e.target instanceof HTMLElement && e.target.tagName === "BUTTON";
      if (e.key === "ArrowRight" || (!onButton && (e.key === "Enter" || e.key === " "))) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext]);

  return (
    <Shell>
      <div className="gojo-kana-rise" key={item.kana} style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={onExit}
            style={{
              fontFamily: MANROPE,
              fontSize: 12,
              fontWeight: 700,
              color: C.ink3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Карта
          </button>
          <Eyebrow>
            {scriptNameRu(script)} · ряд «{ROW_NAMES[rowIndex]}» · {teachIndex + 1}/{row.length}
          </Eyebrow>
        </div>

        <div
          style={{
            width: 220,
            height: 220,
            margin: "36px auto 0",
            borderRadius: 24,
            background: C.white,
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: NOTO,
              fontSize: 110,
              fontWeight: 700,
              lineHeight: 1,
              color: C.ink,
            }}
          >
            {item.kana}
          </span>
        </div>

        <div
          style={{
            fontFamily: FRAUNCES,
            fontSize: 34,
            fontWeight: 800,
            color: C.orange,
            marginTop: 22,
            letterSpacing: "-0.02em",
          }}
        >
          {item.romaji}
        </div>
        <p style={{ fontFamily: MANROPE, fontSize: 14, color: C.ink3, marginTop: 8 }}>
          Запомни форму — сейчас проверим.
        </p>

        {/* row progress dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
          {row.map((k, i) => (
            <span
              key={k.kana}
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: i <= teachIndex ? C.orange : C.cream2,
              }}
            />
          ))}
        </div>

        <button type="button" onClick={onNext} style={{ ...btnInk, marginTop: 28 }}>
          Дальше →
        </button>
        {isFirstEver && (
          <p style={{ fontFamily: MANROPE, fontSize: 12, color: C.muted, marginTop: 12 }}>
            Без регистрации · первое слово через ~3 минуты
          </p>
        )}
      </div>
    </Shell>
  );
}

// ── Quiz engine — shared by curriculum drills and free mode ──────────────────

type Direction = "kana-to-romaji" | "romaji-to-kana";
type AnswerState = "idle" | "correct" | "wrong";

interface QuizResult {
  correct: number;
  total: number;
  mistakes: Kana[];
}

function QuizEngine({
  initialQueue,
  pool,
  direction,
  requeueMisses,
  exitLabel,
  headerNote,
  onFirstAnswer,
  onDone,
  onExit,
}: {
  initialQueue: Kana[];
  pool: Kana[];
  direction: Direction;
  /** Curriculum mode: a missed kana comes back at the end of the queue once. */
  requeueMisses?: boolean;
  exitLabel: string;
  headerNote: string;
  onFirstAnswer?: (correct: boolean) => void;
  onDone: (r: QuizResult) => void;
  onExit: () => void;
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<Kana[]>([]);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const requeuedRef = useRef<Set<string>>(new Set());
  const answeredOnceRef = useRef(false);

  const current = queue[index] ?? null;

  const question = useMemo(() => {
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

  const handleChoice = useCallback(
    (choice: string) => {
      if (answerState !== "idle" || !question) return;
      setSelectedChoice(choice);
      const isCorrect = choice === question.correct;
      setAnswerState(isCorrect ? "correct" : "wrong");
      if (!answeredOnceRef.current) {
        answeredOnceRef.current = true;
        onFirstAnswer?.(isCorrect);
      }
      let nextQueue = queue;
      if (isCorrect) setCorrectCount((n) => n + 1);
      else {
        setMistakes((prev) =>
          prev.find((k) => k.kana === question.item.kana) ? prev : [...prev, question.item],
        );
        if (requeueMisses && !requeuedRef.current.has(question.item.kana)) {
          requeuedRef.current.add(question.item.kana);
          nextQueue = [...queue, question.item];
          setQueue(nextQueue);
        }
      }
      const total = nextQueue.length;
      setTimeout(() => {
        setAnswerState("idle");
        setSelectedChoice(null);
        if (index + 1 >= total) {
          onDone({
            correct: correctCount + (isCorrect ? 1 : 0),
            total,
            mistakes: isCorrect
              ? mistakes
              : mistakes.find((k) => k.kana === question.item.kana)
                ? mistakes
                : [...mistakes, question.item],
          });
        } else setIndex((i) => i + 1);
      }, 700);
    },
    [
      answerState,
      question,
      queue,
      index,
      correctCount,
      mistakes,
      requeueMisses,
      onFirstAnswer,
      onDone,
    ],
  );

  useEffect(() => {
    if (!question) return;
    const handler = (e: KeyboardEvent) => {
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx !== -1 && question.choices[idx]) handleChoice(question.choices[idx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [question, handleChoice]);

  if (!question) return null;

  const isKanaToRomaji = direction === "kana-to-romaji";
  const progress = index / queue.length;
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
            onClick={onExit}
            style={{
              fontFamily: MANROPE,
              fontSize: 12,
              fontWeight: 700,
              color: C.ink3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {exitLabel}
          </button>
          <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.ink3 }}>
            {headerNote} · {index + 1} / {queue.length}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.orange }}>
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
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            transition: "background 0.2s, border 0.2s",
          }}
        >
          {isKanaToRomaji ? (
            <span
              style={{
                fontFamily: NOTO,
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
                fontFamily: FRAUNCES,
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
            fontFamily: MONO,
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
                    fontFamily: MONO,
                    fontSize: 10,
                    fontWeight: 700,
                    opacity: 0.55,
                  }}
                >
                  {i + 1}
                </span>
                {isKanaToRomaji ? (
                  <span style={{ fontFamily: MANROPE, fontSize: 18, fontWeight: 700 }}>
                    {choice}
                  </span>
                ) : (
                  <span style={{ fontFamily: NOTO, fontSize: 34, lineHeight: 1, fontWeight: 700 }}>
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
            fontFamily: MONO,
            fontSize: 10,
            color: C.ink3,
            letterSpacing: "0.06em",
          }}
        >
          Клавиши 1–4 для быстрого ответа
        </p>
      </div>
    </div>
  );
}

// ── Word unlock — the payoff screen ───────────────────────────────────────────

function WordScreen({
  word,
  isFirst,
  onNext,
}: {
  word: KanaWord;
  isFirst: boolean;
  onNext: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // A focused button already advances on Enter/Space via its click.
      const onButton = e.target instanceof HTMLElement && e.target.tagName === "BUTTON";
      if (e.key === "ArrowRight" || (!onButton && (e.key === "Enter" || e.key === " "))) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext]);

  return (
    <Shell>
      <div className="gojo-kana-rise" style={{ textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: -8, right: 0 }}>
          <div
            className="gojo-kana-stamp"
            aria-hidden="true"
            style={{
              width: 58,
              height: 58,
              borderRadius: 10,
              border: `3px solid ${C.orange}`,
              color: C.orange,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: NOTO,
              fontSize: 29,
              fontWeight: 700,
              background: "rgba(232,66,10,0.05)",
            }}
          >
            読
          </div>
        </div>

        <Eyebrow hot>{isFirst ? "Первое слово открыто" : "Новое слово открыто"}</Eyebrow>

        <div
          style={{
            fontFamily: NOTO,
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.15,
            color: C.ink,
            marginTop: 26,
          }}
        >
          {word.word}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.ink3 }}>
            {word.romaji}
          </span>
          <span style={{ color: C.cream2 }}>|</span>
          <span style={{ fontFamily: MANROPE, fontSize: 14, color: C.ink }}>
            {word.meaning} {word.emoji}
          </span>
        </div>

        <p
          style={{
            fontFamily: FRAUNCES,
            fontSize: 20,
            fontWeight: 700,
            color: C.ink,
            margin: "28px 12px 0",
            lineHeight: 1.35,
          }}
        >
          {isFirst
            ? "Ты только что прочитал слово по-японски."
            : "Ты прочитал это сам — без подсказок."}
        </p>
        {isFirst && (
          <p style={{ fontFamily: MANROPE, fontSize: 13, color: C.ink3, marginTop: 8 }}>
            Из знаков, которые выучил пару минут назад.
          </p>
        )}

        <button type="button" onClick={onNext} style={{ ...btnInk, marginTop: 28 }}>
          Дальше →
        </button>
      </div>
    </Shell>
  );
}

// ── The map — summary, ownership, CTA ladder ─────────────────────────────────

function rankWord(pct: number) {
  return pct === 100
    ? "完璧！"
    : pct >= 80
      ? "よくできました"
      : pct >= 60
        ? "がんばって"
        : "もう一度";
}

function MapScreen({
  script,
  learnedArr,
  justFinishedAccuracy,
  isLoggedIn,
  learnedTotal,
  onNextRow,
  onStartKatakana,
  onReview,
  onAsk,
}: {
  script: KanaScript;
  learnedArr: string[];
  justFinishedAccuracy: number | null;
  isLoggedIn: boolean;
  learnedTotal: number;
  onNextRow: (row: number) => void;
  onStartKatakana: (() => void) | null;
  onReview: () => void;
  onAsk: (() => void) | null;
}) {
  const learned = useMemo(() => new Set(learnedArr), [learnedArr]);
  const rows = scriptRows(script);
  const idx = rows.findIndex((row) => row.some((k) => !learned.has(k.kana)));
  const nextRowIndex = idx === -1 ? null : idx;
  const scriptDone = nextRowIndex === null;
  const learnedInScript = rows.flat().filter((k) => learned.has(k.kana)).length;

  return (
    <Shell>
      <div className="gojo-kana-rise" style={{ textAlign: "center" }}>
        {justFinishedAccuracy !== null ? (
          <>
            <div
              style={{
                fontFamily: NOTO,
                fontSize: 44,
                fontWeight: 700,
                color: C.orange,
                lineHeight: 1,
              }}
            >
              {rankWord(justFinishedAccuracy)}
            </div>
            <p style={{ fontFamily: MANROPE, fontSize: 13, color: C.ink3, marginTop: 8 }}>
              Точность ряда: {justFinishedAccuracy}%
            </p>
          </>
        ) : (
          <Label>Твоя карта каны</Label>
        )}

        <div
          style={{
            fontFamily: FRAUNCES,
            fontSize: 30,
            fontWeight: 800,
            color: C.ink,
            letterSpacing: "-0.02em",
            marginTop: justFinishedAccuracy !== null ? 18 : 0,
          }}
        >
          {learnedInScript}{" "}
          <span style={{ fontSize: 17, color: C.ink3, fontWeight: 500 }}>
            из {rows.flat().length} · {scriptNameRu(script).toLowerCase()}
          </span>
        </div>

        {/* the map itself */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxWidth: 320,
            margin: "20px auto 0",
          }}
        >
          {rows.map((row, ri) => (
            <div
              key={ROW_NAMES[ri]}
              style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}
            >
              {Array.from({ length: 5 }, (_, ci) => {
                const k = row[ci];
                if (!k)
                  return <span key={`pad-${ROW_NAMES[ri]}-${ci}`} style={{ aspectRatio: "1" }} />;
                const isLearned = learned.has(k.kana);
                const isNext = ri === nextRowIndex;
                return (
                  <span
                    key={k.kana}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: NOTO,
                      fontSize: 20,
                      fontWeight: 700,
                      background: isLearned ? C.orange : C.white,
                      color: isLearned ? C.white : isNext ? C.orange : "transparent",
                      border: isLearned
                        ? "none"
                        : isNext
                          ? `1.5px dashed ${C.orange}80`
                          : `1px solid ${C.border}`,
                      transition: "background 0.3s",
                    }}
                  >
                    {isLearned || isNext ? k.kana : "·"}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <p style={{ fontFamily: MANROPE, fontSize: 12.5, color: C.ink3, marginTop: 14 }}>
          {scriptDone
            ? script === "hiragana"
              ? "Хирагана закрыта полностью. Серьёзно."
              : "Вся кана твоя. Дальше — настоящий японский."
            : "Ряд в день — и через две недели ты читаешь всю кану."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
          {!scriptDone && nextRowIndex !== null && (
            <button type="button" onClick={() => onNextRow(nextRowIndex)} style={btnPrimary}>
              Следующий ряд: «{ROW_NAMES[nextRowIndex]}» →
            </button>
          )}
          {scriptDone && onStartKatakana && (
            <button type="button" onClick={onStartKatakana} style={btnPrimary}>
              Начать катакану →
            </button>
          )}
          {scriptDone && !onStartKatakana && onAsk && (
            <button type="button" onClick={onAsk} style={btnPrimary}>
              Что учить дальше →
            </button>
          )}
          <button type="button" onClick={onReview} style={btnGhost}>
            Свободный режим — 25 случайных знаков
          </button>
        </div>

        {/* the save ask appears only when the map is worth saving */}
        {!isLoggedIn && learnedTotal >= 10 && (
          <a
            href="/login"
            onClick={() => track("kana_save_clicked", { learned: learnedTotal })}
            style={{ ...quietLink, textDecoration: "underline" }}
          >
            Сохранить карту — войти или создать аккаунт
          </a>
        )}
        {isLoggedIn && (
          <a href="/dashboard" style={quietLink}>
            ← Личный кабинет
          </a>
        )}
      </div>
    </Shell>
  );
}

// ── The wall — honest retention cliff, shown once ─────────────────────────────

const WALL_BARS = [90, 82, 70, 55, 38, 22, 12, 7];

function WallScreen({ onNext }: { onNext: () => void }) {
  return (
    <Shell>
      <div className="gojo-kana-rise">
        <Label>Честно о том, что дальше</Label>
        <h2
          style={{
            fontFamily: FRAUNCES,
            fontSize: 26,
            fontWeight: 800,
            color: C.ink,
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
          }}
        >
          Кану ты закроешь за пару недель.
        </h2>
        <p style={{ fontFamily: MANROPE, fontSize: 14, color: C.ink3, marginTop: 10 }}>
          Дальше большинство бросает. Вот здесь:
        </p>

        <div
          aria-hidden="true"
          style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, marginTop: 24 }}
        >
          {WALL_BARS.map((h, i) => (
            <div
              key={`${h}-${WALL_BARS.length - i}`}
              style={{
                flex: 1,
                height: `${h}%`,
                background: i < 3 ? C.ink : "rgba(232,66,10,0.55)",
                borderRadius: "3px 3px 0 0",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            color: C.ink3,
            marginTop: 8,
          }}
        >
          <span>день 1</span>
          <span style={{ color: C.orange }}>кана выучена ↓</span>
          <span>день 30</span>
        </div>

        <p
          style={{
            fontFamily: MANROPE,
            fontSize: 14,
            color: C.ink2,
            marginTop: 24,
            lineHeight: 1.6,
          }}
        >
          Мы построили Gojo так, чтобы ты не оказался в правой части этого графика.
        </p>

        <button type="button" onClick={onNext} style={{ ...btnInk, marginTop: 20 }}>
          Как это работает →
        </button>
      </div>
    </Shell>
  );
}

// ── The ask — teacher pitch, bolted to the wall ───────────────────────────────

function AskScreen({ onContinue }: { onContinue: () => void }) {
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    track("kana_ask_shown");
  }, []);

  return (
    <Shell>
      <div className="gojo-kana-rise" style={{ textAlign: "center" }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            margin: "0 auto",
            background: C.ink,
            color: C.cream,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: NOTO,
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          先
        </div>
        <h2
          style={{
            fontFamily: FRAUNCES,
            fontSize: 26,
            fontWeight: 800,
            color: C.ink,
            letterSpacing: "-0.02em",
            marginTop: 20,
          }}
        >
          База у тебя уже есть.
        </h2>
        <p
          style={{
            fontFamily: MANROPE,
            fontSize: 14,
            color: C.ink3,
            margin: "14px 8px 0",
            lineHeight: 1.6,
          }}
        >
          До свободного чтения доходят не те, кто занимается один. Преподаватель, который замечает,
          когда ты пропал, — раз в неделю, по-человечески.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}>
          <button
            type="button"
            onClick={() => {
              track("kana_ask_clicked");
              setBookingOpen(true);
            }}
            style={btnPrimary}
          >
            Бесплатный урок с преподавателем
          </button>
          <button type="button" onClick={onContinue} style={btnGhost}>
            Продолжить тренажёр — бесплатно
          </button>
        </div>
      </div>
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} source="kana" />
    </Shell>
  );
}

// ── Free mode (random 25) — setup & summary ───────────────────────────────────

type SetupMode = "hiragana" | "katakana" | "both";
const REVIEW_ROUND_SIZE = 25;

function reviewPool(mode: SetupMode): Kana[] {
  return mode === "hiragana" ? HIRAGANA : mode === "katakana" ? KATAKANA : ALL_KANA;
}

function ReviewSetupScreen({
  onStart,
  onExit,
}: {
  onStart: (mode: SetupMode, dir: Direction) => void;
  onExit: () => void;
}) {
  const [mode, setMode] = useState<SetupMode>("hiragana");
  const [dir, setDir] = useState<Direction>("kana-to-romaji");

  const counts: Record<SetupMode, number> = {
    hiragana: HIRAGANA.length,
    katakana: KATAKANA.length,
    both: ALL_KANA.length,
  };

  return (
    <Shell>
      <button
        type="button"
        onClick={onExit}
        style={{
          fontFamily: MANROPE,
          fontSize: 12,
          fontWeight: 700,
          color: C.ink3,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: 20,
        }}
      >
        ← Карта
      </button>
      <Label>Свободный режим</Label>

      <h1
        style={{
          fontFamily: FRAUNCES,
          fontSize: "clamp(28px, 5vw, 40px)",
          fontWeight: 800,
          letterSpacing: "-0.025em",
          color: C.ink,
          marginBottom: 8,
          lineHeight: 1.1,
        }}
      >
        25 случайных знаков
      </h1>
      <p
        style={{
          fontFamily: MANROPE,
          fontSize: 15,
          color: C.ink3,
          marginBottom: 32,
          lineHeight: 1.6,
        }}
      >
        Быстрая проверка всего набора — без программы, вперемешку.
      </p>

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: MONO,
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
                  fontFamily: NOTO,
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
                  fontFamily: MONO,
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
                  fontFamily: MANROPE,
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

      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            fontFamily: MONO,
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
                  fontFamily: MANROPE,
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
                  fontFamily: MANROPE,
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

      <button type="button" onClick={() => onStart(mode, dir)} style={btnPrimary}>
        Начать
      </button>
    </Shell>
  );
}

function ReviewSummaryScreen({
  result,
  onRetryMistakes,
  onRestart,
  onExit,
}: {
  result: QuizResult;
  onRetryMistakes: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const { correct, total, mistakes } = result;
  const pct = Math.round((correct / total) * 100);

  useEffect(() => {
    saveGuestTrainerProgress("kana", correct, total);
  }, [correct, total]);

  return (
    <Shell>
      <div style={{ textAlign: "center" }}>
        <Label>Результат</Label>

        <div
          style={{
            fontFamily: NOTO,
            fontSize: 52,
            fontWeight: 700,
            color: C.orange,
            marginBottom: 8,
            lineHeight: 1,
          }}
        >
          {rankWord(pct)}
        </div>
        <div
          style={{
            fontFamily: FRAUNCES,
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
            fontFamily: MANROPE,
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
                fontFamily: MONO,
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
                  <span style={{ fontFamily: NOTO, fontSize: 22, fontWeight: 700, color: C.ink }}>
                    {k.kana}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.ink3 }}>
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
              style={{ ...btnPrimary, padding: "14px" }}
            >
              Повторить ошибки ({mistakes.length})
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            style={{
              ...btnGhost,
              background: C.cream2,
              border: "1.5px solid rgba(0,0,0,0.18)",
              color: C.ink,
              fontWeight: 700,
            }}
          >
            Ещё раунд
          </button>
          <button type="button" onClick={onExit} style={quietLink}>
            ← К карте каны
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ── Main game — funnel state machine ─────────────────────────────────────────

type Screen =
  | { kind: "boot" }
  | { kind: "teach"; row: number; i: number }
  | { kind: "drill"; row: number }
  | { kind: "word"; word: KanaWord; isFirst: boolean; accuracy: number; script: KanaScript }
  | { kind: "wall"; accuracy: number | null }
  | { kind: "ask" }
  | { kind: "map"; script: KanaScript; justFinishedAccuracy: number | null }
  | { kind: "review-setup" }
  | { kind: "review"; mode: SetupMode; dir: Direction; queue: Kana[] }
  | { kind: "review-summary"; mode: SetupMode; dir: Direction; result: QuizResult };

export function KanaGame({ isLoggedIn }: { isLoggedIn: boolean }) {
  useTrainingHeartbeat("kana");
  const [progress, setProgress] = useState<KanaProgress | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "boot" });
  const firstAnswerTracked = useRef(false);

  // Load device-local progress after mount (localStorage isn't there on the server).
  useEffect(() => {
    const p = loadKanaProgress();
    setProgress(p);
    const learnedTotal = p.learned.hiragana.length + p.learned.katakana.length;
    track("kana_open", { returning: learnedTotal > 0, learned: learnedTotal });
    // Newcomers land straight in the first lesson — the product is the hook.
    if (learnedTotal === 0) setScreen({ kind: "teach", row: 0, i: 0 });
    else
      setScreen({
        kind: "map",
        script: p.learned.hiragana.length >= HIRAGANA.length ? "katakana" : "hiragana",
        justFinishedAccuracy: null,
      });
  }, []);

  const script: KanaScript =
    progress && progress.learned.hiragana.length >= HIRAGANA.length ? "katakana" : "hiragana";

  const learnedSet = useMemo(
    () => new Set(progress ? progress.learned[script] : []),
    [progress, script],
  );
  const learnedTotal = progress
    ? progress.learned.hiragana.length + progress.learned.katakana.length
    : 0;

  const rows = scriptRows(script);

  const onFirstAnswer = useCallback((correct: boolean) => {
    if (firstAnswerTracked.current) return;
    firstAnswerTracked.current = true;
    track("kana_first_answer", { correct });
  }, []);

  const goMap = useCallback(
    (accuracy: number | null = null, s: KanaScript = script) =>
      setScreen({ kind: "map", script: s, justFinishedAccuracy: accuracy }),
    [script],
  );

  // After a row (and its possible word reward): honest wall once, else the map.
  const afterRow = useCallback(
    (p: KanaProgress, accuracy: number, s: KanaScript) => {
      if (!p.wallShown && p.learned.hiragana.length >= 20) {
        const next = { ...p, wallShown: true };
        saveKanaProgress(next);
        setProgress(next);
        track("kana_wall_shown", { learned: next.learned.hiragana.length });
        setScreen({ kind: "wall", accuracy });
        return;
      }
      goMap(accuracy, s);
    },
    [goMap],
  );

  const onRowDone = useCallback(
    (rowIdx: number, r: QuizResult) => {
      if (!progress) return;
      const rowKana = rows[rowIdx];
      const learned = new Set(progress.learned[script]);
      for (const k of rowKana) learned.add(k.kana);
      let p: KanaProgress = {
        ...progress,
        learned: { ...progress.learned, [script]: [...learned] },
      };
      const accuracy = r.total > 0 ? Math.round((100 * r.correct) / r.total) : 100;
      track("kana_row_complete", { script, row: rowIdx, accuracy });

      const word = scriptWords(script).find(
        (w) => !p.shownWords.includes(w.word) && [...w.word].every((ch) => learned.has(ch)),
      );
      if (word) {
        const isFirst = p.shownWords.length === 0 && script === "hiragana";
        p = { ...p, shownWords: [...p.shownWords, word.word] };
        saveKanaProgress(p);
        setProgress(p);
        track("kana_word_unlocked", { word: word.word, first: isFirst });
        setScreen({ kind: "word", word, isFirst, accuracy, script });
        return;
      }
      saveKanaProgress(p);
      setProgress(p);
      afterRow(p, accuracy, script);
    },
    [progress, rows, script, afterRow],
  );

  const startReview = useCallback((mode: SetupMode, dir: Direction, queue?: Kana[]) => {
    setScreen({
      kind: "review",
      mode,
      dir,
      queue: queue ?? shuffle(reviewPool(mode)).slice(0, REVIEW_ROUND_SIZE),
    });
  }, []);

  if (!progress || screen.kind === "boot") {
    return <div style={{ minHeight: "100vh", background: C.cream }} />;
  }

  return (
    <>
      <KanaStyles />
      {screen.kind === "teach" && (
        <TeachScreen
          script={script}
          rowIndex={screen.row}
          teachIndex={screen.i}
          isFirstEver={learnedTotal === 0 && screen.row === 0 && screen.i === 0}
          onExit={() => goMap()}
          onNext={() => {
            const row = rows[screen.row];
            if (screen.i + 1 < row.length)
              setScreen({ kind: "teach", row: screen.row, i: screen.i + 1 });
            else setScreen({ kind: "drill", row: screen.row });
          }}
        />
      )}

      {screen.kind === "drill" && (
        <QuizEngine
          key={`drill-${script}-${screen.row}`}
          initialQueue={(() => {
            const row = rows[screen.row];
            const review = shuffle(
              rows
                .flat()
                .filter((k) => learnedSet.has(k.kana) && !row.some((r) => r.kana === k.kana)),
            ).slice(0, 5);
            // Each new kana twice + a bit of spaced review of earlier rows.
            return shuffle([...row, ...row, ...review]);
          })()}
          pool={rows.slice(0, screen.row + 1).flat()}
          direction="kana-to-romaji"
          requeueMisses
          exitLabel="← Карта"
          headerNote={`ряд «${ROW_NAMES[screen.row]}»`}
          onFirstAnswer={onFirstAnswer}
          onExit={() => goMap()}
          onDone={(r) => onRowDone(screen.row, r)}
        />
      )}

      {screen.kind === "word" && (
        <WordScreen
          word={screen.word}
          isFirst={screen.isFirst}
          onNext={() => afterRow(progress, screen.accuracy, screen.script)}
        />
      )}

      {screen.kind === "wall" && <WallScreen onNext={() => setScreen({ kind: "ask" })} />}

      {screen.kind === "ask" && <AskScreen onContinue={() => goMap()} />}

      {screen.kind === "map" &&
        (() => {
          const mapScript = screen.script;
          const mapDone =
            progress.learned[mapScript].length >=
            (mapScript === "hiragana" ? HIRAGANA : KATAKANA).length;
          return (
            <MapScreen
              script={mapScript}
              learnedArr={progress.learned[mapScript]}
              justFinishedAccuracy={screen.justFinishedAccuracy}
              isLoggedIn={isLoggedIn}
              learnedTotal={learnedTotal}
              onNextRow={(row) => setScreen({ kind: "teach", row, i: 0 })}
              onStartKatakana={
                mapScript === "hiragana" && mapDone
                  ? () => setScreen({ kind: "teach", row: 0, i: 0 })
                  : null
              }
              onReview={() => setScreen({ kind: "review-setup" })}
              onAsk={mapScript === "katakana" && mapDone ? () => setScreen({ kind: "ask" }) : null}
            />
          );
        })()}

      {screen.kind === "review-setup" && (
        <ReviewSetupScreen onStart={startReview} onExit={() => goMap()} />
      )}

      {screen.kind === "review" && (
        <QuizEngine
          key={`review-${screen.queue.map((k) => k.kana).join("")}`}
          initialQueue={screen.queue}
          pool={reviewPool(screen.mode)}
          direction={screen.dir}
          exitLabel="← Выйти"
          headerNote="свободный"
          onFirstAnswer={onFirstAnswer}
          onExit={() => setScreen({ kind: "review-setup" })}
          onDone={(result) => {
            track("kana_review_complete", {
              correct: result.correct,
              total: result.total,
              mode: screen.mode,
            });
            setScreen({ kind: "review-summary", mode: screen.mode, dir: screen.dir, result });
          }}
        />
      )}

      {screen.kind === "review-summary" && (
        <ReviewSummaryScreen
          result={screen.result}
          onRetryMistakes={() =>
            startReview(screen.mode, screen.dir, shuffle(screen.result.mistakes))
          }
          onRestart={() => startReview(screen.mode, screen.dir)}
          onExit={() => goMap()}
        />
      )}
    </>
  );
}
