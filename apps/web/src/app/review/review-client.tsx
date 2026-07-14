"use client";

import { KanjiModal } from "@/components/kanji-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTrainingHeartbeat } from "@/lib/use-training-heartbeat";
import type { FlashcardDto, ReviewQueueDto } from "@gojo/shared";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { promoteAction, submitReviewAction } from "./actions";

const STAGE_NAMES = ["Seed", "Sprout", "Sapling", "Tree", "Gate", "Temple", "Summit", "Burned"];

type Mode = "unlearned" | "review" | "done";

export function ReviewClient({ initialQueue }: { initialQueue: ReviewQueueDto }) {
  useTrainingHeartbeat("review");
  const [due, setDue] = useState<FlashcardDto[]>(initialQueue.due);
  const [unlearned, setUnlearned] = useState<FlashcardDto[]>(initialQueue.unlearned);
  const [stats] = useState(initialQueue.stats);
  const [flipped, setFlipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const [kanjiOpen, setKanjiOpen] = useState(false);

  const mode: Mode = unlearned.length > 0 ? "unlearned" : due.length > 0 ? "review" : "done";
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

          <Card className="p-10">
            <div className="text-center">
              <Button
                type="button"
                onClick={() => setKanjiOpen(true)}
                variant="ghost"
                className="h-auto font-jp-serif text-[54px] leading-tight font-bold text-gojo-ink hover:text-gojo-orange"
                aria-label="Показать разбор кандзи"
              >
                {current.word}
              </Button>
            </div>

            {flipped || mode === "unlearned" ? (
              <div className="mt-6 border-t border-black/10 pt-5 text-center">
                <div className="font-jp-serif text-[24px] font-bold text-gojo-orange-ink">
                  {current.reading}
                </div>
                <div className="mt-2 text-[18px] font-bold text-gojo-ink">{current.meaning}</div>
              </div>
            ) : null}
          </Card>

          <div className="mt-6">
            {mode === "unlearned" ? (
              <Button type="button" disabled={pending} onClick={learn} className="w-full">
                Понял, в оборот
              </Button>
            ) : !flipped ? (
              <Button
                type="button"
                onClick={() => setFlipped(true)}
                variant="secondary"
                className="w-full bg-gojo-ink text-white hover:bg-gojo-ink/90 hover:text-white"
              >
                Показать ответ
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => answer(false)}
                  variant="destructive"
                >
                  Забыл
                </Button>
                <Button type="button" disabled={pending} onClick={() => answer(true)}>
                  Помню
                </Button>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-[11px] text-gojo-ink-muted">
            Нажми на слово, чтобы посмотреть разбор кандзи.
          </p>
        </div>
      </main>

      <KanjiModal word={current.word} open={kanjiOpen} onClose={() => setKanjiOpen(false)} />
    </>
  );
}
