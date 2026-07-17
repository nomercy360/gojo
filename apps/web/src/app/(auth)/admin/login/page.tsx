"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CodeInput } from "../../code-input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Admin passwordless sign-in: one request sends BOTH a 6-digit code and a
// magic link to the work email (and Telegram, if linked). The link signs in
// directly; the code is entered here.
export default function AdminLoginPage() {
  const [step, setStep] = useState<"identify" | "code">("identify");
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalized = email.trim();
    if (!normalized || pending) return;

    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const response = await fetch(`${API_URL}/login/code`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: normalized, role: "admin" }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        challengeId?: string;
        retryAfter?: number;
        error?: string;
      };

      if (response.status === 404) {
        // Deliberately generic — don't confirm which emails are admin accounts.
        setNotice(
          "Если этот адрес принадлежит администратору, код и ссылка для входа уже отправлены.",
        );
        return;
      }
      if (response.status === 429) {
        setResendIn(body.retryAfter ?? 60);
        throw new Error("too_many_requests");
      }
      if (!response.ok || !body.challengeId) throw new Error(body.error ?? "request_failed");

      setChallengeId(body.challengeId);
      setCode("");
      setResendIn(body.retryAfter ?? 60);
      setStep("code");
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === "too_many_requests"
          ? "Новый код можно запросить чуть позже."
          : "Не удалось отправить код. Проверь адрес и попробуй снова.",
      );
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengeId || code.length !== 6 || pending) return;

    setError(null);
    setPending(true);
    try {
      const response = await fetch(`${API_URL}/login/code/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      if (!response.ok) throw new Error();
      window.location.href = "/teacher";
    } catch {
      setError("Неверный или просроченный код. Проверь код и попробуй ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Gojo Learn · Admin
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Вход для администратора</h1>

        {step === "identify" ? (
          <>
            <p className="mt-3 text-sm text-gojo-ink-muted">
              Отправим на рабочий email код и ссылку — войти можно любым способом.
            </p>
            <form onSubmit={requestCode} className="mt-6 space-y-4">
              <Field>
                <FieldLabel htmlFor="email">Рабочий email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Button type="submit" disabled={pending || !email.trim()} className="w-full">
                {pending ? "Отправляем…" : "Получить код и ссылку"}
              </Button>
            </form>
          </>
        ) : null}

        {step === "code" ? (
          <form onSubmit={verifyCode} className="mt-6">
            <p className="mb-6 text-center text-sm text-gojo-ink-muted">
              Введи код из письма — или просто перейди по ссылке в нём.
            </p>
            <CodeInput value={code} onChange={setCode} />
            <Button
              type="submit"
              disabled={pending || code.length !== 6}
              className="mt-5 w-full"
              size="lg"
            >
              {pending ? "Проверяем…" : "Подтвердить"}
              {!pending ? <ShieldCheck aria-hidden="true" /> : null}
            </Button>
            <div className="mt-4 text-center text-[13.5px]">
              {resendIn > 0 ? (
                <span className="text-gojo-ink-muted">
                  Отправить снова через 0:{String(resendIn).padStart(2, "0")}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void requestCode()}
                  className="font-semibold text-gojo-orange hover:underline disabled:opacity-50"
                >
                  Отправить повторно
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("identify");
                setChallengeId(null);
                setCode("");
                setError(null);
              }}
              className="mx-auto mt-6 flex items-center gap-1.5 text-sm text-gojo-ink-muted hover:text-gojo-ink"
            >
              <ArrowLeft aria-hidden="true" className="size-[15px]" />
              Другой адрес
            </button>
          </form>
        ) : null}

        {notice ? (
          <Alert className="mt-4 border-gojo-orange/30">
            <AlertDescription className="text-gojo-ink">{notice}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" className="mt-4 bg-gojo-error-soft" aria-live="polite">
            <AlertDescription className="font-bold text-gojo-error">{error}</AlertDescription>
          </Alert>
        ) : null}

        <p className="mt-8 text-center text-[13px] text-gojo-ink-muted">
          <Link href="/login" className="font-bold text-gojo-orange hover:underline">
            Вход для студента
          </Link>
        </p>
      </div>
    </main>
  );
}
