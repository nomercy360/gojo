"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { TELEGRAM_COMMUNITY_URL, telegramBotStartUrl } from "@/lib/telegram";
import { DEFAULT_TIME_ZONE } from "@gojo/shared";
import { Check, Download, Send } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const GUIDE_PDF_URL = "/guides/gojo-vocabulary-miner.pdf";
const CONSENT_VERSION = "2026-07-16";

// ── Design tokens (landing policy, same as the quiz and kana trainer) ─────────
const C = {
  cream: "#f3ece0",
  white: "#ffffff",
  orange: "#ce4a22",
  ink: "#201c18",
  ink2: "#4a443c",
  ink3: "#6b655c",
  muted: "#9c9285",
  border: "#e7decf",
};

const MONO = "var(--font-jetbrains-mono), monospace";
const MANROPE = "var(--font-manrope), system-ui, sans-serif";
const FRAUNCES = "var(--font-fraunces), Georgia, serif";

const card: React.CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 20,
};

const btnBase: React.CSSProperties = {
  width: "100%",
  padding: "15px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontFamily: MANROPE,
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.01em",
};
const btnPrimary: React.CSSProperties = { ...btnBase, background: C.orange, color: C.white };
const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  border: "1px solid rgba(0,0,0,0.14)",
  color: C.ink2,
  fontWeight: 600,
  padding: "13px",
  fontSize: 14,
};
const quietLink: React.CSSProperties = {
  display: "block",
  marginTop: 14,
  textAlign: "center",
  fontFamily: MANROPE,
  fontSize: 13,
  color: C.ink3,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

const INSIDE = [
  {
    jp: "五",
    title: "5 шагов со скриншотами",
    sub: "От установки Anki до японских субтитров на YouTube",
  },
  {
    jp: "設",
    title: "Готовый конфиг и колода",
    sub: "yomitan-settings.json и Japanese.apkg с правильными полями",
  },
  {
    jp: "辞",
    title: "Русские словари и частотность",
    sub: "JMdict на русском, питч-акцент, уровни JLPT",
  },
  {
    jp: "日",
    title: "Ежедневный цикл на 4 действия",
    sub: "Плюс тонкие настройки, до которых доходят не сразу",
  },
];

export function MinerClient() {
  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [delivered, setDelivered] = useState(false);

  // Gate the button on the same handle forms the API accepts: it strips a
  // t.me/ link, protocol and leading @ before validating (see leads.ts), so we
  // must too — otherwise pasting a profile link leaves the button silently
  // disabled. Name mirrors the API's min(1).
  const normalizedHandle = telegram
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^t\.me\//i, "")
    .replace(/^@/, "");
  const handleValid = /^[a-zA-Z0-9_]{3,32}$/.test(normalizedHandle);
  const valid = name.trim().length >= 1 && handleValid && consent;

  useEffect(() => {
    track("miner_open");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "guide",
          name: name.trim(),
          telegram: telegram.trim(),
          email: email.trim() || undefined,
          personalDataConsent: true,
          consentVersion: CONSENT_VERSION,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE,
        }),
      });
      if (!response.ok) throw new Error("lead_submission_failed");

      const result = (await response.json()) as { alreadyExists?: boolean };
      track("miner_form_submitted", {
        channel: email.trim() ? "telegram_email" : "telegram",
        result: result.alreadyExists ? "existing" : "new",
      });
      // The contact is captured — hand the guide over on this screen rather than
      // sending people to an inbox before they get any value.
      setDelivered(true);
    } catch {
      toast.error("Не удалось отправить. Проверь данные и попробуй ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.cream, padding: "48px 24px 64px" }}>
      <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: C.orange,
          }}
        >
          Бесплатный гайд · 12 страниц
        </div>

        <h1
          style={{
            fontFamily: FRAUNCES,
            fontSize: 34,
            lineHeight: 1.12,
            color: C.ink,
            margin: "12px 0 0",
            fontWeight: 600,
          }}
        >
          Личный словарь-майнер:
          <br />
          слова запоминаются <em style={{ color: C.orange }}>сами</em>
        </h1>

        <p
          style={{
            fontFamily: MANROPE,
            fontSize: 15,
            lineHeight: 1.6,
            color: C.ink2,
            margin: "16px 0 0",
          }}
        >
          Anki + Yomitan + asbplayer — настройка за 30 минут. Дальше любое видео, статья или манга
          становятся источником карточек: одно нажатие, и слово улетает в Anki сразу с контекстом,
          аудио, частотностью и переводом.
        </p>

        <div style={{ ...card, marginTop: 24 }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 14,
            }}
          >
            Что внутри
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
            {INSIDE.map((item) => (
              <li key={item.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span
                  aria-hidden="true"
                  style={{
                    flex: "0 0 auto",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: C.ink,
                    color: C.cream,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-noto-serif-jp), serif",
                    fontSize: 15,
                  }}
                >
                  {item.jp}
                </span>
                <span>
                  <span
                    style={{
                      display: "block",
                      fontFamily: MANROPE,
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.ink,
                    }}
                  >
                    {item.title}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontFamily: MANROPE,
                      fontSize: 13,
                      color: C.ink3,
                      lineHeight: 1.5,
                      marginTop: 2,
                    }}
                  >
                    {item.sub}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {delivered ? <Delivered /> : null}

        {!delivered ? (
          <form onSubmit={submit} style={{ ...card, marginTop: 16, display: "grid", gap: 10 }}>
            <label className="sr-only" htmlFor="miner-name">
              Как тебя зовут
            </label>
            <Input
              id="miner-name"
              value={name}
              maxLength={200}
              autoComplete="name"
              placeholder="Как тебя зовут"
              required
              onChange={(event) => setName(event.target.value)}
            />

            <label className="sr-only" htmlFor="miner-telegram">
              Ник в Telegram
            </label>
            <Input
              id="miner-telegram"
              value={telegram}
              maxLength={40}
              placeholder="@username в Telegram"
              required
              onChange={(event) => setTelegram(event.target.value)}
            />

            <label className="sr-only" htmlFor="miner-email">
              Email
            </label>
            <Input
              id="miner-email"
              type="email"
              value={email}
              maxLength={200}
              autoComplete="email"
              placeholder="Email — если хочешь копию гайда (необязательно)"
              onChange={(event) => setEmail(event.target.value)}
            />

            <label
              htmlFor="miner-consent"
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-start",
                fontFamily: MANROPE,
                fontSize: 12,
                lineHeight: 1.5,
                color: C.ink3,
                marginTop: 2,
              }}
            >
              <Input
                unstyled
                id="miner-consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>
                Даю отдельное{" "}
                <a href="/personal-data-consent" target="_blank" rel="noopener noreferrer">
                  согласие на обработку данных
                </a>{" "}
                и ознакомился(-ась) с{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  Политикой
                </a>
                .
              </span>
            </label>

            <Button
              variant="unstyled"
              type="submit"
              disabled={!valid || submitting}
              style={{ ...btnPrimary, marginTop: 4, opacity: !valid || submitting ? 0.55 : 1 }}
            >
              {submitting ? "Отправляем…" : "Получить гайд"}
            </Button>
          </form>
        ) : null}

        <p
          style={{
            fontFamily: MANROPE,
            fontSize: 13,
            lineHeight: 1.55,
            color: C.ink3,
            margin: "18px 0 0",
          }}
        >
          Гайд рассчитан на тех, кто уже читает кану и смотрит что-то на японском. Только начинаешь?{" "}
          <a href="/kana" style={{ color: C.orange }}>
            Начни с тренажёра каны
          </a>{" "}
          — он бесплатный и без регистрации.
        </p>
      </div>
    </div>
  );
}

/**
 * Post-submit view. The PDF is the instructions; the dictionaries, Yomitan
 * config and starter deck live in the community's pinned post — so both hand-offs
 * sit here together, and the guide never dead-ends on a missing archive.
 */
function Delivered() {
  return (
    <div style={{ ...card, marginTop: 16 }} aria-live="polite">
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: C.orange,
            color: C.white,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Check size={16} aria-hidden="true" />
        </span>
        <h2
          style={{
            fontFamily: FRAUNCES,
            fontSize: 20,
            color: C.ink,
            margin: 0,
            fontWeight: 600,
          }}
        >
          Гайд твой
        </h2>
      </div>

      <p
        style={{
          fontFamily: MANROPE,
          fontSize: 14,
          lineHeight: 1.6,
          color: C.ink2,
          margin: "12px 0 16px",
        }}
      >
        Скачивай PDF — это пошаговая инструкция. Файлы к ней (словари, готовый конфиг Yomitan, коды
        аддонов и колода Anki) лежат в закрепе нашего Telegram-сообщества: там же можно спросить,
        если что-то не заведётся.
      </p>

      <a
        href={GUIDE_PDF_URL}
        download
        onClick={() => track("miner_download_clicked")}
        style={{ ...btnPrimary, display: "block", textAlign: "center", textDecoration: "none" }}
      >
        <Download size={16} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 8 }} />
        Скачать PDF
      </a>

      <a
        href={TELEGRAM_COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("miner_archive_clicked")}
        style={{
          ...btnGhost,
          display: "block",
          textAlign: "center",
          textDecoration: "none",
          marginTop: 10,
        }}
      >
        <Send size={15} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 8 }} />
        Забрать архив в Telegram
      </a>

      <a
        href={telegramBotStartUrl("miner")}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("telegram_lead_clicked", { placement: "miner_success" })}
        style={quietLink}
      >
        Карточки дадут слова, говорить научит человек — записаться на бесплатный урок
      </a>
    </div>
  );
}
