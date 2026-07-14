"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
        Слова для запоминания. Автоматически попадают в SRS-пул студентов после того, как урок
        отмечен как пройденный (посещён).
      </p>

      <Card className="mt-5 p-4">
        <form onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="勉強"
              className="font-jp-serif text-[16px]"
            />
            <Input
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="べんきょう"
              className="font-jp-serif text-[16px]"
            />
            <Input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="учёба"
              className="text-[15px]"
            />
          </div>
          <Button type="submit" disabled={pending} className="mt-3" size="sm">
            + Добавить карточку
          </Button>
        </form>
      </Card>

      {cards.length === 0 ? (
        <p className="mt-4 text-sm text-gojo-ink-muted">Пока ничего не добавлено.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {cards.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-black/10 bg-gojo-surface p-3"
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
              <Button
                type="button"
                onClick={() => remove(c.id)}
                disabled={pending}
                className="ml-3 shrink-0"
                variant="destructive"
                size="sm"
              >
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
