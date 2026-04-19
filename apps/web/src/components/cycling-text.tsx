"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_PHRASES = [
  "👩‍💻 жить и работать в Японии.",
  "📺 смотреть аниме и читать мангу в оригинале.",
  "⛩️ приобщиться к уникальной культуре.",
];

/**
 * Typewriter cycling text. Types current phrase char-by-char, pauses, deletes,
 * moves to next. Mirrors the script block from the teammate's landing HTML.
 */
export function CyclingText({ phrases = DEFAULT_PHRASES }: { phrases?: string[] }) {
  const [text, setText] = useState("");
  const stateRef = useRef({ current: 0, charIndex: 0, deleting: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => {
      const state = stateRef.current;
      const phrase = phrases[state.current] ?? "";
      if (!state.deleting) {
        state.charIndex += 1;
        setText(phrase.slice(0, state.charIndex));
        if (state.charIndex === phrase.length) {
          timer.current = setTimeout(() => {
            state.deleting = true;
            tick();
          }, 2400);
          return;
        }
        timer.current = setTimeout(tick, 42);
      } else {
        state.charIndex -= 1;
        setText(phrase.slice(0, state.charIndex));
        if (state.charIndex === 0) {
          state.deleting = false;
          state.current = (state.current + 1) % phrases.length;
          timer.current = setTimeout(tick, 300);
          return;
        }
        timer.current = setTimeout(tick, 22);
      }
    };
    timer.current = setTimeout(tick, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phrases]);

  return <span className="lp-cycle">{text}</span>;
}
