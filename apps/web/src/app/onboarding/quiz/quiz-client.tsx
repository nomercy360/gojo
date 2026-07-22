"use client";

import { BookingModal } from "@/components/booking-modal";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { JlptLevel, QuizQuestionDto, QuizResultDto, QuizSubmitInput } from "@gojo/shared";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitQuizAction } from "./actions";

// ── Design tokens (landing policy, same as the kana trainer) ─────────────────
const C = {
  cream: "#f3ece0",
  cream2: "#efe7d9",
  white: "#ffffff",
  orange: "#ce4a22",
  ink: "#201c18",
  ink2: "#4a443c",
  ink3: "#6b655c",
  muted: "#9c9285",
  border: "#e7decf",
  green: "#3f7d53",
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
function QuizStyles() {
  return (
    <style>{`
      @keyframes gojo-quiz-stamp {
        0% { transform: scale(1.9) rotate(-18deg); opacity: 0; }
        55% { transform: scale(0.86) rotate(6deg); opacity: 1; }
        75% { transform: scale(1.06) rotate(-2deg); }
        100% { transform: scale(1) rotate(-4deg); opacity: 1; }
      }
      .gojo-quiz-stamp { animation: gojo-quiz-stamp 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }
      @keyframes gojo-quiz-rise {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }
      .gojo-quiz-rise { animation: gojo-quiz-rise 0.35s ease both; }
      @media (prefers-reduced-motion: reduce) {
        .gojo-quiz-stamp, .gojo-quiz-rise { animation: none; }
      }
    `}</style>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
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
      <div style={{ width: "100%", maxWidth: 520 }}>{children}</div>
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

// ── Step 1 · declare — self-report frames the assessment ─────────────────────

type StartChoice = "new" | "kana" | "n5" | "n4";

const START_OPTIONS: { key: StartChoice; jp: string; title: string; sub: string }[] = [
  { key: "new", jp: "はじめて", title: "Совсем с нуля", sub: "Пока не знаю ни одного символа" },
  { key: "kana", jp: "かな", title: "Читаю кану", sub: "Хирагана и катакана уже знакомы" },
  { key: "n5", jp: "N5", title: "База есть", sub: "Простая грамматика, первые кандзи" },
  { key: "n4", jp: "N4+", title: "Средний и выше", sub: "Уверенная грамматика, читаю тексты" },
];

/** Where the belief band starts on the N5→N1 scale, by self-declared level. */
const BAND_BASE: Record<StartChoice, number> = { new: 12, kana: 18, n5: 34, n4: 52 };

/** Human label for a self-declared level — enum keys must not leak into copy. */
const DECLARED_LABEL: Record<StartChoice, string> = {
  new: "с нуля",
  kana: "кана",
  n5: "N5",
  n4: "N4+",
};

function servedQuestions(questions: QuizQuestionDto[], declared: StartChoice | null) {
  void declared;
  return questions;
}

function DeclareScreen({ onPick }: { onPick: (choice: StartChoice) => void }) {
  return (
    <Shell>
      <div className="gojo-quiz-rise">
        <Eyebrow hot>Шаг 1 из 3 · тест уровня</Eyebrow>
        <h1
          style={{
            fontFamily: FRAUNCES,
            fontSize: "clamp(28px, 5vw, 38px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: C.ink,
            margin: "10px 0 6px",
            lineHeight: 1.1,
          }}
        >
          С чего начинаешь?
        </h1>
        <p style={{ fontFamily: MANROPE, fontSize: 14, color: C.ink3, marginBottom: 24 }}>
          Примерно — этого достаточно. Дальше уточним за пару минут.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          {START_OPTIONS.map((o) => (
            <Button
              variant="unstyled"
              key={o.key}
              type="button"
              onClick={() => onPick(o.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                textAlign: "left",
                padding: "16px 18px",
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: C.white,
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              <span
                style={{
                  fontFamily: NOTO,
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.orange,
                  minWidth: 84,
                }}
              >
                {o.jp}
              </span>
              <span>
                <span
                  style={{
                    display: "block",
                    fontFamily: MANROPE,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.ink,
                  }}
                >
                  {o.title}
                </span>
                <span
                  style={{
                    display: "block",
                    fontFamily: MANROPE,
                    fontSize: 12.5,
                    color: C.ink3,
                    marginTop: 2,
                  }}
                >
                  {o.sub}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ── Beginner handoff — the quiz can't help a true beginner, kana can ──────────

function BeginnerScreen({ onTakeQuizAnyway }: { onTakeQuizAnyway: () => void }) {
  return (
    <Shell>
      <div className="gojo-quiz-rise" style={{ textAlign: "center" }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 10,
            margin: "0 auto",
            border: `3px solid ${C.orange}`,
            color: C.orange,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: NOTO,
            fontSize: 29,
            fontWeight: 700,
            background: "rgba(232,66,10,0.05)",
            transform: "rotate(-4deg)",
          }}
        >
          始
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
          Тест тебе пока не нужен.
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
          Он различает уровни от N5 и выше. Твой первый шаг — кана: 46 знаков хираганы, и первое
          японское слово ты прочитаешь уже через несколько минут. Бесплатно, без регистрации.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}>
          <a
            href="/kana"
            onClick={() => track("quiz_to_kana")}
            style={{ ...btnPrimary, display: "block", textAlign: "center", textDecoration: "none" }}
          >
            Начать с каны →
          </a>
          <Button variant="unstyled" type="button" onClick={onTakeQuizAnyway} style={btnGhost}>
            Всё равно пройти тест
          </Button>
        </div>
      </div>
    </Shell>
  );
}

// ── Step 2 · calibrate — belief band narrows as answers come in ───────────────

function BeliefBand({ answered, total, base }: { answered: number; total: number; base: number }) {
  // Width shrinks with every answer; the server owns correctness, so the band
  // communicates "estimate converging", not a running score.
  const width = Math.max(12, 62 - (answered / total) * 48);
  const left = Math.min(Math.max(base - width / 2, 1), 99 - width);
  const label =
    answered === 0 ? "широкая оценка" : answered < total ? "уточняем…" : "оценка готова";

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ position: "relative", height: 44 }}>
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 0,
            right: 0,
            height: 6,
            background: C.cream2,
            borderRadius: 3,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 16,
            left: `${left}%`,
            width: `${width}%`,
            height: 10,
            background: "rgba(232,66,10,0.25)",
            border: `1px solid ${C.orange}`,
            borderRadius: 5,
            transition:
              "left 0.5s cubic-bezier(0.2,0.8,0.2,1), width 0.5s cubic-bezier(0.2,0.8,0.2,1)",
          }}
        />
        {["N5", "N4", "N3", "N2", "N1"].map((l, i) => (
          <span
            key={l}
            style={{
              position: "absolute",
              top: 30,
              left: `${i * 25}%`,
              transform: i === 0 ? "none" : i === 4 ? "translateX(-100%)" : "translateX(-50%)",
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 700,
              color: C.muted,
            }}
          >
            {l}
          </span>
        ))}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 700,
          color: C.ink3,
          textAlign: "right",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function QuizScreen({
  questions,
  base,
  pending,
  onSubmit,
}: {
  questions: QuizQuestionDto[];
  base: number;
  pending: boolean;
  onSubmit: (answers: QuizSubmitInput["answers"]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const total = questions.length;
  const current = questions[index];

  const pick = useCallback(
    (choiceIndex: number) => {
      if (!current || pending) return;
      const next = { ...answers, [current.id]: choiceIndex };
      setAnswers(next);
      if (index < total - 1) {
        setIndex(index + 1);
      } else {
        onSubmit(questions.map((q) => ({ questionId: q.id, choiceIndex: next[q.id] ?? -1 })));
      }
    },
    [current, pending, answers, index, total, questions, onSubmit],
  );

  useEffect(() => {
    if (!current) return;
    const handler = (e: KeyboardEvent) => {
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx !== -1 && current.choices[idx] !== undefined) pick(idx);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, pick]);

  if (!current) return null;

  return (
    <Shell>
      <div className="gojo-quiz-rise" key={current.id}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 14,
          }}
        >
          <Eyebrow hot>Шаг 2 из 3</Eyebrow>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: C.ink3 }}>
            вопрос {index + 1} / {total}
          </span>
        </div>

        <BeliefBand answered={index} total={total} base={base} />

        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "26px 22px",
            textAlign: "center",
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          <div
            style={{
              fontFamily: MANROPE,
              fontSize: 19,
              fontWeight: 700,
              color: C.ink,
              lineHeight: 1.45,
            }}
          >
            {current.prompt}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          {current.choices.map((choice, i) => (
            <Button
              variant="unstyled"
              key={choice}
              type="button"
              disabled={pending}
              onClick={() => pick(i)}
              style={{
                position: "relative",
                width: "100%",
                textAlign: "center",
                padding: "14px 40px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
                background: C.white,
                color: C.ink,
                fontFamily: MANROPE,
                fontSize: 15,
                fontWeight: 700,
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.5 : 1,
                transition: "border-color 0.15s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  opacity: 0.55,
                }}
              >
                {i + 1}
              </span>
              {choice}
            </Button>
          ))}
        </div>

        <Button
          variant="unstyled"
          type="button"
          onClick={() => pick(-1)}
          disabled={pending}
          style={quietLink}
        >
          {pending ? "Считаем результат…" : "Не знаю — пропустить"}
        </Button>

        <p
          style={{
            marginTop: 16,
            fontFamily: MONO,
            fontSize: 10,
            color: C.muted,
            letterSpacing: "0.06em",
            textAlign: "center",
          }}
        >
          Клавиши 1–4 для быстрого ответа · пропуск честнее случайного тыка
        </p>
      </div>
    </Shell>
  );
}

// ── Step 3 · result — skip/seed/start map + teacher handoff ───────────────────

const LEVEL_BLURB: Record<QuizResultDto["level"], { headline: string; body: string }> = {
  start: {
    headline: "Уровень уточним на первом уроке",
    body: "Первый шаг — кана: 46 знаков хираганы, первое слово прочитаешь уже через несколько минут. Дальше базовые фразы и грамматика.",
  },
  N5: {
    headline: "Старт с самых основ",
    body: "Базовые фразы и первая грамматика — фундамент, на который ложится всё остальное. Быстро дойдём до первых диалогов.",
  },
  N4: {
    headline: "Уверенный новичок",
    body: "Базовая грамматика и 250+ кандзи. Дальше — глагольные формы и бытовые темы.",
  },
  N3: {
    headline: "Средний уровень",
    body: "Читаешь простые тексты, держишь диалог. Следующий шаг — сложные конструкции и нюансы.",
  },
  N2: {
    headline: "Продвинутый уровень",
    body: "Справляешься с новостями и бизнес-языком. Будем шлифовать стиль и готовиться к сертификации.",
  },
};

const LEVEL_TOPIC: Record<JlptLevel, string> = {
  N5: "база",
  N4: "грамматика",
  N3: "чтение",
  N2: "нюансы",
};

type MapRow = { key: string; label: string; pct: number; declaredOnly: boolean };

/**
 * The map must tell one story: everything below the placement is known
 * (tested or taken on the user's word), exactly one row is the entry point,
 * everything above comes later. A row's tag follows from its position
 * relative to the placement — not from its own percentage alone.
 */
function rowTag(row: MapRow, i: number, placementIdx: number): { text: string; color: string } {
  if (i < placementIdx) {
    return row.declaredOnly
      ? { text: "со слов", color: C.ink2 }
      : { text: "уже знаешь", color: C.green };
  }
  if (i === placementIdx) {
    return row.pct >= 100
      ? { text: "уже знаешь", color: C.green }
      : { text: "начнём отсюда", color: C.orange };
  }
  return row.pct >= 100
    ? { text: "уже знаешь", color: C.green }
    : { text: "дальше", color: C.muted };
}

function ResultScreen({
  result,
  declared,
  isLoggedIn,
  onRetake,
}: {
  result: QuizResultDto;
  declared: StartChoice | null;
  isLoggedIn: boolean;
  onRetake: () => void;
}) {
  const [bookingOpen, setBookingOpen] = useState(false);

  const blurb = LEVEL_BLURB[result.level];
  const isStart = result.level === "start";
  const isDemonstrated = result.assessment === "demonstrated";
  const knowsKana = declared !== null && declared !== "new";

  // Kana is self-declared, not tested — keep that row explicitly separate
  // from the JLPT bands, which are all verified by questions.
  const rows: MapRow[] = [
    ...(declared === null
      ? []
      : [{ key: "kana", label: "Кана", pct: knowsKana ? 100 : 0, declaredOnly: true }]),
    ...(["N5", "N4", "N3", "N2"] as const).map((level): MapRow => {
      const label = `${level} · ${LEVEL_TOPIC[level]}`;
      const scored = result.byLevel.find((b) => b.level === level);
      const pct =
        scored && scored.total > 0 ? Math.round((100 * scored.correct) / scored.total) : 0;
      return { key: level, label, pct, declaredOnly: false };
    }),
  ];
  // Without kana the entry point is kana, whatever the band says — you can't
  // start N5 grammar before you can read it.
  const placementKey = isStart || !knowsKana ? "kana" : result.level;
  const placementIdx = rows.findIndex((r) => r.key === placementKey);

  return (
    <Shell>
      <div className="gojo-quiz-rise" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: -8, right: 0 }}>
          <div
            className="gojo-quiz-stamp"
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
            級
          </div>
        </div>

        <Eyebrow hot>Шаг 3 из 3 · результат</Eyebrow>
        <h1
          style={{
            fontFamily: FRAUNCES,
            fontSize: "clamp(26px, 5vw, 34px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: C.ink,
            margin: "10px 48px 4px 0",
            lineHeight: 1.15,
          }}
        >
          {!isDemonstrated
            ? "Недостаточно ответов для оценки"
            : isStart
              ? "Начнём с самых азов"
              : `Твой старт — уровень ${result.level}`}
        </h1>
        <p style={{ fontFamily: MANROPE, fontSize: 13, color: C.ink3, marginBottom: 20 }}>
          {result.assessment === "declared_only"
            ? `Ориентир со слов: ${declared ? DECLARED_LABEL[declared] : "уровень не указан"}. Подтвердим его на первом уроке.`
            : result.assessment === "insufficient"
              ? `${result.correct} из ${result.total} правильных · уровень пока не определён`
              : `${result.correct} из ${result.total} правильных · ${blurb.headline.toLowerCase()}`}
        </p>

        {/* the map: what to skip, what to seed, where to start */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "20px 22px",
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 14,
            }}
          >
            Твоя карта
          </div>
          <div style={{ display: "grid", gap: 11 }}>
            {rows.map((r, i) => {
              const tag = rowTag(r, i, placementIdx);
              return (
                <div key={r.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{ fontFamily: MANROPE, fontSize: 13, fontWeight: 700, color: C.ink }}
                    >
                      {r.label}
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: tag.color,
                      }}
                    >
                      {tag.text}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 7,
                      background: C.cream2,
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(r.pct, 4)}%`,
                        background: tag.color,
                        borderRadius: 99,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p
            style={{
              fontFamily: MANROPE,
              fontSize: 12.5,
              color: C.ink3,
              marginTop: 14,
              lineHeight: 1.55,
            }}
          >
            {isDemonstrated
              ? blurb.body
              : "Ответов недостаточно, чтобы честно присвоить уровень. Самооценку сохраним только как ориентир, а не как результат теста."}
          </p>
        </div>

        {/* teacher handoff — why the free lesson is the next step */}
        <div
          style={{
            marginTop: 12,
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(232,66,10,0.05)",
            border: "1px solid rgba(232,66,10,0.25)",
          }}
        >
          <p
            style={{
              fontFamily: MANROPE,
              fontSize: 13,
              color: C.ink,
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            Это ориентир по {result.total} вопросам. На бесплатном первом уроке преподаватель
            уточнит картину и соберёт план — чтобы ты не тратил время на то, что уже знаешь.
          </p>
        </div>

        <Button
          variant="unstyled"
          type="button"
          onClick={() => setBookingOpen(true)}
          style={{ ...btnPrimary, marginTop: 14 }}
        >
          Бесплатный урок с преподавателем
        </Button>

        {/* a "start" placement hands off to kana, same as the declare screen */}
        {isStart && (
          <a
            href="/kana"
            onClick={() => track("quiz_to_kana")}
            style={{
              ...btnGhost,
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              marginTop: 10,
            }}
          >
            Начать с каны — бесплатно, без регистрации
          </a>
        )}

        {/* past kana you already consume Japanese content — that's who the miner guide serves */}
        {!isStart && (
          <a
            href="/miner"
            onClick={() => track("quiz_to_miner")}
            style={{
              ...btnGhost,
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              marginTop: 10,
            }}
          >
            Бесплатный гайд: словарь-майнер за 30 минут
          </a>
        )}

        {isLoggedIn ? (
          <a href="/lessons" style={quietLink}>
            ← Мои уроки
          </a>
        ) : null}
        <Button
          variant="unstyled"
          type="button"
          onClick={onRetake}
          style={{ ...quietLink, marginTop: 6 }}
        >
          Пройти заново
        </Button>
      </div>
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} source="quiz" />
    </Shell>
  );
}

// ── Flow state machine: declare → (beginner | quiz) → result ─────────────────

type Stage =
  | { kind: "declare" }
  | { kind: "beginner" }
  | { kind: "quiz" }
  | { kind: "result"; result: QuizResultDto };

export function QuizClient({
  questions,
  isLoggedIn,
}: {
  questions: QuizQuestionDto[];
  isLoggedIn: boolean;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "declare" });
  const [declared, setDeclared] = useState<StartChoice | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    track("quiz_open");
  }, []);

  // Declaration affects framing, but every JLPT band remains in the evidence
  // set so self-confidence cannot silently become a test result.
  const served = useMemo(() => servedQuestions(questions, declared), [questions, declared]);

  const submit = useCallback(
    (answers: QuizSubmitInput["answers"]) => {
      startTransition(async () => {
        try {
          const result = await submitQuizAction({ answers, declared: declared ?? undefined });
          track("quiz_completed", {
            level: result.level,
            assessment: result.assessment,
            correct: result.correct,
            total: result.total,
          });
          setStage({ kind: "result", result });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Не удалось сохранить результат");
        }
      });
    },
    [declared],
  );

  return (
    <>
      <QuizStyles />
      {stage.kind === "declare" && (
        <DeclareScreen
          onPick={(choice) => {
            setDeclared(choice);
            track("quiz_declared", { start: choice });
            setStage(choice === "new" ? { kind: "beginner" } : { kind: "quiz" });
          }}
        />
      )}
      {stage.kind === "beginner" && (
        <BeginnerScreen onTakeQuizAnyway={() => setStage({ kind: "quiz" })} />
      )}
      {stage.kind === "quiz" && (
        <QuizScreen
          questions={served}
          base={BAND_BASE[declared ?? "kana"]}
          pending={pending}
          onSubmit={submit}
        />
      )}
      {stage.kind === "result" && (
        <ResultScreen
          result={stage.result}
          declared={declared}
          isLoggedIn={isLoggedIn}
          onRetake={() => setStage({ kind: "declare" })}
        />
      )}
    </>
  );
}
