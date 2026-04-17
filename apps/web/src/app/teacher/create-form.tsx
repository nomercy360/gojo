"use client";

import { useActionState } from "react";
import { createLessonAction, type TeacherActionState } from "./actions";

const initial: TeacherActionState = {};

export function CreateLessonForm() {
  const [state, formAction, pending] = useActionState(createLessonAction, initial);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <div className="card-pop rounded-lg border-2 border-gojo-ink bg-gojo-surface p-6">
      <h2 className="font-serif text-[22px] font-bold">Новый урок</h2>
      <form action={formAction} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="title">
            Название
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="Грамматика ～ばかり"
            className="w-full rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="date">
              Дата
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={tomorrow}
              className="w-full rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-2.5 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="time">
              Время
            </label>
            <input
              id="time"
              name="time"
              type="time"
              required
              defaultValue="19:00"
              className="w-full rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-2.5 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
              htmlFor="duration"
            >
              Мин
            </label>
            <select
              id="duration"
              name="duration"
              defaultValue="50"
              className="w-full rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-2.5 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
            >
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="60">60</option>
              <option value="90">90</option>
            </select>
          </div>
        </div>

        {state.error ? (
          <p className="text-sm font-bold text-gojo-error">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm font-bold text-gojo-success">Урок создан!</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="btn-pop w-full rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Создаём..." : "Создать урок"}
        </button>
      </form>
    </div>
  );
}
