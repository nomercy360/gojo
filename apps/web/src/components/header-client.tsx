"use client";

import { Avatar } from "@/components/avatar";
import { authClient } from "@/lib/auth-client";
import { isTeacherUser } from "@/lib/roles";
import type { UserDto } from "@gojo/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Site header. Two modes:
 *  • "overlay" — transparent header rendered over a dark hero (only on "/").
 *    Scrolls into a dark frosted-glass state after 24px.
 *  • "solid" — cream paper header with ink border, for every other page.
 *
 * The overlay mode gives the landing hero a full-bleed cinematic feel without
 * the cream slab cutting it at the top.
 */
export function HeaderClient({ user }: { user: UserDto | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRoute = pathname === "/" && !user;
  const [scrolled, setScrolled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!overlayRoute) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlayRoute]);

  // Landing has its own nav built into the Landing component.
  if (pathname === "/") return null;

  const overlay = overlayRoute && !scrolled;
  const frosted = overlayRoute && scrolled;

  const wrapperClass = overlayRoute
    ? `fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
        frosted
          ? "border-b border-white/10 bg-[rgba(20,20,20,0.75)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`
    : "border-b border-black/10 bg-gojo-paper";

  const mutedClass = overlayRoute ? "text-white/70" : "text-gojo-ink-muted";
  const teacherUser = isTeacherUser(user);

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
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/landing/logo.png"
            alt="Gojo"
            className="h-7 w-auto"
            style={{ mixBlendMode: overlayRoute ? "normal" : "multiply" }}
          />
          <span
            className="g-mono text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: overlayRoute ? "rgba(255,255,255,0.7)" : "#6b6b6b" }}
          >
            Школа японского
          </span>
        </Link>

        <nav className="g-body flex items-center gap-5 text-[13px] font-semibold">
          {user ? (
            <>
              {teacherUser ? (
                <>
                  {user.role === "admin" ? (
                    <Link
                      href="/admin"
                      className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
                    >
                      Админ
                    </Link>
                  ) : null}
                  <Link
                    href="/teacher"
                    className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
                  >
                    Учитель
                  </Link>
                  <Link
                    href="/teacher/students"
                    className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
                  >
                    Студенты
                  </Link>
                  <Link
                    href="/teacher/leads"
                    className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
                  >
                    Заявки
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard#library"
                    className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
                  >
                    Библиотека
                  </Link>
                  <Link
                    href="/dashboard#trainers"
                    className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
                  >
                    Тренажёры
                  </Link>
                  <Link
                    href="/dashboard#calendar"
                    className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
                  >
                    Расписание
                  </Link>
                  <Link
                    href="/dashboard#contact"
                    className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
                  >
                    Связаться с нами
                  </Link>
                </>
              )}
              <Link
                href="/profile"
                className={`transition-colors hover:text-gojo-orange ${mutedClass}`}
              >
                <Avatar value={user.avatarUrl} size={26} fallback={user.nickname ?? user.email} />
              </Link>
              <form onSubmit={handleLogout}>
                <button
                  type="submit"
                  disabled={loggingOut}
                  className={`transition-colors hover:text-gojo-error disabled:cursor-wait disabled:opacity-60 ${mutedClass}`}
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-gojo-ink/20 px-4 py-1.5 text-gojo-ink transition-colors hover:border-gojo-orange hover:text-gojo-orange"
            >
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
