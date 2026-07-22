"use client";

const CONSENT_KEY = "gojo:analytics-consent";

// Inlined at build time. Left unset outside production (local dev, previews) so
// those page views and goals never reach the live counter.
const RAW_COUNTER_ID = Number(process.env.NEXT_PUBLIC_YANDEX_METRICA_COUNTER_ID);
export const YANDEX_METRICA_COUNTER_ID: number | null =
  Number.isInteger(RAW_COUNTER_ID) && RAW_COUNTER_ID > 0 ? RAW_COUNTER_ID : null;

export type ProductEventName =
  | "kana_open"
  | "kana_first_answer"
  | "kana_row_complete"
  | "kana_word_unlocked"
  | "kana_review_complete"
  | "kana_save_clicked"
  | "kana_wall_shown"
  | "kana_ask_shown"
  | "kana_ask_clicked"
  | "quiz_open"
  | "quiz_declared"
  | "quiz_to_kana"
  | "quiz_to_miner"
  | "quiz_completed"
  | "booking_open"
  | "telegram_lead_clicked"
  | "lead_submitted"
  | "miner_open"
  | "miner_form_submitted"
  | "miner_download_clicked"
  | "miner_archive_clicked";

export type YandexMetricaFunction = {
  (...args: unknown[]): void;
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    ym?: YandexMetricaFunction;
    __gojoYandexMetricaInitialized?: boolean;
  }
}

type PendingEvent = {
  name: ProductEventName;
  props?: Record<string, string | number | boolean>;
};

const pendingEvents: PendingEvent[] = [];

const GOAL_IDS: Record<ProductEventName, string> = {
  kana_open: "kana_open",
  kana_first_answer: "ym-start-course",
  kana_row_complete: "kana_row_complete",
  kana_word_unlocked: "kana_word_unlocked",
  kana_review_complete: "kana_review_complete",
  kana_save_clicked: "kana_save_clicked",
  kana_wall_shown: "kana_wall_shown",
  kana_ask_shown: "kana_ask_shown",
  kana_ask_clicked: "kana_ask_clicked",
  quiz_open: "quiz_open",
  quiz_declared: "quiz_declared",
  quiz_to_kana: "quiz_to_kana",
  quiz_to_miner: "quiz_to_miner",
  quiz_completed: "quiz_completed",
  booking_open: "ym-open-leadform",
  telegram_lead_clicked: "ym-open-chat",
  lead_submitted: "ym-submit-leadform",
  miner_open: "miner_open",
  // The guide funnel's conversion goal: contact captured, guide handed over.
  miner_form_submitted: "ym-submit-guideform",
  miner_download_clicked: "miner_download_clicked",
  miner_archive_clicked: "miner_archive_clicked",
};

export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

/** Sends a product-funnel goal to Yandex Metrica without blocking the UI. */
export function track(name: ProductEventName, props?: Record<string, string | number | boolean>) {
  const counterId = YANDEX_METRICA_COUNTER_ID;
  if (!counterId || !hasAnalyticsConsent()) return;
  if (!window.__gojoYandexMetricaInitialized || !window.ym) {
    if (pendingEvents.length < 50) pendingEvents.push({ name, props });
    return;
  }
  sendGoal(counterId, name, props);
}

export function flushPendingMetricaEvents() {
  const counterId = YANDEX_METRICA_COUNTER_ID;
  if (!counterId || !window.__gojoYandexMetricaInitialized || !window.ym) return;
  for (const event of pendingEvents.splice(0)) sendGoal(counterId, event.name, event.props);
}

function sendGoal(
  counterId: number,
  name: ProductEventName,
  props?: Record<string, string | number | boolean>,
) {
  try {
    window.ym?.(counterId, "reachGoal", GOAL_IDS[name], props);
  } catch {
    // Analytics must never affect the product flow.
  }
}
