"use client";

import type { FunnelEventName } from "@gojo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ANON_KEY = "gojo:anon-id";
const CONSENT_KEY = "gojo:analytics-consent";

/**
 * Stable per-browser id so guest funnel events chain into one journey and
 * can be joined to the account after signup. Null when localStorage is
 * unavailable — we'd rather drop events than double-count every page view.
 */
export function getAnonymousId(): string | null {
  try {
    if (localStorage.getItem(CONSENT_KEY) !== "accepted") return null;
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Fire-and-forget funnel event; never blocks or throws. */
export function track(name: FunnelEventName, props?: Record<string, string | number | boolean>) {
  const anonymousId = getAnonymousId();
  if (!anonymousId) return;
  try {
    fetch(`${API_URL}/events`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, anonymousId, props }),
    }).catch(() => {});
  } catch {
    // fetch itself can throw in exotic environments; analytics must not.
  }
}
