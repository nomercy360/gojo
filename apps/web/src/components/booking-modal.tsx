"use client";

import { track } from "@/lib/analytics";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PENDING_LEAD_KEY = "gojo:pending-lead-email";

type TelegramLoginPayload = {
  proof?: string;
  user?: { id: number; name: string; username?: string; picture?: string };
  error?: string;
};

type ContactMethod = "telegram" | "email" | "phone";

const contactMethods: Array<{ id: ContactMethod; label: string }> = [
  { id: "telegram", label: "Telegram" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Телефон" },
];

/**
 * Shared "book a free lesson" modal — used by the landing page's own CTAs
 * and, as a consultation-booking prompt, by the guest CTAs on the kana/kanji
 * trainers and the quiz result screen.
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
  const [contactMethod, setContactMethod] = useState<ContactMethod>("telegram");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submissionReason, setSubmissionReason] = useState<string | undefined>();
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(true);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    track("booking_open", { source });
    setContactMethod("telegram");
    setSubmitted(false);
    setAlreadySubmitted(false);
    setSubmissionReason(undefined);
    setConfirmationEmailSent(true);
    setTelegramLoading(false);
    setFormSubmitting(false);
    setPrivacyAccepted(false);
  }, [open, source]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submitLead = useCallback(
    async ({
      telegram,
      submittedEmail,
      submittedPhone,
    }: {
      telegram?: { proof: string; name: string };
      submittedEmail?: string;
      submittedPhone?: string;
    }) => {
      if (!privacyAccepted) {
        toast.error("Подтверди согласие на обработку персональных данных");
        return;
      }
      setFormSubmitting(true);
      try {
        const normalizedEmail = submittedEmail?.trim();
        const normalizedPhone = submittedPhone?.trim();
        const response = await fetch(`${API_URL}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "booking",
            // Telegram supplies the person's verified display name. The compact
            // email/phone redesign deliberately asks for one contact value only.
            name: telegram?.name || "Гость",
            telegramProof: telegram?.proof,
            email: normalizedEmail || undefined,
            phone: normalizedPhone || undefined,
            personalDataConsent: true,
            consentVersion: "2026-07-13",
          }),
        });
        if (!response.ok) throw new Error();

        const data = (await response.json()) as {
          alreadyExists?: boolean;
          emailSent?: boolean;
          reason?: string;
        };
        if (normalizedEmail) localStorage.setItem(PENDING_LEAD_KEY, normalizedEmail);
        setAlreadySubmitted(Boolean(data.alreadyExists));
        setSubmissionReason(data.reason);
        setConfirmationEmailSent(Boolean(normalizedEmail) && data.emailSent !== false);
        track("lead_submitted", { source });
        setSubmitted(true);
      } catch {
        toast.error("Не удалось отправить заявку. Проверь контакт и попробуй ещё раз.");
      } finally {
        setFormSubmitting(false);
      }
    },
    [privacyAccepted, source],
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
      void submitLead({ telegram: { proof: payload.proof, name: payload.user.name } });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, submitLead]);

  const openTelegramLogin = () => {
    if (!privacyAccepted) {
      toast.error("Сначала подтверди согласие на обработку персональных данных");
      return;
    }
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

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (contactMethod === "email") {
      void submitLead({ submittedEmail: email });
      return;
    }
    if (contactMethod === "phone") void submitLead({ submittedPhone: phone });
  };

  return (
    <div className="landing-root">
      <div
        className={`modal-overlay booking-modal-overlay ${open ? "open" : ""}`}
        aria-hidden={!open}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <dialog
          open={open}
          className="modal-box booking-modal-box"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
        >
          <button
            type="button"
            className="modal-close booking-modal-close"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <div hidden={submitted}>
            <div className="booking-modal-tag">Бесплатный первый урок</div>
            <h2 className="booking-modal-title" id="booking-modal-title">
              Попробуй японский
              <br />
              <em>без обязательств</em>
            </h2>
            <p className="booking-modal-lead">
              25 минут онлайн: познакомимся, определим уровень и покажем план.
            </p>
            <p className="booking-modal-teacher">Урок проведёт Руслан Рустаев, сооснователь gojo</p>

            <div className="booking-contact-tabs" role="tablist" aria-label="Способ связи">
              {contactMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  id={`booking-tab-${method.id}`}
                  className={`booking-contact-tab ${contactMethod === method.id ? "active" : ""}`}
                  role="tab"
                  aria-selected={contactMethod === method.id}
                  aria-controls={`booking-panel-${method.id}`}
                  tabIndex={contactMethod === method.id ? 0 : -1}
                  onClick={() => setContactMethod(method.id)}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <form className="booking-contact-form" onSubmit={submitContact}>
              <div
                id="booking-panel-telegram"
                role="tabpanel"
                aria-labelledby="booking-tab-telegram"
                hidden={contactMethod !== "telegram"}
              >
                <button
                  className="booking-contact-action booking-telegram-action"
                  type="button"
                  disabled={telegramLoading || formSubmitting}
                  onClick={openTelegramLogin}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21.8 3.2 18.6 19c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.1 12.8 1.3 11.3C.2 11.1.2 10.3 1.5 9.8L20.3 2.6c.9-.3 1.7.2 1.5.6Z" />
                  </svg>
                  {telegramLoading || formSubmitting
                    ? "Открываем Telegram…"
                    : "Войти через Telegram"}
                </button>
              </div>

              <div
                className="booking-inline-panel"
                id="booking-panel-email"
                role="tabpanel"
                aria-labelledby="booking-tab-email"
                hidden={contactMethod !== "email"}
              >
                <label className="sr-only" htmlFor="bm-email">
                  Email
                </label>
                <input
                  id="bm-email"
                  type="email"
                  value={email}
                  placeholder="name@mail.com"
                  autoComplete="email"
                  required={contactMethod === "email"}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <button className="booking-contact-action" type="submit" disabled={formSubmitting}>
                  {formSubmitting ? "Отправляем…" : "Записаться"}
                </button>
              </div>

              <div
                className="booking-inline-panel"
                id="booking-panel-phone"
                role="tabpanel"
                aria-labelledby="booking-tab-phone"
                hidden={contactMethod !== "phone"}
              >
                <label className="sr-only" htmlFor="bm-phone">
                  Телефон
                </label>
                <input
                  id="bm-phone"
                  type="tel"
                  value={phone}
                  placeholder="+7 900 000-00-00"
                  autoComplete="tel"
                  inputMode="tel"
                  required={contactMethod === "phone"}
                  onChange={(event) => setPhone(event.target.value)}
                />
                <button className="booking-contact-action" type="submit" disabled={formSubmitting}>
                  {formSubmitting ? "Отправляем…" : "Жду звонка"}
                </button>
              </div>

              <label
                className="booking-modal-policy"
                style={{ display: "flex", gap: 8, textAlign: "left" }}
              >
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  style={{ marginTop: 2, flex: "0 0 auto" }}
                />
                <span>
                  Я даю отдельное{" "}
                  <a href="/personal-data-consent" target="_blank" rel="noopener noreferrer">
                    согласие на обработку персональных данных
                  </a>{" "}
                  и ознакомился(-ась) с{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    Политикой
                  </a>
                  .
                </span>
              </label>
            </form>

            <p className="booking-modal-policy">
              Согласие не включает рекламные рассылки; контакт используется для заявки и записи.
            </p>
          </div>

          <div className="form-success booking-modal-success" hidden={!submitted}>
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
              className="booking-success-link"
            >
              Telegram сообщество Gojo
            </a>
          </div>
        </dialog>
      </div>
    </div>
  );
}
