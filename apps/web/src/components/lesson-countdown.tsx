"use client";

import { useEffect, useState } from "react";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "сейчас";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} д ${hours} ч`;
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  return `${minutes} мин`;
}

/**
 * Live ticker for the pre-join window. Re-renders every 30s so the text
 * stays roughly accurate without a tight interval. `target` is the ISO
 * string of when the join window opens.
 */
export function LessonCountdown({
  target,
  label = "Начнётся через",
}: {
  target: string;
  label?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const ms = new Date(target).getTime() - now;
  return (
    <span className="font-mono text-[11px] font-bold text-gojo-ink-muted">
      {label} {formatCountdown(ms)}
    </span>
  );
}
