"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();

    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (res.error) throw new Error(res.error.message ?? "Не удалось отправить письмо");
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Gojo Learn
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Установить пароль</h1>

        {sent ? (
          <div className="mt-6 rounded-md border border-black/10 bg-gojo-surface px-4 py-3 text-sm text-gojo-ink-soft">
            Если такой email зарегистрирован, мы отправили на него ссылку. Проверь почту (и папку
            «Спам»).
          </div>
        ) : (
          <>
            <p className="mt-2 text-[13px] text-gojo-ink-muted">
              Укажи email — пришлём ссылку, чтобы установить или сбросить пароль.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
                />
              </div>

              {error ? (
                <div className="rounded-md border border-gojo-error/40 bg-gojo-error-soft px-4 py-3 text-sm font-bold text-gojo-error">
                  {error}
                </div>
              ) : null}

              <button type="submit" disabled={pending} className="g-btn-primary w-full text-sm">
                {pending ? "..." : "Отправить ссылку"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-[11px] text-gojo-ink-muted">
          <Link href="/login" className="font-bold text-gojo-orange hover:underline">
            Назад ко входу
          </Link>
        </p>
      </div>
    </main>
  );
}
