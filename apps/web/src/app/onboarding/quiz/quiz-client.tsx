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

export function QuizClient({ questions }: { questions: QuizQuestionDto[] }) {
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
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Готово
          </div>
          <h1 className="mt-2 font-serif text-[36px] font-bold leading-tight">
            Твой уровень — {result.level}
          </h1>
          <p className="mt-2 text-sm text-gojo-ink-muted">
            {result.correct} из {result.total} правильных ответов
          </p>

          <div className="mt-8 rounded-md border-2 border-gojo-ink bg-gojo-surface p-6 shadow-[3px_3px_0_var(--color-gojo-ink)]">
            <div className="font-serif text-[22px] font-bold">{blurb.headline}</div>
            <p className="mt-2 text-[15px] leading-relaxed text-gojo-ink-soft">{blurb.body}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/lessons"
              className="btn-pop flex-1 rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-3 text-center text-sm font-bold text-white"
              onClick={() => router.refresh()}
            >
              Посмотреть уроки {result.level}
            </Link>
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setAnswers({});
                setResult(null);
              }}
              className="rounded-md border-2 border-gojo-ink bg-transparent px-5 py-3 text-sm font-bold text-gojo-ink hover:bg-gojo-surface-2"
            >
              Пройти заново
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!current) return null;
  const progress = Math.round(((index + (pending ? 1 : 0)) / total) * 100);

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Квиз уровня · {index + 1} / {total}
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold leading-tight">
          Определим твой JLPT за 2 минуты
        </h1>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full border border-gojo-ink bg-gojo-surface-2">
          <div
            className="h-full bg-gojo-orange transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-8 rounded-md border-2 border-gojo-ink bg-gojo-surface p-6 shadow-[3px_3px_0_var(--color-gojo-ink)]">
          <p className="font-serif text-[20px] font-bold leading-snug">{current.prompt}</p>
          <div className="mt-5 space-y-2.5">
            {current.choices.map((choice, i) => (
              <button
                key={choice}
                type="button"
                disabled={pending}
                onClick={() => pick(i)}
                className="btn-pop block w-full rounded-md border-2 border-gojo-ink bg-gojo-surface-2 px-4 py-3 text-left text-[15px] font-bold text-gojo-ink hover:bg-gojo-orange-soft disabled:opacity-50"
              >
                {choice}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-[11px] text-gojo-ink-muted">
          Не угадываешь — жми любой вариант. Квиз выставит уровень с запасом, преподаватель скорректирует на пробном уроке.
        </p>
      </div>
    </main>
  );
}
