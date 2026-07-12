"use client";

import { BookingModal } from "@/components/booking-modal";
import { PhoneField } from "@/components/phone-field";
import { track } from "@/lib/analytics";
import type { JlptLevel, QuizQuestionDto, QuizResultDto, QuizSubmitInput } from "@gojo/shared";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitQuizAction, submitQuizLeadAction } from "./actions";

// ── Design tokens (landing policy, same as the kana trainer) ─────────────────
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
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: C.white,
  fontFamily: MANROPE,
  fontSize: 14,
  color: C.ink,
  outline: "none",
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

// ── Step 1 · declare — self-report prunes for free ────────────────────────────

type StartChoice = "new" | "kana" | "n5" | "n4";

const START_OPTIONS: { key: StartChoice; jp: string; title: string; sub: string }[] = [
  { key: "new", jp: "はじめて", title: "Совсем с нуля", sub: "Пока не знаю ни одного символа" },
  { key: "kana", jp: "かな", title: "Читаю кану", sub: "Хирагана и катакана уже знакомы" },
  { key: "n5", jp: "N5", title: "База есть", sub: "Простая грамматика, первые кандзи" },
  { key: "n4", jp: "N4+", title: "Средний и выше", sub: "Уверенная грамматика, читаю тексты" },
];

/** Where the belief band starts on the N5→N1 scale, by self-declared level. */
const BAND_BASE: Record<StartChoice, number> = { new: 12, kana: 18, n5: 34, n4: 52 };

/**
 * Levels the declaration vouches for — not re-tested, credited "со слов".
 * Must mirror creditedLevels() on the API: the server scores exactly the
 * questions this filter leaves in.
 */
const CREDITED: Record<StartChoice, readonly JlptLevel[]> = {
  new: [],
  kana: [],
  n5: ["N5"],
  n4: ["N5", "N4"],
};

function servedQuestions(questions: QuizQuestionDto[], declared: StartChoice | null) {
  if (!declared) return questions;
  const credited = new Set<JlptLevel>(CREDITED[declared]);
  return questions.filter((q) => !credited.has(q.level));
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
            <button
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
            </button>
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
          <button type="button" onClick={onTakeQuizAnyway} style={btnGhost}>
            Всё равно пройти тест
          </button>
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
            <button
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
            </button>
          ))}
        </div>

        <button type="button" onClick={() => pick(-1)} disabled={pending} style={quietLink}>
          {pending ? "Считаем результат…" : "Не знаю — пропустить"}
        </button>

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
  submittedAnswers,
  isLoggedIn,
  onRetake,
}: {
  result: QuizResultDto;
  declared: StartChoice | null;
  submittedAnswers: QuizSubmitInput["answers"];
  isLoggedIn: boolean;
  onRetake: () => void;
}) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadEmailSent, setLeadEmailSent] = useState(true);
  const [leadPhone, setLeadPhone] = useState<string | undefined>();
  const [leadPending, startLeadTransition] = useTransition();

  const blurb = LEVEL_BLURB[result.level];
  const isStart = result.level === "start";
  const knowsKana = declared !== null && declared !== "new";

  // Kana is self-declared, not tested — an honest row is still useful on the
  // map, and declaration-credited levels show as "со слов", not as tested.
  const credited = new Set<JlptLevel>(declared ? CREDITED[declared] : []);
  const rows: MapRow[] = [
    ...(declared === null
      ? []
      : [{ key: "kana", label: "Кана", pct: knowsKana ? 100 : 0, declaredOnly: true }]),
    ...(["N5", "N4", "N3", "N2"] as const).map((level): MapRow => {
      const label = `${level} · ${LEVEL_TOPIC[level]}`;
      if (credited.has(level)) return { key: level, label, pct: 100, declaredOnly: true };
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

  function submitLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    if (!leadPhone) {
      toast.error("Укажи телефон, чтобы мы отправили подробный результат");
      return;
    }

    startLeadTransition(async () => {
      try {
        const r = await submitQuizLeadAction({
          answers: submittedAnswers,
          declared: declared ?? undefined,
          name,
          email,
          contact: leadPhone,
        });
        setLeadSent(true);
        setLeadEmailSent(r.emailSent);
        track("quiz_lead_submitted", { level: result.level });
        toast.success(r.emailSent ? "Подробный результат отправлен на email" : "Заявка сохранена");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не удалось отправить результат");
      }
    });
  }

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
          {isStart ? "Начнём с самых азов" : `Твой старт — уровень ${result.level}`}
        </h1>
        <p style={{ fontFamily: MANROPE, fontSize: 13, color: C.ink3, marginBottom: 20 }}>
          {result.correct} из {result.total} правильных · {blurb.headline.toLowerCase()}
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
            {blurb.body}
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

        <button
          type="button"
          onClick={() => setBookingOpen(true)}
          style={{ ...btnPrimary, marginTop: 14 }}
        >
          Бесплатный урок с преподавателем
        </button>

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

        {/* lower-commitment ask: detailed result by email */}
        <div
          style={{
            marginTop: 12,
            padding: "18px 20px",
            borderRadius: 14,
            border: "1px dashed rgba(0,0,0,0.16)",
            background: C.cream2,
          }}
        >
          <p
            style={{ fontFamily: MANROPE, fontSize: 14, fontWeight: 700, color: C.ink, margin: 0 }}
          >
            Не готов к уроку? Получи подробный разбор на email
          </p>
          <p
            style={{
              fontFamily: MANROPE,
              fontSize: 12.5,
              color: C.ink3,
              margin: "5px 0 0",
              lineHeight: 1.5,
            }}
          >
            Пришлём результат по темам и что подтянуть дальше.
          </p>
          {leadSent ? (
            <div
              style={{
                marginTop: 12,
                borderRadius: 10,
                background: C.greenBg,
                padding: "12px 14px",
                fontFamily: MANROPE,
                fontSize: 13,
                fontWeight: 700,
                color: C.green,
              }}
            >
              {leadEmailSent
                ? "Готово. Проверь почту — а если хочешь быстрее, напиши нам в Telegram."
                : "Готово. Заявка сохранена, преподаватель увидит твой результат и свяжется."}
            </div>
          ) : (
            <form onSubmit={submitLead} style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <input name="name" required maxLength={200} placeholder="Имя" style={inputStyle} />
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  placeholder="Email"
                  style={inputStyle}
                />
              </div>
              <PhoneField value={leadPhone} onChange={setLeadPhone} />
              <button
                type="submit"
                disabled={leadPending}
                style={{ ...btnInk, padding: "13px", fontSize: 14 }}
              >
                {leadPending ? "Отправляем…" : "Получить разбор на email"}
              </button>
            </form>
          )}
        </div>

        {isLoggedIn ? (
          <a href="/lessons" style={quietLink}>
            ← Мои уроки
          </a>
        ) : (
          !isStart && (
            <a href="/kana" style={quietLink}>
              Тренажёр каны — учись бесплатно
            </a>
          )
        )}
        <button type="button" onClick={onRetake} style={{ ...quietLink, marginTop: 6 }}>
          Пройти заново
        </button>
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
  | { kind: "result"; result: QuizResultDto; answers: QuizSubmitInput["answers"] };

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

  // Declared-known levels are skipped — the declaration is information, so
  // the probe budget goes to the levels that are actually in question.
  const served = useMemo(() => servedQuestions(questions, declared), [questions, declared]);

  const submit = useCallback(
    (answers: QuizSubmitInput["answers"]) => {
      startTransition(async () => {
        try {
          const result = await submitQuizAction({ answers, declared: declared ?? undefined });
          track("quiz_completed", { level: result.level, correct: result.correct });
          setStage({ kind: "result", result, answers });
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
          submittedAnswers={stage.answers}
          isLoggedIn={isLoggedIn}
          onRetake={() => setStage({ kind: "declare" })}
        />
      )}
    </>
  );
}
