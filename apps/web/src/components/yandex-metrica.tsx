"use client";

import {
  YANDEX_METRICA_COUNTER_ID,
  type YandexMetricaFunction,
  flushPendingMetricaEvents,
  hasAnalyticsConsent,
} from "@/lib/analytics";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const PRIVATE_PREFIXES = [
  "/admin/login",
  "/dashboard",
  "/lessons",
  "/login",
  "/payments",
  "/profile",
  "/review",
  "/teacher",
];

// uuid / nanoid-length segments. No static segment of a private route comes
// close to 16 characters, so this never masks a real page name.
const ID_SEGMENT = /^[A-Za-z0-9_-]{16,}$/;

function isPrivatePath(pathname: string) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Private URLs carry student, lesson, and payment identifiers, so Metrica only
 * ever sees the route shape — never the query string or the ids themselves.
 */
function hitUrl(pathname: string, query: string) {
  if (isPrivatePath(pathname)) {
    const masked = pathname
      .split("/")
      .map((segment) => (ID_SEGMENT.test(segment) ? ":id" : segment))
      .join("/");
    return new URL(masked, location.origin).href;
  }
  return new URL(query ? `${pathname}?${query}` : pathname, location.origin).href;
}

function installMetrica(counterId: number) {
  if (window.__gojoYandexMetricaInitialized) return;

  const tagUrl = `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`;
  if (!window.ym) {
    const ym: YandexMetricaFunction = (...args) => {
      if (!ym.a) ym.a = [];
      ym.a.push(args);
    };
    ym.l = Date.now();
    window.ym = ym;
  }

  if (!document.querySelector(`script[src="${tagUrl}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = tagUrl;
    document.head.appendChild(script);
  }

  // Yandex's SPA guidance requires defer + an explicit hit for every route.
  window.ym(counterId, "init", {
    defer: true,
    ssr: true,
    webvisor: true,
    clickmap: true,
    accurateTrackBounce: true,
    trackLinks: true,
  });
  window.__gojoYandexMetricaInitialized = true;
  flushPendingMetricaEvents();
}

/**
 * Loads Yandex Metrica after consent and records client-side App Router
 * navigations. Private areas are hidden from Session Replay/Webvisor.
 */
export function YandexMetrica() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The raw route dedupes hits; the sent (possibly masked) url is the referer.
  const previousRoute = useRef<string | null>(null);
  const previousHit = useRef<string | null>(null);

  useLayoutEffect(() => {
    document.body.classList.toggle("ym-hide-content", isPrivatePath(pathname));
  }, [pathname]);

  useEffect(() => {
    try {
      localStorage.removeItem("gojo:anon-id");
    } catch {
      // Legacy analytics cleanup must never affect the app.
    }
  }, []);

  useEffect(() => {
    const counterId = YANDEX_METRICA_COUNTER_ID;
    if (!counterId || !hasAnalyticsConsent()) return;
    installMetrica(counterId);

    const query = searchParams.toString();
    const route = query ? `${pathname}?${query}` : pathname;
    if (route === previousRoute.current) return;

    const referer = previousHit.current ?? document.referrer;
    const currentUrl = hitUrl(pathname, query);
    previousRoute.current = route;
    previousHit.current = currentUrl;
    window.ym?.(counterId, "hit", currentUrl, { title: document.title, referer });
  }, [pathname, searchParams]);

  return null;
}
