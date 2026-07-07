"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Ссылка недействительна. Запроси новую.");
      return;
    }

    const newPassword = String(new FormData(e.currentTarget).get("password") ?? "");
    if (newPassword.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }

    setPending(true);
    try {
      const res = await authClient.resetPassword({ newPassword, token });
      if (res.error) throw new Error(res.error.message ?? "Не удалось установить пароль");
      router.push("/login");
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
        <h1 className="mt-2 font-serif text-[28px] font-bold">Новый пароль</h1>

        {!token ? (
          <div className="mt-6 rounded-md border border-gojo-error/40 bg-gojo-error-soft px-4 py-3 text-sm font-bold text-gojo-error">
            Ссылка недействительна или устарела.{" "}
            <Link href="/forgot-password" className="underline">
              Запросить новую
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
                htmlFor="password"
              >
                Новый пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="минимум 8 символов"
                minLength={8}
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
              {pending ? "..." : "Установить пароль"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
