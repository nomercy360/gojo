"use client";

import type { KanjiBreakdownEntry } from "@gojo/shared";
import { useEffect, useState } from "react";

export function KanjiInlineWord({ word, onOpen }: { word: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="font-jp-serif text-inherit hover:text-gojo-orange"
      aria-label={`Разобрать кандзи в ${word}`}
    >
      {word}
    </button>
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
        if (e.name !== "AbortError")
          setError(e instanceof Error ? e.message : "ошибка");
      });
    return () => ac.abort();
  }, [word, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClose();
      }}
      role="button"
      tabIndex={-1}
    >
      <div
        className="w-full max-w-lg rounded-lg border-2 border-gojo-ink bg-gojo-paper p-6 shadow-[3px_3px_0_var(--color-gojo-ink)]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
              Разбор кандзи
            </div>
            <div className="font-jp-serif text-[34px] font-bold">{word}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-1 text-xs font-bold hover:bg-gojo-surface-2"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {error ? (
            <p className="text-sm font-bold text-gojo-error">{error}</p>
          ) : entries === null ? (
            <p className="text-sm text-gojo-ink-muted">Загружаю…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gojo-ink-muted">
              В этом слове нет кандзи — только кана.
            </p>
          ) : (
            entries.map((e) =>
              e.found && e.kanji ? (
                <div
                  key={e.character}
                  className="rounded-md border-2 border-gojo-ink bg-gojo-surface p-4"
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
                            <span className="ml-2 text-gojo-ink-ghost">
                              {e.kanji.onyomi}
                            </span>
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
                            <span className="ml-2 text-gojo-ink-ghost">
                              {e.kanji.kunyomi}
                            </span>
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
                  className="rounded-md border-2 border-dashed border-gojo-ink/30 bg-gojo-surface-2 p-3 text-sm text-gojo-ink-muted"
                >
                  <span className="font-jp-serif text-xl">{e.character}</span> — нет
                  данных в справочнике
                </div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
