"use client";

import { useEffect, useRef } from "react";

const CODE_POSITIONS = ["first", "second", "third", "fourth", "fifth", "sixth"] as const;

export function CodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function writeFrom(index: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) {
      const next = [...digits];
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    const next = [...digits];
    for (let offset = 0; offset < incoming.length && index + offset < 6; offset += 1) {
      next[index + offset] = incoming[offset] ?? "";
    }
    onChange(next.join(""));
    refs.current[Math.min(index + incoming.length, 5)]?.focus();
  }

  return (
    <fieldset>
      <legend className="sr-only">Код для входа</legend>
      <div className="flex justify-center gap-2">
        {CODE_POSITIONS.map((position, index) => (
          <input
            key={position}
            ref={(element) => {
              refs.current[index] = element;
            }}
            aria-label={`Цифра кода ${index + 1}`}
            value={digits[index]}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={index === 0 ? 6 : 1}
            onChange={(event) => writeFrom(index, event.target.value)}
            onPaste={(event) => {
              event.preventDefault();
              writeFrom(index, event.clipboardData.getData("text"));
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index] && index > 0) {
                refs.current[index - 1]?.focus();
              }
              if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
              if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
            }}
            className={`ym-disable-keys g-display h-14 w-12 rounded-xl border-[1.5px] bg-card text-center text-2xl font-semibold text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-4 focus:ring-ring/15 ${
              digits[index] ? "border-primary" : "border-border"
            }`}
          />
        ))}
      </div>
    </fieldset>
  );
}
