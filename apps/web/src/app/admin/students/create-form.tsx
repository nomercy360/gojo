"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { type CreateStudentState, createStudentAction } from "./actions";

const initial: CreateStudentState = {};

export function CreateStudentForm() {
  const [state, formAction, pending] = useActionState(createStudentAction, initial);

  useEffect(() => {
    if (state.ok) toast.success("Приглашение отправлено");
  }, [state.ok]);

  return (
    <div className="g-card p-6">
      <h2 className="font-serif text-[22px] font-bold">Новый студент</h2>
      <p className="mt-1 text-[13px] text-gojo-ink-muted">
        Создаёт аккаунт и отправляет студенту письмо со ссылкой для установки пароля.
      </p>
      <form action={formAction} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="name">
            Имя
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Как зовут студента?"
            className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="student@example.com"
            className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
            htmlFor="nickname"
          >
            Никнейм <span className="font-normal opacity-60">(необязательно)</span>
          </label>
          <input
            id="nickname"
            name="nickname"
            placeholder="Как будет отображаться в ЛК"
            className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>

        {state.error ? (
          <div className="rounded-md border border-gojo-error/40 bg-gojo-error-soft px-4 py-3 text-sm font-bold text-gojo-error">
            {state.error}
          </div>
        ) : null}

        <button type="submit" disabled={pending} className="g-btn-primary text-sm">
          {pending ? "Создаём..." : "Создать аккаунт"}
        </button>
      </form>
    </div>
  );
}
