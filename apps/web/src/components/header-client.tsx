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

  // Anonymous landing has its own nav built into the Landing component —
  // suppress the shared SiteHeader on that route.
  if (overlayRoute) return null;

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
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3">
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
              <Link href="/dashboard" className={`transition-colors hover:text-gojo-orange ${mutedClass}`}>Кабинет</Link>
              <Link href="/lessons" className={`transition-colors hover:text-gojo-orange ${mutedClass}`}>Уроки</Link>
              <Link href="/kana" className={`transition-colors hover:text-gojo-orange ${mutedClass}`}>Кана</Link>
              <Link href="/review" className={`transition-colors hover:text-gojo-orange ${mutedClass}`}>Карточки</Link>
              {user.role === "teacher" || user.role === "admin" ? (
                <Link href="/teacher" className={`transition-colors hover:text-gojo-orange ${mutedClass}`}>Учитель</Link>
              ) : null}
              <Link href="/profile" className={`transition-colors hover:text-gojo-orange ${mutedClass}`}>
                <Avatar value={user.avatarUrl} size={26} fallback={user.nickname ?? user.email} />
              </Link>
              <form action={logoutAction}>
                <button type="submit" className={`transition-colors hover:text-gojo-error ${mutedClass}`}>Выйти</button>
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
