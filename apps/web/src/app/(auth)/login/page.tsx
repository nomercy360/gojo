"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { telegramBotStartUrl } from "@/lib/telegram";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const REGISTER_URL = telegramBotStartUrl("u_landing_ca_header");

type Challenge = {
  id: string;
  identifier: string;
  channel: "email" | "telegram";
};

// Student-only, passwordless sign-in. Accounts are provisioned by an
// administrator; the Telegram CTA below only starts a conversation with Gojo.
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function requestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalized = identifier.trim();
    if (!normalized) return;
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`${API_URL}/login/code`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: normalized }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        challengeId?: string;
        channel?: "email" | "telegram";
        retryAfter?: number;
        error?: string;
      };
      if (!response.ok || !body.challengeId || !body.channel) {
        if (response.status === 429) {
          setResendIn(body.retryAfter ?? 60);
          throw new Error("too_many_requests");
        }
        throw new Error(body.error ?? "request_failed");
      }
      setChallenge({ id: body.challengeId, identifier: normalized, channel: body.channel });
      setCode("");
      setResendIn(body.retryAfter ?? 60);
      toast.success(
        body.channel === "email" ? "Отправили код на почту" : "Отправили код в Telegram через бота",
      );
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === "too_many_requests"
          ? "Новый код можно запросить чуть позже."
          : "Не удалось отправить код. Проверь данные и попробуй снова.",
      );
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || code.length !== 6) return;
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`${API_URL}/login/code/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, code }),
      });
      if (!response.ok) throw new Error();
      window.location.href = "/dashboard";
    } catch {
      setError("Неверный или просроченный код. Проверь код и попробуй ещё раз.");
    } finally {
      setPending(false);
    }
  }

  function editIdentifier() {
    setChallenge(null);
    setCode("");
    setError(null);
  }

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Gojo Learn
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Вход для студента</h1>

        {!challenge ? (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
            <p className="text-[14px] leading-6 text-gojo-ink-muted">
              Укажи email или ник в Telegram — отправим код подтверждения.
            </p>
            <Field>
              <FieldLabel htmlFor="identifier">Email или Telegram</FieldLabel>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                placeholder="you@example.com или @username"
                required
              />
            </Field>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Отправляем…" : "Получить код"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <p className="text-[14px] leading-6 text-gojo-ink-muted">
              Код отправлен {challenge.channel === "email" ? "на почту" : "в Telegram"}:
            </p>
            <div className="rounded-lg border border-black/10 bg-white/60 px-4 py-3 font-medium">
              {challenge.identifier}
            </div>
            <Button
              type="button"
              variant="link"
              onClick={editIdentifier}
              className="h-auto justify-start p-0 text-gojo-orange"
            >
              Изменить email или Telegram
            </Button>
            <Field>
              <FieldLabel htmlFor="code">Код для входа</FieldLabel>
              <Input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
                autoFocus
              />
            </Field>
            <Button type="submit" disabled={pending || code.length !== 6} className="w-full">
              {pending ? "Проверяем…" : "Войти"}
            </Button>
            <Button
              type="button"
              variant="link"
              disabled={pending || resendIn > 0}
              onClick={() => void requestCode()}
              className="h-auto p-0 text-gojo-orange"
            >
              {resendIn > 0 ? `Получить новый код через ${resendIn} сек.` : "Получить новый код"}
            </Button>
          </form>
        )}

        {error ? (
          <Alert variant="destructive" className="mt-4 bg-gojo-error-soft">
            <AlertDescription className="font-bold text-gojo-error">{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-10 border-t border-black/10 pt-6 text-center text-[14px]">
          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-gojo-orange hover:underline"
          >
            ✈️ Зарегистрироваться
          </a>
          <p className="mt-2 text-[12px] leading-5 text-gojo-ink-muted">
            Откроется разговор с ботом Gojo. Аккаунт создаёт администратор после общения.
          </p>
        </div>

        <p className="mt-6 text-center text-[13px] text-gojo-ink-muted">
          Администратор?{" "}
          <Link href="/admin/login" className="font-bold text-gojo-orange hover:underline">
            Войти в панель
          </Link>
        </p>
      </div>
    </main>
  );
}
