"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    try {
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: `${window.location.origin}/teacher`,
        metadata: { expectedRole: "admin" },
      });
      if (result.error) throw new Error(result.error.message ?? "magic_link_failed");
      setSent(true);
      toast.success("Проверь почту — отправили ссылку для входа");
    } catch {
      setError("Не удалось отправить ссылку. Проверь адрес и попробуй снова.");
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

        {sent ? (
          <Alert className="mt-6 border-gojo-orange/30">
            <AlertDescription className="text-gojo-ink">
              Если этот адрес принадлежит администратору, ссылка для входа уже отправлена. Проверь
              также папку «Спам».
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field>
              <FieldLabel htmlFor="email">Рабочий email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@example.com"
              />
            </Field>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "..." : "Получить ссылку для входа"}
            </Button>
          </form>
        )}

        {error ? (
          <Alert variant="destructive" className="mt-4 bg-gojo-error-soft">
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
