"use client";

import type { QuizQuestionDto, QuizResultDto } from "@gojo/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitQuizAction } from "./actions";

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
  const [result, setResult] = useState<QuizResultDto | null>(null);
  const [pending, startTransition] = useTransition();

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
    const payload = {
      answers: questions.map((q) => ({
        questionId: q.id,
        choiceIndex: final[q.id] ?? 0,
      })),
    };
    startTransition(async () => {
      try {
        const r = await submitQuizAction(payload);
        setResult(r);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не удалось сохранить результат");
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
              Теперь проведём бесплатную консультацию с преподавателем
            </p>
            <p className="g-body mt-1.5 text-[13px] leading-relaxed text-gojo-ink-muted">
              Точный уровень и программу обучения преподаватель определит на живом занятии — квиз
              лишь ориентир, чтобы вам обоим было проще начать разговор.
            </p>
          </div>

          {!isLoggedIn ? (
            <p className="g-body mt-6 text-[12px] text-gojo-ink-muted">
              Результат нигде не сохранён.{" "}
              <Link
                href="/login?mode=signup"
                className="font-bold text-gojo-orange hover:underline"
              >
                Зарегистрируйся
              </Link>
              , чтобы он остался в личном кабинете.
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://t.me/gojoedu"
              target="_blank"
              rel="noopener noreferrer"
              className="g-btn-primary flex-1 text-sm"
            >
              Записаться на консультацию →
            </a>
            <Link
              href={isLoggedIn ? "/lessons" : "/login?mode=signup"}
              className="g-btn-secondary flex-1 text-sm"
              onClick={() => router.refresh()}
            >
              {isLoggedIn ? "Посмотреть уроки" : "Зарегистрироваться"}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setAnswers({});
              setResult(null);
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
