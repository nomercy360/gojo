"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// Student-only, passwordless sign-in. Accounts must already have been invited
// by an administrator; neither authentication method can create an account.
export default function LoginPage() {
  const [telegramPending, setTelegramPending] = useState(false);
  const [magicPending, setMagicPending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTelegram() {
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
    setError(null);
    setMagicPending(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    try {
      const res = await authClient.signIn.magicLink({
        email,
        callbackURL: `${window.location.origin}/dashboard`,
        metadata: { expectedRole: "student" },
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
        <h1 className="mt-2 font-serif text-[28px] font-bold">Вход для студента</h1>

        <Button
          type="button"
          onClick={handleTelegram}
          disabled={telegramPending}
          className="mt-6 w-full bg-[#28a8e9] text-white hover:bg-[#28a8e9]/90"
        >
          {telegramPending ? "Открываем Telegram…" : "✈️ Войти через Telegram"}
        </Button>

        <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-gojo-ink-ghost">
          <span className="h-px flex-1 bg-black/10" />
          или по email
          <span className="h-px flex-1 bg-black/10" />
        </div>

        {magicSent ? (
          <Alert className="border-gojo-orange/30">
            <AlertDescription className="text-gojo-ink">
              Отправили ссылку для входа на почту. Открой её на этом устройстве, чтобы войти. Не
              пришло — проверь папку «Спам».
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            </Field>
            <Button type="submit" disabled={magicPending} className="w-full">
              {magicPending ? "..." : "Отправить ссылку для входа"}
            </Button>
          </form>
        )}

        {error ? (
          <Alert variant="destructive" className="mt-4 bg-gojo-error-soft">
            <AlertDescription className="font-bold text-gojo-error">{error}</AlertDescription>
          </Alert>
        ) : null}

        <p className="mt-8 text-center text-[13px] text-gojo-ink-muted">
          Администратор?{" "}
          <Link href="/admin/login" className="font-bold text-gojo-orange hover:underline">
            Войти в панель
          </Link>
        </p>
      </div>
    </main>
  );
}
