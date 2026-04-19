"use client";

import type { LessonCardDto } from "@gojo/shared";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addLessonCardAction, deleteLessonCardAction } from "./card-actions";

export function LessonCardsManager({
  lessonId,
  initialCards,
}: {
  lessonId: string;
  initialCards: LessonCardDto[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [pending, startTransition] = useTransition();
  const [word, setWord] = useState("");
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!word.trim() || !reading.trim() || !meaning.trim()) {
      toast.error("Заполни все поля");
      return;
    }
    startTransition(async () => {
      try {
        const created = await addLessonCardAction(lessonId, {
          word: word.trim(),
          reading: reading.trim(),
          meaning: meaning.trim(),
        });
        setCards((list) => [...list, created]);
        setWord("");
        setReading("");
        setMeaning("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось");
      }
    });
  }

  function remove(cardId: string) {
    startTransition(async () => {
      try {
        await deleteLessonCardAction(lessonId, cardId);
        setCards((list) => list.filter((c) => c.id !== cardId));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось");
      }
    });
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif text-[22px] font-bold">Карточки к уроку</h2>
      <p className="mt-1 text-[13px] text-gojo-ink-muted">
        Слова для запоминания. Автоматически попадают в SRS-пул студентов после
        записи на урок.
      </p>

      <form
        onSubmit={submit}
        className="mt-5 rounded-md border-2 border-gojo-ink bg-gojo-surface p-4 shadow-[3px_3px_0_var(--color-gojo-ink)]"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="勉強"
            className="rounded-md border-2 border-gojo-ink bg-gojo-surface-2 px-3 py-2 font-jp-serif text-[16px] outline-none focus:outline-2 focus:outline-gojo-orange-soft"
          />
          <input
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            placeholder="べんきょう"
            className="rounded-md border-2 border-gojo-ink bg-gojo-surface-2 px-3 py-2 font-jp-serif text-[16px] outline-none focus:outline-2 focus:outline-gojo-orange-soft"
          />
          <input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="учёба"
            className="rounded-md border-2 border-gojo-ink bg-gojo-surface-2 px-3 py-2 text-[15px] outline-none focus:outline-2 focus:outline-gojo-orange-soft"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn-pop mt-3 rounded-md border-2 border-gojo-ink bg-gojo-orange px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
        >
          + Добавить карточку
        </button>
      </form>

      {cards.length === 0 ? (
        <p className="mt-4 text-sm text-gojo-ink-muted">Пока ничего не добавлено.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {cards.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border-2 border-gojo-ink bg-gojo-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-jp-serif text-[22px] font-bold">{c.word}</span>
                  <span className="font-jp-serif text-[14px] text-gojo-orange-ink">
                    {c.reading}
                  </span>
                </div>
                <div className="text-[13px] text-gojo-ink-muted">{c.meaning}</div>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={pending}
                className="ml-3 shrink-0 rounded-md border-2 border-gojo-ink px-2.5 py-1 text-[11px] font-bold text-gojo-ink-muted hover:bg-gojo-error-soft hover:text-gojo-error disabled:opacity-50"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
