"use client";

import type { FlashcardDto, ReviewQueueDto } from "@gojo/shared";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KanjiModal } from "@/components/kanji-modal";
import { promoteAction, submitReviewAction } from "./actions";

const STAGE_NAMES = [
  "Seed",
  "Sprout",
  "Sapling",
  "Tree",
  "Gate",
  "Temple",
  "Summit",
  "Burned",
];

type Mode = "unlearned" | "review" | "done";

export function ReviewClient({ initialQueue }: { initialQueue: ReviewQueueDto }) {
  const [due, setDue] = useState<FlashcardDto[]>(initialQueue.due);
  const [unlearned, setUnlearned] = useState<FlashcardDto[]>(initialQueue.unlearned);
  const [stats] = useState(initialQueue.stats);
  const [flipped, setFlipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const [kanjiOpen, setKanjiOpen] = useState(false);

  const mode: Mode =
    unlearned.length > 0 ? "unlearned" : due.length > 0 ? "review" : "done";
  const current = mode === "unlearned" ? unlearned[0] : due[0];

  function next() {
    setFlipped(false);
    if (mode === "unlearned") {
      setUnlearned((list) => list.slice(1));
    } else {
      setDue((list) => list.slice(1));
    }
  }

  function learn() {
    if (!current) return;
    startTransition(async () => {
      try {
        await promoteAction(current.id);
        toast.success("В работе!");
        next();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Не получилось");
      }
    });
  }

  function answer(correct: boolean) {
    if (!current) return;
    startTransition(async () => {
      try {
        await submitReviewAction(current.id, correct);
        next();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Не получилось");
      }
    });
  }

  if (mode === "done" || !current) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Готово на сегодня
          </div>
          <h1 className="mt-2 font-serif text-[30px] font-bold">
            Очередь пуста — до встречи позже
          </h1>
          <p className="mt-3 text-[15px] text-gojo-ink-soft">
            Всего карточек у тебя: <b>{stats.totalCards}</b>. Из них сожжено (выучено):{" "}
            <b>{stats.burnedCount}</b>. Следующие карточки придут по расписанию.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-xl px-6 py-14">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
              {mode === "unlearned"
                ? `Новые слова · ${unlearned.length} слева`
                : `Повторение · ${due.length} слева`}
            </div>
            <div className="text-[11px] font-bold text-gojo-ink-muted">
              {STAGE_NAMES[current.stage] ?? "—"} · streak {current.streak}
            </div>
          </div>

          <div className="mt-6 rounded-md border-2 border-gojo-ink bg-gojo-surface p-10 shadow-[3px_3px_0_var(--color-gojo-ink)]">
            <div className="text-center">
              <button
                type="button"
                onClick={() => setKanjiOpen(true)}
                className="font-jp-serif text-[54px] leading-tight font-bold text-gojo-ink hover:text-gojo-orange"
                aria-label="Показать разбор кандзи"
              >
                {current.word}
              </button>
            </div>

            {flipped || mode === "unlearned" ? (
              <div className="mt-6 border-t-2 border-gojo-ink/10 pt-5 text-center">
                <div className="font-jp-serif text-[24px] font-bold text-gojo-orange-ink">
                  {current.reading}
                </div>
                <div className="mt-2 text-[18px] font-bold text-gojo-ink">
                  {current.meaning}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            {mode === "unlearned" ? (
              <button
                type="button"
                disabled={pending}
                onClick={learn}
                className="btn-pop w-full rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Понял, в оборот
              </button>
            ) : !flipped ? (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="btn-pop w-full rounded-md border-2 border-gojo-ink bg-gojo-ink px-5 py-3 text-sm font-bold text-white"
              >
                Показать ответ
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => answer(false)}
                  className="btn-pop rounded-md border-2 border-gojo-ink bg-gojo-error-soft px-5 py-3 text-sm font-bold text-gojo-error disabled:opacity-50"
                >
                  Забыл
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => answer(true)}
                  className="btn-pop rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Помню
                </button>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-[11px] text-gojo-ink-muted">
            Нажми на слово, чтобы посмотреть разбор кандзи.
          </p>
        </div>
      </main>

      <KanjiModal
        word={current.word}
        open={kanjiOpen}
        onClose={() => setKanjiOpen(false)}
      />
    </>
  );
}
