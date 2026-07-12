"use client";

import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PENDING_LEAD_KEY = "gojo:pending-lead-email";

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

  const submitForm = async () => {
    const name = readValue("bm-name");
    const telegram = readValue("bm-telegram");
    const email = readValue("bm-email");
    const phone = wantsCall ? readValue("bm-phone") : "";
    if (!name) {
      toast.error("Пожалуйста, заполни имя");
      return;
    }
    if (!telegram && !email && !phone) {
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
          telegram: telegram || undefined,
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
                <label className="form-label" htmlFor="bm-telegram">
                  Telegram
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="@username"
                  id="bm-telegram"
                  autoComplete="off"
                  autoCapitalize="off"
                />
                <p className="form-note" style={{ marginTop: "6px", textAlign: "left" }}>
                  Напишем сюда, чтобы договориться о времени — так быстрее всего.
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
              <button
                type="button"
                className="form-submit"
                style={{ marginTop: "18px" }}
                onClick={submitForm}
              >
                Продолжить в Telegram
              </button>
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
