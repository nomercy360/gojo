"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const nickname = String(form.get("nickname") ?? "").trim() || undefined;
    const role = (String(form.get("role") ?? "student") as "student" | "teacher") ?? "student";

    try {
      let isNewStudent = false;
      let jlptLevel: string | null = null;
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: nickname || email.split("@")[0]!,
          // biome-ignore lint/suspicious/noExplicitAny: additional fields
          ...({ nickname, role } as any),
        });
        if (res.error) throw new Error(res.error.message ?? "Signup failed");
        toast.success("Аккаунт создан");
        isNewStudent = role === "student";
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message ?? "Invalid credentials");
        toast.success("С возвращением!");
        // biome-ignore lint/suspicious/noExplicitAny: additional fields
        const u = (res.data as any)?.user;
        jlptLevel = u?.jlptLevel ?? null;
        isNewStudent = u?.role === "student" && !jlptLevel;
      }
      router.push(isNewStudent ? "/onboarding/quiz" : "/");
      router.refresh();
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
        <h1 className="mt-2 font-serif text-[28px] font-bold">
          {mode === "signin" ? "Войти" : "Регистрация"}
        </h1>

        {/* Tab switcher */}
        <div className="mt-6 flex gap-1 rounded-md border-2 border-gojo-ink p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`flex-1 rounded px-3 py-1.5 text-[11px] font-bold ${
              mode === "signin"
                ? "bg-gojo-ink text-white"
                : "text-gojo-ink-muted hover:text-gojo-ink"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 rounded px-3 py-1.5 text-[11px] font-bold ${
              mode === "signup"
                ? "bg-gojo-ink text-white"
                : "text-gojo-ink-muted hover:text-gojo-ink"
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
          <Field
            label="Пароль"
            name="password"
            type="password"
            placeholder="минимум 8 символов"
            minLength={8}
            required
          />
          {mode === "signup" ? (
            <>
              <Field label="Никнейм" name="nickname" placeholder="Maksim" />
              <div>
                <label
                  className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
                  htmlFor="role"
                >
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
            </>
          ) : null}

          {error ? (
            <div className="rounded-md border-2 border-gojo-error bg-gojo-error-soft px-4 py-3 text-sm font-bold text-gojo-error">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="btn-pop w-full rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "..." : mode === "signin" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-gojo-ink-muted">
          Регистрация нужна для записи на уроки и видеосвязи.
        </p>
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
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
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
        minLength={minLength}
        className="w-full rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
      />
    </div>
  );
}
