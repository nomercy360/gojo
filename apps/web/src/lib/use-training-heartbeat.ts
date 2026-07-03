"use client";

import { useEffect, useRef } from "react";
import type { TrainingActivity } from "@gojo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PING_INTERVAL_MS = 20_000;
const MAX_PING_SECONDS = 30;

function ping(activity: TrainingActivity, seconds: number) {
  if (seconds <= 0) return;
  fetch(`${API_URL}/training/track`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activity, seconds: Math.min(seconds, MAX_PING_SECONDS) }),
  }).catch(() => {});
}

/**
 * Reports active time-on-page for a training activity (flashcard review,
 * kana trainer) so "время потраченное на тренинг" reflects real usage.
 * Only counts time while the tab is visible, in small bounded pings so a
 * backgrounded/closed tab never over-reports.
 */
export function useTrainingHeartbeat(activity: TrainingActivity) {
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.round((now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      if (document.visibilityState === "visible") ping(activity, elapsed);
    }, PING_INTERVAL_MS);

    function flushOnHide() {
      if (document.visibilityState !== "hidden") return;
      const now = Date.now();
      const elapsed = Math.round((now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      ping(activity, elapsed);
    }
    document.addEventListener("visibilitychange", flushOnHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", flushOnHide);
      const now = Date.now();
      const elapsed = Math.round((now - lastTickRef.current) / 1000);
      if (document.visibilityState === "visible") ping(activity, elapsed);
    };
  }, [activity]);
}
