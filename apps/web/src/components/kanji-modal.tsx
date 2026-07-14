"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { KanjiBreakdownEntry } from "@gojo/shared";
import { useEffect, useState } from "react";

export function KanjiInlineWord({ word, onOpen }: { word: string; onOpen: () => void }) {
  return (
    <Button
      type="button"
      onClick={onOpen}
      variant="link"
      className="h-auto p-0 font-jp-serif text-inherit hover:text-gojo-orange"
      aria-label={`Разобрать кандзи в ${word}`}
    >
      {word}
    </Button>
  );
}

export function KanjiModal({
  word,
  open,
  onClose,
}: {
  word: string;
  open: boolean;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<KanjiBreakdownEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEntries(null);
    setError(null);
    const ac = new AbortController();
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/kanji/breakdown?word=${encodeURIComponent(word)}`,
      { credentials: "include", signal: ac.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`api ${r.status}`);
        return r.json() as Promise<KanjiBreakdownEntry[]>;
      })
      .then(setEntries)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e instanceof Error ? e.message : "ошибка");
      });
    return () => ac.abort();
  }, [word, open]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle asChild>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
                Разбор кандзи
              </div>
              <div className="font-jp-serif text-[34px] font-bold">{word}</div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Чтения, значение, ключ и примеры для кандзи в слове {word}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {error ? (
            <p className="text-sm font-bold text-gojo-error">{error}</p>
          ) : entries === null ? (
            <div className="space-y-3" aria-label="Загружаю разбор">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gojo-ink-muted">В этом слове нет кандзи — только кана.</p>
          ) : (
            entries.map((e) =>
              e.found && e.kanji ? (
                <div
                  key={e.character}
                  className="rounded-md border border-black/10 bg-gojo-surface p-4"
                >
                  <div className="flex items-baseline gap-4">
                    <div className="font-jp-serif text-[44px] leading-none">
                      {e.kanji.character}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gojo-ink">{e.kanji.meaning}</div>
                      <div className="mt-1 text-[12px] text-gojo-ink-muted">
                        {e.kanji.strokeCount} черт
                        {e.kanji.grade !== null ? ` · кю-класс ${e.kanji.grade}` : ""}
                      </div>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-[70px_1fr] gap-y-1.5 text-[13px]">
                    {e.kanji.onyomiJa ? (
                      <>
                        <dt className="font-bold text-gojo-ink-muted">Он</dt>
                        <dd>
                          <span className="font-jp-serif">{e.kanji.onyomiJa}</span>
                          {e.kanji.onyomi ? (
                            <span className="ml-2 text-gojo-ink-ghost">{e.kanji.onyomi}</span>
                          ) : null}
                        </dd>
                      </>
                    ) : null}
                    {e.kanji.kunyomiJa ? (
                      <>
                        <dt className="font-bold text-gojo-ink-muted">Кун</dt>
                        <dd>
                          <span className="font-jp-serif">{e.kanji.kunyomiJa}</span>
                          {e.kanji.kunyomi ? (
                            <span className="ml-2 text-gojo-ink-ghost">{e.kanji.kunyomi}</span>
                          ) : null}
                        </dd>
                      </>
                    ) : null}
                    {e.kanji.radical ? (
                      <>
                        <dt className="font-bold text-gojo-ink-muted">Ключ</dt>
                        <dd>
                          <span className="font-jp-serif">{e.kanji.radical}</span>
                          <span className="ml-2 text-gojo-ink-ghost">
                            {e.kanji.radMeaning ?? e.kanji.radName ?? ""}
                          </span>
                        </dd>
                      </>
                    ) : null}
                  </dl>
                  {e.kanji.examples && e.kanji.examples.length > 0 ? (
                    <div className="mt-3 border-t border-gojo-ink/10 pt-3 text-[12px]">
                      <div className="font-bold text-gojo-ink-muted">Примеры:</div>
                      <ul className="mt-1.5 space-y-1">
                        {e.kanji.examples.slice(0, 4).map((ex) => (
                          <li key={ex[0]} className="flex gap-2">
                            <span className="font-jp-serif">{ex[0]}</span>
                            <span className="text-gojo-ink-muted">— {ex[1]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  key={e.character}
                  className="rounded-md border border-dashed border-black/15 bg-gojo-paper-2 p-3 text-sm text-gojo-ink-muted"
                >
                  <span className="font-jp-serif text-xl">{e.character}</span> — нет данных в
                  справочнике
                </div>
              ),
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
