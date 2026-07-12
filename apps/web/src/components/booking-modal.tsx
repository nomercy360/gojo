"use client";

import { track } from "@/lib/analytics";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PENDING_LEAD_KEY = "gojo:pending-lead-email";

type TelegramLoginPayload = {
  proof?: string;
  user?: { id: number; name: string; username?: string; picture?: string };
  error?: string;
};

const readValue = (id: string) =>
  (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? "";

/**
 * Shared "book a free lesson" modal — used by the landing page's own CTAs
 * and, as a consultation-booking prompt, by the guest CTAs on the kana/kanji
 * trainers and the quiz result screen (all outside `.landing-root`, so this
 * renders inside a `.landing-root` wrapper of its own to pick up the modal
 * styles regardless of where it's mounted).
 */
export function BookingModal({
  open,
  onClose,
  source = "landing",
}: {
  open: boolean;
  onClose: () => void;
  /** Which surface opened the modal — lands in funnel-event props. */
  source?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submissionReason, setSubmissionReason] = useState<string | undefined>();
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(true);
  // Default view is just name + Telegram. Email/phone live behind a quiet link
  // for the minority without Telegram; phone is a further opt-in "call me".
  const [showAlt, setShowAlt] = useState(false);
  const [wantsCall, setWantsCall] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      track("booking_open", { source });
      setShowAlt(false);
      setWantsCall(false);
      setTelegramLoading(false);
    }
  }, [open, source]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submitForm = useCallback(
    async (telegram?: { proof: string; name: string }) => {
      const name = readValue("bm-name") || telegram?.name || "";
      const email = readValue("bm-email");
      const phone = wantsCall ? readValue("bm-phone") : "";
      if (!name) {
        toast.error("Пожалуйста, заполни имя");
        return;
      }
      if (!telegram?.proof && !email && !phone) {
        toast.error("Оставь Telegram, email или телефон — куда написать?");
        return;
      }
      if (wantsCall && !phone) {
        toast.error("Укажи номер для звонка");
        return;
      }
      try {
        const res = await fetch(`${API_URL}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "booking",
            name,
            telegramProof: telegram?.proof,
            email: email || undefined,
            phone: phone || undefined,
          }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as {
          alreadyExists?: boolean;
          emailSent?: boolean;
          reason?: string;
        };
        // Only email links a guest lead to an account later (leads/link-current).
        if (email) localStorage.setItem(PENDING_LEAD_KEY, email);
        setAlreadySubmitted(Boolean(data.alreadyExists));
        setSubmissionReason(data.reason);
        setConfirmationEmailSent(Boolean(email) && data.emailSent !== false);
        track("lead_submitted", { source });
        setSubmitted(true);
      } catch {
        toast.error("Не удалось отправить заявку. Попробуй ещё раз.");
      }
    },
    [source, wantsCall],
  );

  useEffect(() => {
    if (!open) return;
    const apiOrigin = new URL(API_URL, window.location.href).origin;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== apiOrigin || event.data?.type !== "gojo:telegram-login") return;
      setTelegramLoading(false);
      const payload = event.data.payload as TelegramLoginPayload;
      if (!payload.proof || !payload.user) {
        console.error("Telegram Login failed:", payload.error);
        toast.error(`Telegram: ${payload.error ?? "login_failed"}`);
        return;
      }
      const nameInput = document.getElementById("bm-name") as HTMLInputElement | null;
      if (nameInput && !nameInput.value.trim()) nameInput.value = payload.user.name;
      void submitForm({ proof: payload.proof, name: payload.user.name });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, submitForm]);

  const openTelegramLogin = () => {
    setTelegramLoading(true);
    const popup = window.open(
      `${API_URL}/leads/telegram/start`,
      "gojo-telegram-login",
      "popup=yes,width=550,height=650",
    );
    if (!popup) {
      setTelegramLoading(false);
      toast.error("Разреши всплывающие окна, чтобы войти через Telegram.");
    }
  };

  return (
    <div className="landing-root">
      <div
        className={`modal-overlay ${open ? "open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="modal-box">
          <button type="button" className="modal-close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>

          <div style={{ display: submitted ? "none" : "block" }}>
            <div className="modal-tag">🎌 Бесплатный первый урок</div>
            <h2 className="modal-title">
              Попробуй японский
              <br />
              <em>без обязательств</em>
            </h2>
            <p className="modal-sub">
              Урок 25 минут онлайн — познакомимся, определим уровень и покажем план. Без продаж.
            </p>
            <div className="modal-trust">
              <img src="/founder.webp" alt="Руслан Рустаев" />
              <div>
                <strong>Руслан Рустаев</strong>
                <span>Сооснователь Gojo · топ-преподаватель Profi.ru</span>
              </div>
            </div>

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="bm-name">
                  Имя
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Как тебя зовут?"
                  id="bm-name"
                  autoComplete="name"
                />
              </div>
              <div className="form-group">
                <span className="form-label">Telegram</span>
                <button
                  className="form-submit bm-telegram-login"
                  type="button"
                  disabled={telegramLoading}
                  onClick={openTelegramLogin}
                >
                  {telegramLoading ? "Открываем Telegram…" : "Войти через Telegram"}
                </button>
                <p className="form-note" style={{ marginTop: "6px", textAlign: "left" }}>
                  Подтверди вход — и мы сможем написать, чтобы договориться о времени.
                </p>
              </div>
              {showAlt ? (
                <div
                  style={{
                    background: "var(--cream-dark)",
                    borderRadius: "14px",
                    padding: "15px 15px 16px",
                    marginBottom: "4px",
                  }}
                >
                  <p className="form-note" style={{ margin: "0 0 12px", textAlign: "left" }}>
                    Telegram быстрее, но можно и так — оставь что удобно.
                  </p>
                  <div className="form-group" style={{ marginBottom: wantsCall ? "12px" : 0 }}>
                    <label className="form-label" htmlFor="bm-email">
                      Email
                    </label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="your@email.com"
                      id="bm-email"
                      autoComplete="email"
                    />
                  </div>
                  {wantsCall ? (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="bm-phone">
                        Телефон
                      </label>
                      <input
                        className="form-input"
                        type="tel"
                        placeholder="+7 (900) 000-00-00"
                        id="bm-phone"
                        autoComplete="tel"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="bm-alt-link"
                      onClick={() => setWantsCall(true)}
                    >
                      Хочу, чтобы позвонили →
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" className="bm-alt-link" onClick={() => setShowAlt(true)}>
                  Нет Telegram? Другой способ связи
                </button>
              )}
              {showAlt ? (
                <button
                  type="button"
                  className="form-submit"
                  style={{ marginTop: "18px" }}
                  onClick={() => void submitForm()}
                >
                  Отправить заявку
                </button>
              ) : null}
              <p className="form-note">
                Нажимая кнопку, ты соглашаешься с политикой конфиденциальности. Никакого спама —
                только информация о записи.
              </p>
            </div>
          </div>

          <div className="form-success" style={{ display: submitted ? "block" : "none" }}>
            <div className="form-success-icon">🎌</div>
            <div className="form-success-title">
              {submissionReason === "account_has_trial"
                ? "У тебя уже был бесплатный урок"
                : alreadySubmitted
                  ? "Заявка уже принята"
                  : "Отлично, ждём тебя!"}
            </div>
            <p className="form-success-text">
              {submissionReason === "account_has_trial"
                ? "Этот email уже связан с аккаунтом, где бесплатный урок использован. Войди в кабинет или напиши нам в Telegram, если нужна помощь."
                : alreadySubmitted
                  ? "Повторно отправлять ничего не нужно — мы уже получили заявку и свяжемся в течение 24 часов."
                  : confirmationEmailSent
                    ? "Мы получили заявку и отправили подтверждение на email. Свяжемся в течение 24 часов, чтобы договориться о времени первого урока."
                    : "Мы получили заявку и свяжемся в течение 24 часов, чтобы договориться о времени первого урока."}
            </p>
            <a
              href="https://t.me/gojoedu"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "14px",
                background: "var(--orange)",
                color: "var(--white)",
                padding: "13px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              ✈️ Telegram сообщество Gojo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
