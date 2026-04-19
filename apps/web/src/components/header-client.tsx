"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserDto } from "@gojo/shared";
import { logoutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/avatar";

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
  const pathname = usePathname();
  const overlayRoute = pathname === "/" && !user;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlayRoute) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlayRoute]);

  const overlay = overlayRoute && !scrolled;
  const frosted = overlayRoute && scrolled;

  const wrapperClass = overlayRoute
    ? `fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
        frosted
          ? "border-b border-white/10 bg-[rgba(20,20,20,0.75)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`
    : "border-b-2 border-gojo-ink bg-gojo-paper";

  const textClass = overlayRoute ? "text-white" : "text-gojo-ink";
  const mutedClass = overlayRoute ? "text-white/70" : "text-gojo-ink-muted";

  return (
    <header className={wrapperClass}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className={`flex items-center gap-2 ${textClass}`}>
          <span
            className={`font-jp-serif text-lg font-bold ${
              overlayRoute ? "text-gojo-orange" : "text-gojo-orange"
            }`}
          >
            五
          </span>
          <span className="font-serif text-[17px] font-bold tracking-tight">GOJO LEARN</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-bold">
          {user ? (
            <>
              {user.role === "teacher" || user.role === "admin" ? (
                <Link
                  href="/teacher"
                  className={`hover:text-gojo-orange ${mutedClass}`}
                >
                  Мои уроки
                </Link>
              ) : null}
              <Link
                href="/lessons"
                className={`hover:text-gojo-orange ${mutedClass}`}
              >
                Уроки
              </Link>
              {user.role === "student" ? (
                <Link
                  href="/review"
                  className={`hover:text-gojo-orange ${mutedClass}`}
                >
                  Карточки
                </Link>
              ) : null}
              <Link
                href="/profile"
                className={`flex items-center gap-2 hover:${textClass} ${mutedClass}`}
              >
                <Avatar value={user.avatarUrl} size={28} fallback={user.nickname ?? user.email} />
                <span className={textClass}>{user.nickname ?? user.email}</span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className={`${mutedClass} hover:text-gojo-error`}
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className={
                overlayRoute
                  ? "rounded-md border-2 border-white/40 bg-transparent px-4 py-1.5 text-white hover:border-white"
                  : "rounded-md border-2 border-gojo-ink bg-transparent px-4 py-1.5 text-gojo-ink hover:bg-gojo-surface-2"
              }
            >
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
