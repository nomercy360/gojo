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
}: {
  iso: string;
  options: Intl.DateTimeFormatOptions;
  className?: string;
}) {
  const format = (timeZone?: string) =>
    new Intl.DateTimeFormat(LOCALE, { ...options, timeZone }).format(new Date(iso));

  const [text, setText] = useState(() => format(FALLBACK_TZ));
  // biome-ignore lint/correctness/useExhaustiveDependencies: options is stable per instance
  useEffect(() => {
    setText(format());
  }, [iso]);

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
