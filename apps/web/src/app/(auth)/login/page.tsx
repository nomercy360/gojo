"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Авторизация
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Войти</h1>
        <p className="mt-2 text-sm text-gojo-ink-muted">
          Локальный dev-логин. Реальный OAuth появится позже.
        </p>

        <form action={formAction} className="mt-8 space-y-4">
          <Field label="Email" name="email" type="email" placeholder="you@example.com" required />
          <Field label="Никнейм" name="nickname" placeholder="Maxim" />
          <div>
            <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="role">
              Роль
            </label>
            <select
              id="role"
              name="role"
              defaultValue="student"
              className="w-full rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-2.5 text-[15px] outline-none focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
            >
              <option value="student">Студент</option>
              <option value="teacher">Учитель</option>
            </select>
          </div>

          {state.error ? (
            <div className="rounded-md border-2 border-gojo-error bg-gojo-error-soft px-4 py-3 text-sm font-bold text-gojo-error">
              {state.error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="btn-pop w-full rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
      />
    </div>
  );
}
