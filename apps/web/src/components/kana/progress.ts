import type { KanaScript } from "./data";

const KEY = "gojo:kana-progress";

/**
 * Device-local curriculum state. Deliberately not per-account: the map is a
 * possession the visitor fills in before we ever ask them to sign up, and it
 * must survive the signup. Server-side persistence can come later.
 */
export interface KanaProgress {
  learned: Record<KanaScript, string[]>;
  /** Reward words already celebrated, so each unlock screen shows once. */
  shownWords: string[];
  /** The honest "most people quit here" screen is shown a single time. */
  wallShown: boolean;
}

export const EMPTY_PROGRESS: KanaProgress = {
  learned: { hiragana: [], katakana: [] },
  shownWords: [],
  wallShown: false,
};

export function loadKanaProgress(): KanaProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROGRESS;
    const p = JSON.parse(raw) as Partial<KanaProgress>;
    return {
      learned: {
        hiragana: p.learned?.hiragana ?? [],
        katakana: p.learned?.katakana ?? [],
      },
      shownWords: p.shownWords ?? [],
      wallShown: p.wallShown ?? false,
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveKanaProgress(p: KanaProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private mode etc. — the session still works, it just won't persist.
  }
}

/** Round results for the free-mode trainer; the login page migrates these. */
export function saveGuestTrainerProgress(activity: "kana", correct: number, total: number) {
  try {
    const key = "gojo:guest-trainer-progress";
    const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
    localStorage.setItem(
      key,
      JSON.stringify([
        ...prev,
        { activity, correct, total, completedAt: new Date().toISOString() },
      ]),
    );
  } catch {
    // localStorage can be unavailable; the signup CTA still works.
  }
}
