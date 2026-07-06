"use client";

import { useActionState } from "react";
import { type MaterialUploadState, uploadMaterialAction } from "./actions";

const initial: MaterialUploadState = {};

export function MaterialUploadForm({ lessonId }: { lessonId: string }) {
  const [state, formAction, pending] = useActionState(uploadMaterialAction, initial);

  return (
    <form
      action={formAction}
      className="g-card mt-5 p-4"
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="title">
            Название
          </label>
          <input
            id="title"
            name="title"
            placeholder="Домашнее задание"
            className="w-full rounded-md border border-black/10 bg-gojo-surface-2 px-3 py-2 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="file">
            Файл
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            className="w-full rounded-md border border-black/10 bg-gojo-surface-2 px-3 py-2 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-gojo-ink file:px-3 file:py-1 file:text-xs file:font-bold file:text-white focus:outline-2 focus:outline-gojo-orange-soft"
          />
        </div>
      </div>

      {state.error ? <p className="mt-3 text-sm font-bold text-gojo-error">{state.error}</p> : null}
      {state.ok ? (
        <p className="mt-3 text-sm font-bold text-gojo-success">Материал загружен</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="g-btn-primary mt-3 text-[12px]"
      >
        {pending ? "Загружаем..." : "+ Загрузить материал"}
      </button>
    </form>
  );
}
