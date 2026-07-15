"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";
import { telegramBotStartUrl } from "@/lib/telegram";
import { ArrowLeft, Check, Mail, Send, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TELEGRAM_LEAD_URL = telegramBotStartUrl("lead");

type View = "choose" | "email" | "sent";

type SubmissionResult = {
  alreadyExists: boolean;
  reason?: string;
};

/**
 * Shared free-trial lead modal used by the landing page, kana trainer, and
 * level quiz. Telegram is the primary path; email is a progressively disclosed
 * fallback. Neither path creates an account.
 */
export function BookingModal({
  open,
  onClose,
  source = "landing",
}: {
  open: boolean;
  onClose: () => void;
  source?: string;
}) {
  const [view, setView] = useState<View>("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResult>({ alreadyExists: false });

  const emailValid = name.trim().length > 1 && email.includes("@") && privacyAccepted;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    track("booking_open", { source });
    setView("choose");
    setPrivacyAccepted(false);
    setSubmitting(false);
    setSubmission({ alreadyExists: false });
  }, [open, source]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submitEmailLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailValid || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "booking",
          name: name.trim(),
          email: email.trim(),
          goal: note.trim() || undefined,
          personalDataConsent: true,
          consentVersion: "2026-07-13",
        }),
      });
      if (!response.ok) throw new Error("lead_submission_failed");

      const result = (await response.json()) as SubmissionResult;
      setSubmission({
        alreadyExists: Boolean(result.alreadyExists),
        reason: result.reason,
      });
      track("lead_submitted", { source, channel: "email" });
      setView("sent");
    } catch {
      toast.error("Не удалось отправить заявку. Проверь email и попробуй ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

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
          aria-labelledby={view === "sent" ? "booking-success-title" : "booking-modal-title"}
        >
          <Button
            variant="unstyled"
            type="button"
            className="modal-close booking-modal-close"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>

          {view !== "sent" ? (
            <header className="booking-modal-header">
              <div className="booking-modal-tag">Бесплатный первый урок</div>
              <h2 className="booking-modal-title" id="booking-modal-title">
                Попробуй японский
                <br />
                <em>без обязательств</em>
              </h2>
              <p className="booking-modal-lead">
                25 минут онлайн: познакомимся, определим уровень и покажем план.
              </p>
              <p className="booking-modal-teacher">
                Урок проведёт Руслан Рустаев, сооснователь Gojo.
              </p>
            </header>
          ) : null}

          {view === "choose" ? (
            <div className="booking-choice-view">
              <a
                className="booking-telegram-hero"
                href={TELEGRAM_LEAD_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send aria-hidden="true" />
                Написать боту в Telegram
              </a>
              <p className="booking-telegram-note">Пара вопросов — и бот подберёт время.</p>

              <div className="booking-email-fallback">
                <Button
                  variant="unstyled"
                  type="button"
                  className="booking-email-fallback-button"
                  onClick={() => setView("email")}
                >
                  <Mail aria-hidden="true" />
                  Нет Telegram? Оставить email
                </Button>
              </div>
            </div>
          ) : null}

          {view === "email" ? (
            <form className="booking-email-form" onSubmit={submitEmailLead}>
              <label className="sr-only" htmlFor="booking-name">
                Как тебя зовут
              </label>
              <Input
                id="booking-name"
                value={name}
                maxLength={200}
                autoComplete="name"
                placeholder="Как тебя зовут"
                required
                onChange={(event) => setName(event.target.value)}
              />

              <label className="sr-only" htmlFor="booking-email">
                Email
              </label>
              <Input
                id="booking-email"
                type="email"
                value={email}
                maxLength={200}
                autoComplete="email"
                placeholder="you@example.com"
                required
                onChange={(event) => setEmail(event.target.value)}
              />

              <label className="sr-only" htmlFor="booking-note">
                Текущий уровень или цель
              </label>
              <Textarea
                id="booking-note"
                value={note}
                rows={2}
                maxLength={500}
                placeholder="Текущий уровень или цель — если хочешь (необязательно)"
                onChange={(event) => setNote(event.target.value)}
              />

              <label className="booking-email-consent" htmlFor="booking-privacy-consent">
                <Input
                  unstyled
                  id="booking-privacy-consent"
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
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
                className="booking-email-submit"
                disabled={!emailValid || submitting}
              >
                {submitting ? "Отправляем…" : "Оставить заявку"}
              </Button>

              <Button
                variant="unstyled"
                type="button"
                className="booking-back-button"
                onClick={() => setView("choose")}
              >
                <ArrowLeft aria-hidden="true" />
                Лучше через Telegram
              </Button>
            </form>
          ) : null}

          {view === "sent" ? (
            <div className="booking-sent-view" aria-live="polite">
              <div className="booking-sent-icon">
                <Check aria-hidden="true" />
              </div>
              <h2 id="booking-success-title">
                {submission.reason === "account_has_trial"
                  ? "Бесплатный урок уже использован"
                  : submission.alreadyExists
                    ? "Заявка уже принята"
                    : "Заявка принята"}
              </h2>
              <p>
                {submission.reason === "account_has_trial"
                  ? "Этот email уже связан с аккаунтом, где бесплатный урок использован. Если нужна помощь, напиши нам в Telegram."
                  : submission.alreadyExists
                    ? "Повторно отправлять ничего не нужно — мы уже получили заявку и свяжемся в течение суток."
                    : "Напишем на "}
                {!submission.alreadyExists && submission.reason !== "account_has_trial" ? (
                  <>
                    <strong>{email.trim()}</strong> в течение суток, чтобы договориться о пробном
                    уроке.
                  </>
                ) : null}
              </p>
              <p className="booking-sent-telegram">
                Есть Telegram?{" "}
                <a href={TELEGRAM_LEAD_URL} target="_blank" rel="noopener noreferrer">
                  Так быстрее →
                </a>
              </p>
            </div>
          ) : null}
        </dialog>
      </div>
    </div>
  );
}
