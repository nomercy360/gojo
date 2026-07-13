"use client";

import { BookingModal } from "@/components/booking-modal";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";

// Passwordless. Primary: Telegram (better-auth genericOAuth, full-page
// redirect). Secondary: email magic link. No self-signup form — a first login
// via either method creates the account. Post-login lead/progress linking runs
// from the header on the first authenticated page (see post-login-sync).
export default function LoginPage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [telegramPending, setTelegramPending] = useState(false);
  const [magicPending, setMagicPending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  async function handleTelegram() {
    if (!privacyAccepted) {
      setError("Подтверди согласие на обработку персональных данных.");
      return;
    }
    localStorage.setItem("gojo:pending-personal-data-consent", "2026-07-13");
    setError(null);
    setTelegramPending(true);
    try {
      // Absolute URLs against the web origin: locally the API origin differs
      // from the web origin, so a relative callback would resolve to the API.
      const res = await authClient.signIn.oauth2({
        providerId: "telegram",
        callbackURL: `${window.location.origin}/dashboard`,
        errorCallbackURL: `${window.location.origin}/login?error=telegram`,
      });
      // The client usually navigates itself; fall back to the returned URL.
      const url = res?.data && "url" in res.data ? (res.data.url as string | undefined) : undefined;
      if (url) window.location.href = url;
      else if (res?.error) throw new Error(res.error.message ?? "telegram_failed");
    } catch {
      setError("Не удалось начать вход через Telegram. Попробуй ещё раз.");
      setTelegramPending(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!privacyAccepted) {
      setError("Подтверди согласие на обработку персональных данных.");
      return;
    }
    localStorage.setItem("gojo:pending-personal-data-consent", "2026-07-13");
    setError(null);
    setMagicPending(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    try {
      const res = await authClient.signIn.magicLink({
        email,
        callbackURL: `${window.location.origin}/dashboard`,
      });
      if (res.error) throw new Error(res.error.message ?? "magic_link_failed");
      setMagicSent(true);
      toast.success("Проверь почту — отправили ссылку для входа");
    } catch {
      setError("Не удалось отправить ссылку. Проверь адрес и попробуй снова.");
    } finally {
      setMagicPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Gojo Learn
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Войти</h1>

        <button
          type="button"
          onClick={handleTelegram}
          disabled={telegramPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[#28a8e9] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {telegramPending ? "Открываем Telegram…" : "✈️ Войти через Telegram"}
        </button>

        <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-gojo-ink-ghost">
          <span className="h-px flex-1 bg-black/10" />
          или по email
          <span className="h-px flex-1 bg-black/10" />
        </div>

        {magicSent ? (
          <div className="rounded-md border border-gojo-orange/30 bg-gojo-surface px-4 py-4 text-sm text-gojo-ink">
            Отправили ссылку для входа на почту. Открой её на этом устройстве, чтобы войти. Не
            пришло — проверь папку «Спам».
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
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
            <button type="submit" disabled={magicPending} className="g-btn-primary w-full text-sm">
              {magicPending ? "..." : "Отправить ссылку для входа"}
            </button>
          </form>
        )}

        {error ? (
          <div className="mt-4 rounded-md border border-gojo-error/40 bg-gojo-error-soft px-4 py-3 text-sm font-bold text-gojo-error">
            {error}
          </div>
        ) : null}

        <label className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-gojo-ink-muted">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            Я даю отдельное{" "}
            <a
              className="font-bold text-gojo-orange underline"
              href="/personal-data-consent"
              target="_blank"
              rel="noopener noreferrer"
            >
              согласие на обработку персональных данных
            </a>{" "}
            и ознакомился(-ась) с{" "}
            <a
              className="font-bold text-gojo-orange underline"
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Политикой
            </a>
            . Первый вход создаёт аккаунт.
          </span>
        </label>

        <div className="mt-10 rounded-xl border border-black/5 bg-gojo-surface p-5">
          <div className="text-[14px] font-bold">Впервые здесь?</div>
          <p className="mt-1 text-[12px] leading-relaxed text-gojo-ink-muted">
            Запишись на бесплатную консультацию — познакомимся, определим уровень и покажем план.
          </p>
          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="g-btn-primary mt-4 w-full text-sm"
          >
            Записаться на бесплатную консультацию
          </button>
        </div>
      </div>
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} source="login" />
    </main>
  );
}
