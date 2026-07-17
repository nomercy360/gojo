"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { telegramBotStartUrl } from "@/lib/telegram";
import { ArrowLeft, ArrowRight, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CodeInput } from "../code-input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const REGISTER_URL = telegramBotStartUrl("u_landing_ca_header");

type DeliveryChannel = {
  type: "email" | "telegram";
  label: string;
};

type Challenge = {
  id: string;
  channels: DeliveryChannel[];
};

function isValidIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return true;
  const username = normalized
    .replace(/^https?:\/\//, "")
    .replace(/^t\.me\//, "")
    .replace(/^@/, "");
  return /^[a-z0-9_]{5,32}$/.test(username);
}

function ChannelsLine({ channels }: { channels: DeliveryChannel[] }) {
  const email = channels.find((channel) => channel.type === "email");
  const telegram = channels.find((channel) => channel.type === "telegram");

  if (email && telegram) {
    return (
      <>
        на <strong className="font-semibold text-foreground">{email.label}</strong> и в Telegram (
        <strong className="font-semibold text-foreground">{telegram.label}</strong>)
      </>
    );
  }
  if (email) {
    return (
      <>
        на <strong className="font-semibold text-foreground">{email.label}</strong>
      </>
    );
  }
  if (telegram) {
    return (
      <>
        в Telegram (<strong className="font-semibold text-foreground">{telegram.label}</strong>)
      </>
    );
  }
  return <>если аккаунт существует и к нему привязан доступный канал</>;
}

// Student-only, passwordless sign-in. Accounts are provisioned by an
// administrator; the Telegram CTA below starts a conversation with Gojo.
export default function LoginPage() {
  const [step, setStep] = useState<"identify" | "code" | "notfound">("identify");
  const [identifier, setIdentifier] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const validIdentifier = isValidIdentifier(identifier);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalized = identifier.trim();
    if (!isValidIdentifier(normalized) || pending) return;

    setError(null);
    setPending(true);
    try {
      const response = await fetch(`${API_URL}/login/code`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: normalized, role: "student" }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        challengeId?: string;
        channels?: DeliveryChannel[];
        retryAfter?: number;
        error?: string;
      };

      if (response.status === 404 && body.error === "account_not_found") {
        setChallenge(null);
        setStep("notfound");
        return;
      }
      if (response.status === 429) {
        setResendIn(body.retryAfter ?? 60);
        throw new Error("too_many_requests");
      }
      if (!response.ok || !body.challengeId || !Array.isArray(body.channels)) {
        throw new Error(body.error ?? "request_failed");
      }

      setChallenge({ id: body.challengeId, channels: body.channels });
      setCode("");
      setResendIn(body.retryAfter ?? 60);
      setStep("code");
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
    if (!challenge || code.length !== 6 || pending) return;

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

  function returnToIdentify() {
    setStep("identify");
    setChallenge(null);
    setCode("");
    setError(null);
  }

  return (
    <main className="g-body min-h-[calc(100svh-53px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[448px] px-6 py-14">
        <div className="mx-auto w-full max-w-[400px]">
          <header className="mb-[30px] text-center">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Gojo Learn
            </div>
            <h1 className="mt-3 text-[38px] leading-[1.15] font-semibold tracking-[-0.01em]">
              Вход для студента
            </h1>
          </header>

          {step === "identify" ? (
            <>
              <p className="mb-[26px] text-center text-[15px] leading-6 text-muted-foreground">
                Укажи email или ник в Telegram. Отправим код и ссылку для входа на все привязанные
                каналы.
              </p>
              <form onSubmit={requestCode}>
                <label htmlFor="identifier" className="mb-2 block text-sm font-semibold">
                  Email или Telegram
                </label>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  placeholder="you@example.com или @username"
                  aria-invalid={error ? true : undefined}
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={!validIdentifier || pending}
                  className="mt-[14px] w-full"
                >
                  {pending ? "Отправляем…" : "Получить код"}
                  {!pending ? <ArrowRight aria-hidden="true" /> : null}
                </Button>
              </form>

              <section className="mt-[30px] border-t border-border pt-[26px] text-center">
                <h2 className="text-[19px] leading-6 font-semibold">Ещё не занимаешься у нас?</h2>
                <p className="mt-1.5 mb-4 text-[13.5px] leading-5 text-muted-foreground">
                  Оставь заявку в Telegram — договоримся о пробном уроке. Аккаунт заведёт
                  администратор после него.
                </p>
                <Button asChild variant="outline" size="lg" className="w-full border-border">
                  <a href={REGISTER_URL} target="_blank" rel="noopener noreferrer">
                    <Send aria-hidden="true" className="text-[#2AABEE]" />
                    Оставить заявку
                  </a>
                </Button>
              </section>
            </>
          ) : null}

          {step === "code" && challenge ? (
            <form onSubmit={verifyCode}>
              <p className="mb-2 text-center text-[15px] leading-6 text-muted-foreground">
                Код и ссылка отправлены <ChannelsLine channels={challenge.channels} />.
              </p>
              <p className="mb-6 text-center text-[13px] text-muted-foreground/80">
                Введи код из любого канала — или войди по ссылке из письма / кнопке в Telegram.
              </p>
              <CodeInput value={code} onChange={setCode} />
              <Button
                type="submit"
                size="lg"
                disabled={pending || code.length !== 6}
                className="mt-[22px] w-full"
              >
                {pending ? "Проверяем…" : "Подтвердить"}
                {!pending ? <ShieldCheck aria-hidden="true" /> : null}
              </Button>
              <div className="mt-[18px] text-center text-[13.5px]">
                {resendIn > 0 ? (
                  <span className="text-muted-foreground/80">
                    Отправить снова через 0:{String(resendIn).padStart(2, "0")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void requestCode()}
                    className="font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    Отправить код повторно
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={returnToIdentify}
                className="mx-auto mt-[26px] flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft aria-hidden="true" className="size-[15px]" />
                Другой аккаунт
              </button>
            </form>
          ) : null}

          {step === "notfound" ? (
            <>
              <div className="rounded-2xl border border-gojo-orange-soft bg-gojo-orange-softer p-6 text-center">
                <h2 className="text-[22px] leading-7 font-semibold">Аккаунт не найден</h2>
                <p className="mt-2.5 text-sm leading-[1.55] text-muted-foreground">
                  Мы заводим аккаунты вручную — после заявки и пробного урока. Оставь заявку в
                  Telegram, и мы договоримся.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="mt-[18px] w-full border-border"
              >
                <a href={REGISTER_URL} target="_blank" rel="noopener noreferrer">
                  <Send aria-hidden="true" className="text-[#2AABEE]" />
                  Оставить заявку
                </a>
              </Button>
              <button
                type="button"
                onClick={returnToIdentify}
                className="mx-auto mt-[22px] flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft aria-hidden="true" className="size-[15px]" />
                Назад ко входу
              </button>
            </>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mt-4 bg-gojo-error-soft" aria-live="polite">
              <AlertDescription className="font-bold text-gojo-error">{error}</AlertDescription>
            </Alert>
          ) : null}

          <p className="mt-[34px] text-center text-[13px] text-muted-foreground/70">
            Администратор?{" "}
            <Link
              href="/admin/login"
              className="font-semibold text-muted-foreground hover:underline"
            >
              Войти в панель
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
