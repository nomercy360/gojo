"use client";

import type { QuizQuestionDto, QuizResultDto, QuizSubmitInput } from "@gojo/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitQuizAction, submitQuizLeadAction } from "./actions";

const LEVEL_BLURB: Record<QuizResultDto["level"], { headline: string; body: string }> = {
  N5: {
    headline: "Старт с самых основ",
    body: "Хирагана, катакана, базовые фразы. Подберём группу для начинающих и пойдём с нуля.",
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

export function QuizClient({
  questions,
  isLoggedIn,
}: {
  questions: QuizQuestionDto[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<QuizSubmitInput["answers"] | null>(null);
  const [result, setResult] = useState<QuizResultDto | null>(null);
  const [leadSent, setLeadSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [leadPending, startLeadTransition] = useTransition();

  const total = questions.length;
  const current = questions[index];

  function pick(choiceIndex: number) {
    if (!current) return;
    const next = { ...answers, [current.id]: choiceIndex };
    setAnswers(next);
    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      submit(next);
    }
  }

  function submit(final: Record<string, number>) {
    const payload = buildQuizPayload(final, questions);
    startTransition(async () => {
      try {
        const r = await submitQuizAction(payload);
        setSubmittedAnswers(payload.answers);
        setResult(r);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не удалось сохранить результат");
      }
    });
  }

  function submitLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!submittedAnswers) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();

    startLeadTransition(async () => {
      try {
        const r = await submitQuizLeadAction({
          answers: submittedAnswers,
          name,
          email,
          ...(contact ? { contact } : {}),
        });
        setLeadSent(true);
        toast.success(
          r.emailSent
            ? "Подробный результат отправлен на email"
            : "Заявка сохранена, но email сейчас не отправился",
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не удалось отправить результат");
      }
    });
  }

  if (result) {
    const blurb = LEVEL_BLURB[result.level];
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-xl px-6 py-16">
          <div className="g-mono text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Интересно!
          </div>
          <h1 className="g-display mt-2 text-[36px] font-bold leading-tight text-gojo-ink">
            Похоже, твой уровень — примерно {result.level}
          </h1>
          <p className="g-body mt-2 text-sm text-gojo-ink-muted">
            {result.correct} из {result.total} правильных ответов · это лишь предварительная оценка
          </p>

          <div className="g-card mt-8 p-6">
            <div className="g-display text-[22px] font-bold text-gojo-ink">{blurb.headline}</div>
            <p className="g-body mt-2 text-[15px] leading-relaxed text-gojo-ink-muted">
              {blurb.body}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-black/15 bg-gojo-paper-2 p-5">
            <p className="g-body text-[14px] font-bold text-gojo-ink">
              Получи подробный разбор и план на email
            </p>
            <p className="g-body mt-1.5 text-[13px] leading-relaxed text-gojo-ink-muted">
              Пришлём результат, что подтянуть дальше, и сохраним заявку для преподавателя.
            </p>
            {leadSent ? (
              <div className="mt-4 rounded-md bg-gojo-success-soft px-4 py-3 text-sm font-bold text-gojo-success">
                Готово. Проверь почту, а если хочешь быстрее договориться о времени — напиши в
                Telegram.
              </div>
            ) : (
              <form onSubmit={submitLead} className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="name"
                    required
                    maxLength={200}
                    placeholder="Имя"
                    className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft"
                  />
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={200}
                    placeholder="Email"
                    className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft"
                  />
                </div>
                <input
                  name="contact"
                  maxLength={200}
                  placeholder="Telegram или телефон, если удобно"
                  className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft"
                />
                <button type="submit" disabled={leadPending} className="g-btn-primary text-sm">
                  {leadPending ? "Отправляем..." : "Получить подробный результат →"}
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://t.me/gojoedu"
              target="_blank"
              rel="noopener noreferrer"
              className="g-btn-primary flex-1 text-sm"
            >
              Записаться на консультацию →
            </a>
            {isLoggedIn ? (
              <Link
                href="/lessons"
                className="g-btn-secondary flex-1 text-sm"
                onClick={() => router.refresh()}
              >
                Посмотреть уроки
              </Link>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setAnswers({});
              setSubmittedAnswers(null);
              setResult(null);
              setLeadSent(false);
            }}
            className="g-body mt-3 text-[12px] font-bold text-gojo-ink-muted hover:text-gojo-ink"
          >
            Пройти заново
          </button>
        </div>
      </main>
    );
  }

  if (!current) return null;
  const progress = Math.round(((index + (pending ? 1 : 0)) / total) * 100);

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="g-mono text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Квиз уровня · {index + 1} / {total}
        </div>
        <h1 className="g-display mt-2 text-[28px] font-bold leading-tight text-gojo-ink">
          Прикинем твой уровень JLPT за 2 минуты
        </h1>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-gojo-paper-2">
          <div
            className="h-full bg-gojo-orange transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="g-card mt-8 p-6">
          <p className="g-display text-[20px] font-bold leading-snug text-gojo-ink">
            {current.prompt}
          </p>
          <div className="mt-5 space-y-2.5">
            {current.choices.map((choice, i) => (
              <button
                key={choice}
                type="button"
                disabled={pending}
                onClick={() => pick(i)}
                className="g-body block w-full rounded-md border border-black/10 bg-gojo-paper px-4 py-3 text-left text-[15px] font-bold text-gojo-ink transition-all hover:border-gojo-orange hover:bg-gojo-orange-soft disabled:opacity-50"
              >
                {choice}
              </button>
            ))}
          </div>
        </div>

        <p className="g-body mt-6 text-[11px] text-gojo-ink-muted">
          Не угадываешь — жми любой вариант. Это лишь ориентир: финальный уровень определит
          преподаватель на бесплатной консультации.
        </p>
      </div>
    </main>
  );
}

function buildQuizPayload(
  answers: Record<string, number>,
  questions: QuizQuestionDto[],
): QuizSubmitInput {
  return {
    answers: questions.map((q) => ({
      questionId: q.id,
      choiceIndex: answers[q.id] ?? 0,
    })),
  };
}
