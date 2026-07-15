"use client";

import { AdminAccountMenu } from "@/components/admin-account-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { type Session, authClient } from "@/lib/auth-client";
import { linkPendingBookingLead, migrateGuestTrainerProgress } from "@/lib/post-login-sync";
import { isTeacherUser } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserDto } from "@gojo/shared";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Site header. Two modes:
 *  • "overlay" — transparent header rendered over a dark hero (only on "/").
 *    Scrolls into a dark frosted-glass state after 24px.
 *  • "solid" — cream paper header with ink border, for every other page.
 *
 * The overlay mode gives the landing hero a full-bleed cinematic feel without
 * the cream slab cutting it at the top.
 */
export function HeaderClient({
  user: serverUser,
  studentAccessActive,
}: {
  user: UserDto | null;
  studentAccessActive: boolean | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const clientSession = authClient.useSession();
  const sessionUser = clientSession.data?.user as
    | (Session["user"] & {
        role?: string;
        nickname?: string | null;
        jlptLevel?: string | null;
        quizLevel?: string | null;
        telegramId?: number | null;
      })
    | undefined;
  const user: UserDto | null = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        nickname: sessionUser.nickname ?? sessionUser.name ?? null,
        avatarUrl: sessionUser.image ?? null,
        role: sessionUser.role === "admin" ? "admin" : "student",
        jlptLevel: sessionUser.jlptLevel ?? null,
        quizLevel: sessionUser.quizLevel ?? null,
        telegramId: sessionUser.telegramId ?? null,
        createdAt: new Date(sessionUser.createdAt).toISOString(),
      }
    : serverUser;
  const overlayRoute = pathname === "/" && !user;
  const loginRoute = pathname === "/login" || pathname === "/admin/login";
  const [scrolled, setScrolled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!overlayRoute) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlayRoute]);

  // Post-login sync runs here on
  // the first authenticated page load. Both helpers are idempotent.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (migrateGuestTrainerProgress(user.id) && !cancelled) {
        toast.success("Прогресс тренажёра сохранён");
      }
      const linked = await linkPendingBookingLead();
      if (linked > 0 && !cancelled) toast.success("Заявка привязана к аккаунту");
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Landing and the teacher workspace own their navigation.
  if (pathname === "/" || pathname.startsWith("/teacher")) return null;

  const overlay = overlayRoute && !scrolled;
  const frosted = overlayRoute && scrolled;

  const wrapperClass = overlayRoute
    ? `fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
        frosted
          ? "border-b border-white/10 bg-[rgba(20,20,20,0.75)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`
    : loginRoute
      ? "border-b border-border bg-background"
      : "border-b border-black/10 bg-gojo-paper";

  const mutedClass = overlayRoute ? "text-white/70" : "text-gojo-ink-muted";
  const teacherUser = isTeacherUser(user);
  const logoHref = user ? (teacherUser ? "/teacher" : "/dashboard") : "/";
  const studentAppLink = (active: boolean) =>
    cn(
      "rounded-lg px-2 py-1.5 transition-colors sm:px-2.5",
      active
        ? "bg-gojo-orange-soft text-gojo-orange"
        : `${mutedClass} hover:bg-gojo-paper-2 hover:text-gojo-orange`,
    );

  async function handleLogout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      const res = await authClient.signOut();
      if (res.error) {
        console.error("Logout failed:", res.error);
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className={wrapperClass}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={logoHref} className="flex shrink-0 items-center gap-3">
          <img
            src="/landing/logo.png"
            alt="Gojo"
            className="h-7 w-auto"
            style={{ mixBlendMode: overlayRoute ? "normal" : "multiply" }}
          />
          <span
            className="g-mono hidden text-[10px] font-bold uppercase tracking-[0.12em] lg:inline"
            style={{
              color: overlayRoute ? "rgba(255,255,255,0.7)" : "var(--color-gojo-ink-muted)",
            }}
          >
            Школа японского
          </span>
        </Link>

        <nav
          aria-label="Основная навигация"
          className="g-body flex min-w-0 items-center gap-1 text-[12px] font-semibold sm:gap-2 sm:text-[13px]"
        >
          {user ? (
            teacherUser ? (
              <>
                <Link
                  href="/"
                  className={`rounded-lg px-2.5 py-1.5 transition-colors hover:bg-gojo-paper-2 hover:text-gojo-orange ${mutedClass}`}
                >
                  На сайт
                </Link>
                <Link
                  href="/teacher"
                  aria-current={pathname.startsWith("/teacher") ? "page" : undefined}
                  className={studentAppLink(pathname.startsWith("/teacher"))}
                >
                  Рабочее пространство
                </Link>
                <AdminAccountMenu user={user} />
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  aria-current={pathname === "/dashboard" ? "page" : undefined}
                  className={studentAppLink(pathname === "/dashboard")}
                >
                  Кабинет
                </Link>
                <Link href="/" className={studentAppLink(false)}>
                  <span className="hidden sm:inline">На сайт</span>
                  <span className="sm:hidden">Сайт</span>
                </Link>
                <Link
                  href={studentAccessActive ? "/payments#payment-status" : "/payments"}
                  aria-current={pathname.startsWith("/payments") ? "page" : undefined}
                  className={studentAppLink(pathname.startsWith("/payments"))}
                >
                  {studentAccessActive ? "Платежи" : "Оплата"}
                </Link>
                <form
                  onSubmit={handleLogout}
                  className="ml-1 border-l border-black/10 pl-2 sm:ml-2 sm:pl-4"
                >
                  <Button
                    type="submit"
                    disabled={loggingOut}
                    variant="ghost"
                    aria-label="Выйти"
                    title="Выйти"
                    className={`h-8 gap-1.5 px-2 text-[12px] hover:bg-gojo-error-soft hover:text-gojo-error disabled:cursor-wait sm:px-2.5 sm:text-[13px] ${mutedClass}`}
                  >
                    <LogOut aria-hidden="true" className="size-3.5" />
                    <span className="hidden md:inline">Выйти</span>
                  </Button>
                </form>
              </>
            )
          ) : loginRoute ? null : (
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
