"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { telegramBotStartUrl } from "@/lib/telegram";
import { ArrowLeft, ArrowRight, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

const CODE_POSITIONS = ["first", "second", "third", "fourth", "fifth", "sixth"] as const;

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
        на <strong className="font-semibold text-[#201C18]">{email.label}</strong> и в Telegram (
        <strong className="font-semibold text-[#201C18]">{telegram.label}</strong>)
      </>
    );
  }
  if (email) {
    return (
      <>
        на <strong className="font-semibold text-[#201C18]">{email.label}</strong>
      </>
    );
  }
  if (telegram) {
    return (
      <>
        в Telegram (<strong className="font-semibold text-[#201C18]">{telegram.label}</strong>)
      </>
    );
  }
  return <>если аккаунт существует и к нему привязан доступный канал</>;
}

function CodeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function writeFrom(index: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) {
      const next = [...digits];
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    const next = [...digits];
    for (let offset = 0; offset < incoming.length && index + offset < 6; offset += 1) {
      next[index + offset] = incoming[offset] ?? "";
    }
    onChange(next.join(""));
    refs.current[Math.min(index + incoming.length, 5)]?.focus();
  }

  return (
    <fieldset>
      <legend className="sr-only">Код для входа</legend>
      <div className="flex justify-center gap-2">
        {CODE_POSITIONS.map((position, index) => (
          <input
            key={position}
            ref={(element) => {
              refs.current[index] = element;
            }}
            aria-label={`Цифра кода ${index + 1}`}
            value={digits[index]}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={index === 0 ? 6 : 1}
            onChange={(event) => writeFrom(index, event.target.value)}
            onPaste={(event) => {
              event.preventDefault();
              writeFrom(index, event.clipboardData.getData("text"));
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index] && index > 0) {
                refs.current[index - 1]?.focus();
              }
              if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
              if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
            }}
            className="g-display h-14 w-12 rounded-xl border-[1.5px] bg-white text-center text-2xl font-semibold text-[#201C18] outline-none transition-[border-color,box-shadow] focus:border-[#CE4A22] focus:ring-4 focus:ring-[#FCF1EB]"
            style={{ borderColor: digits[index] ? "#CE4A22" : undefined }}
          />
        ))}
      </div>
    </fieldset>
  );
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
        body: JSON.stringify({ identifier: normalized }),
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
    <main className="g-body min-h-[calc(100svh-53px)] bg-[#F3ECE0] text-[#201C18]">
      <div className="mx-auto w-full max-w-[448px] px-6 py-14">
        <div className="mx-auto w-full max-w-[400px]">
          <header className="mb-[30px] text-center">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#CE4A22]">
              Gojo Learn
            </div>
            <h1 className="mt-3 text-[38px] leading-[1.15] font-semibold tracking-[-0.01em]">
              Вход для студента
            </h1>
          </header>

          {step === "identify" ? (
            <>
              <p className="mb-[26px] text-center text-[15px] leading-6 text-[#6B655C]">
                Укажи email или ник в Telegram. Код придёт на все привязанные каналы.
              </p>
              <form onSubmit={requestCode}>
                <label htmlFor="identifier" className="mb-2 block text-sm font-semibold">
                  Email или Telegram
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  placeholder="you@example.com или @username"
                  aria-invalid={error ? true : undefined}
                  className="h-[51px] w-full rounded-xl border-[1.5px] border-[#E7DECF] bg-white px-[15px] text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-[#9CA3AF] focus:border-[#CE4A22] focus:ring-4 focus:ring-[#FCF1EB]"
                />
                <button
                  type="submit"
                  disabled={!validIdentifier || pending}
                  className="mt-[14px] inline-flex h-[51px] w-full items-center justify-center gap-2 rounded-xl bg-[#CE4A22] text-[15px] font-semibold text-white transition-colors hover:bg-[#B93E1B] disabled:cursor-default disabled:bg-[#BCB3A3]"
                >
                  {pending ? "Отправляем…" : "Получить код"}
                  {!pending ? <ArrowRight aria-hidden="true" className="size-[17px]" /> : null}
                </button>
              </form>

              <section className="mt-[30px] border-t border-[#E7DECF] pt-[26px] text-center">
                <h2 className="text-[19px] leading-6 font-semibold">Ещё не занимаешься у нас?</h2>
                <p className="mt-1.5 mb-4 text-[13.5px] leading-5 text-[#6B655C]">
                  Оставь заявку в Telegram — договоримся о пробном уроке. Аккаунт заведёт
                  администратор после него.
                </p>
                <a
                  href={REGISTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-[#E7DECF] bg-white text-[15px] font-semibold transition-colors hover:bg-[#F6F0E6]"
                >
                  <Send aria-hidden="true" className="size-[18px] text-[#2AABEE]" />
                  Оставить заявку
                </a>
              </section>
            </>
          ) : null}

          {step === "code" && challenge ? (
            <form onSubmit={verifyCode}>
              <p className="mb-2 text-center text-[15px] leading-6 text-[#6B655C]">
                Код отправлен <ChannelsLine channels={challenge.channels} />.
              </p>
              <p className="mb-6 text-center text-[13px] text-[#9C9285]">
                Введи его из любого канала — код один.
              </p>
              <CodeInput value={code} onChange={setCode} />
              <button
                type="submit"
                disabled={pending || code.length !== 6}
                className="mt-[22px] inline-flex h-[51px] w-full items-center justify-center gap-2 rounded-xl bg-[#CE4A22] text-[15px] font-semibold text-white transition-colors hover:bg-[#B93E1B] disabled:cursor-default disabled:bg-[#BCB3A3]"
              >
                {pending ? "Проверяем…" : "Подтвердить"}
                {!pending ? <ShieldCheck aria-hidden="true" className="size-[17px]" /> : null}
              </button>
              <div className="mt-[18px] text-center text-[13.5px]">
                {resendIn > 0 ? (
                  <span className="text-[#9C9285]">
                    Отправить снова через 0:{String(resendIn).padStart(2, "0")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void requestCode()}
                    className="font-semibold text-[#CE4A22] hover:underline disabled:opacity-50"
                  >
                    Отправить код повторно
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={returnToIdentify}
                className="mx-auto mt-[26px] flex items-center gap-1.5 text-sm text-[#6B655C] hover:text-[#201C18]"
              >
                <ArrowLeft aria-hidden="true" className="size-[15px]" />
                Другой аккаунт
              </button>
            </form>
          ) : null}

          {step === "notfound" ? (
            <>
              <div className="rounded-2xl border border-[#FBE7DD] bg-[#FCF1EB] p-6 text-center">
                <h2 className="text-[22px] leading-7 font-semibold">Аккаунт не найден</h2>
                <p className="mt-2.5 text-sm leading-[1.55] text-[#6B655C]">
                  Мы заводим аккаунты вручную — после заявки и пробного урока. Оставь заявку в
                  Telegram, и мы договоримся.
                </p>
              </div>
              <a
                href={REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[18px] inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-[#E7DECF] bg-white text-[15px] font-semibold transition-colors hover:bg-[#F6F0E6]"
              >
                <Send aria-hidden="true" className="size-[18px] text-[#2AABEE]" />
                Оставить заявку
              </a>
              <button
                type="button"
                onClick={returnToIdentify}
                className="mx-auto mt-[22px] flex items-center gap-1.5 text-sm text-[#6B655C] hover:text-[#201C18]"
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

          <p className="mt-[34px] text-center text-[13px] text-[#BCB3A3]">
            Администратор?{" "}
            <Link href="/admin/login" className="font-semibold text-[#9C9285] hover:underline">
              Войти в панель
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
