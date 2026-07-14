"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "gojo:analytics-consent";
const ANON_KEY = "gojo:anon-id";
const OPEN_CHOICES_EVENT = "gojo:open-privacy-choices";

export function PrivacyChoices() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(CONSENT_KEY));
    } catch {
      setVisible(false);
    }
    const openChoices = () => setVisible(true);
    window.addEventListener(OPEN_CHOICES_EVENT, openChoices);
    return () => window.removeEventListener(OPEN_CHOICES_EVENT, openChoices);
  }, []);

  const choose = (value: "accepted" | "declined") => {
    let previous: string | null = null;
    let stored = false;
    try {
      previous = localStorage.getItem(CONSENT_KEY);
      localStorage.setItem(CONSENT_KEY, value);
      if (value === "declined") localStorage.removeItem(ANON_KEY);
      stored = true;
    } catch {
      stored = false;
    }
    setVisible(false);
    // Client monitoring is initialized before React mounts. Reload whenever
    // an accepted choice changes so monitoring starts or stops immediately.
    if (stored && previous !== value && (previous === "accepted" || value === "accepted")) {
      window.location.reload();
    }
  };

  if (!visible) return null;

  return (
    <Card
      asChild
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl p-4 shadow-2xl sm:flex-row sm:items-center sm:gap-5"
    >
      <aside aria-label="Настройки конфиденциальности">
        <p className="flex-1 text-[12px] leading-relaxed text-gojo-ink-muted">
          Необходимое хранилище поддерживает вход и настройки. С вашего разрешения мы также
          используем обезличенный идентификатор для аналитики и диагностики ошибок. Подробнее — в{" "}
          <Link href="/privacy" className="font-bold text-gojo-orange underline">
            Политике
          </Link>
          .
        </p>
        <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
          <Button type="button" variant="outline" size="sm" onClick={() => choose("declined")}>
            Только необходимые
          </Button>
          <Button type="button" size="sm" onClick={() => choose("accepted")}>
            Разрешить аналитику
          </Button>
        </div>
      </aside>
    </Card>
  );
}

export function PrivacySettingsButton() {
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto p-0 font-bold text-gojo-orange underline"
      onClick={() => window.dispatchEvent(new Event(OPEN_CHOICES_EVENT))}
    >
      Настроить аналитику
    </Button>
  );
}
