"use client";

import { BookingModal } from "@/components/booking-modal";
import { authClient } from "@/lib/auth-client";
import { homePathForUser } from "@/lib/roles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PENDING_LEAD_KEY = "gojo:pending-lead-email";

// Accounts are admin-provisioned only (see /teacher/students/new) — there is no
// public self-signup. New users get an activation email; this page is
// sign-in only, with a link to /forgot-password for both "I forgot my
// password" and "I need to set my first password" (same flow, see
// apps/api/src/auth.ts sendResetPassword).
export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message ?? "Invalid credentials");
      toast.success("С возвращением!");

      const authUser = await authClient.getSession();
      const sessionUser = authUser.data?.user;
      const id = sessionUser?.id;
      if (id && migrateGuestTrainerProgress(id)) {
        toast.success("Прогресс тренажёра сохранён");
      }
      const linkedLeads = await linkPendingBookingLead();
      if (linkedLeads > 0) {
        toast.success("Заявка привязана к аккаунту");
      }
      const destination = sessionUser ? homePathForUser(sessionUser) : "/dashboard";
      router.push(destination);
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
        <h1 className="mt-2 font-serif text-[28px] font-bold">Войти</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Email" name="email" type="email" placeholder="you@example.com" required />
          <Field label="Пароль" name="password" type="password" placeholder="Пароль" required />

          {error ? (
            <div className="rounded-md border border-gojo-error/40 bg-gojo-error-soft px-4 py-3 text-sm font-bold text-gojo-error">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={pending} className="g-btn-primary w-full text-sm">
            {pending ? "..." : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-[13px] text-gojo-ink-muted">
          <Link href="/forgot-password" className="font-bold text-gojo-orange hover:underline">
            Забыли пароль или ещё не устанавливали его?
          </Link>
        </p>

        <div className="mt-10 rounded-xl border border-black/5 bg-gojo-surface p-5">
          <div className="text-[14px] font-bold">Впервые здесь?</div>
          <p className="mt-1 text-[12px] leading-relaxed text-gojo-ink-muted">
            Аккаунт создаёт администратор после бесплатной консультации — затем на почту придёт
            письмо со ссылкой для установки пароля.
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

async function linkPendingBookingLead(): Promise<number> {
  const intent = new URLSearchParams(window.location.search).get("intent");
  const hasPendingLead = Boolean(localStorage.getItem(PENDING_LEAD_KEY));
  if (!hasPendingLead && intent !== "booking") return 0;

  try {
    const res = await fetch(`${API_URL}/leads/link-current`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { linked?: number };
    localStorage.removeItem(PENDING_LEAD_KEY);
    return data.linked ?? 0;
  } catch {
    return 0;
  }
}

function migrateGuestTrainerProgress(userId: string): boolean {
  try {
    const guestKey = "gojo:guest-trainer-progress";
    const raw = localStorage.getItem(guestKey);
    if (!raw) return false;

    const accountKey = `gojo:trainer-progress:${userId}`;
    const existing = JSON.parse(localStorage.getItem(accountKey) ?? "[]") as unknown[];
    const guest = JSON.parse(raw) as unknown[];
    localStorage.setItem(accountKey, JSON.stringify([...existing, ...guest]));
    localStorage.removeItem(guestKey);
    return guest.length > 0;
  } catch {
    return false;
  }
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
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
        className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
      />
    </div>
  );
}
