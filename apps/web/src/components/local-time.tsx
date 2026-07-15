"use client";

import { useEffect, useState } from "react";

// SSR and the first client render must produce identical text, so both use a
// fixed fallback zone (the school's home timezone). After mount the effect
// re-formats in the viewer's own timezone. This is why a server component that
// formats a lesson time with a bare toLocale*/Intl call shows the server's
// timezone (UTC in the container) instead of the user's — use this instead.
const FALLBACK_TZ = "Europe/Moscow";
const LOCALE = "ru-RU";

/**
 * Renders an ISO timestamp formatted in the viewer's local timezone. Safe in
 * server components: it hydrates from a deterministic Moscow-time fallback and
 * swaps to the browser timezone once mounted.
 */
export function LocalTime({
  iso,
  options,
  className,
  showTimeZone = false,
}: {
  iso: string;
  options: Intl.DateTimeFormatOptions;
  className?: string;
  showTimeZone?: boolean;
}) {
  const format = (timeZone?: string) =>
    new Intl.DateTimeFormat(LOCALE, {
      ...options,
      ...(showTimeZone && options.timeZoneName === undefined ? { timeZoneName: "short" } : {}),
      timeZone,
    }).format(new Date(iso));

  const [text, setText] = useState(() => format(FALLBACK_TZ));
  // biome-ignore lint/correctness/useExhaustiveDependencies: options is stable per instance
  useEffect(() => {
    setText(format());
  }, [iso, showTimeZone]);

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}

/** Makes it explicit that date/time controls and lesson times use the browser zone. */
export function TimeZoneNote({ className }: { className?: string }) {
  const [timeZone, setTimeZone] = useState(FALLBACK_TZ);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ);
  }, []);

  const zoneName = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;

  return (
    <p className={className ?? "text-xs text-gojo-ink-muted"} suppressHydrationWarning>
      Время в часовом поясе браузера: {timeZone}
      {zoneName ? ` (${zoneName})` : ""}
    </p>
  );
}
