"use client";

import { LocalTime } from "@/components/local-time";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PaymentPlanDto, PaymentStatus, PaymentsMeDto } from "@gojo/shared";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  MessageCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { checkoutAction } from "./actions";
import { PAYMENT_EXPIRY_NUDGE_DAYS } from "./config";

const FALLBACK_TIME_ZONE = "Europe/Moscow";
const DAY_MS = 24 * 60 * 60 * 1000;

type ExpiryView = {
  iso: string;
  formattedDate: string;
  daysLeft: number;
};

export function PaidPayments({
  account,
  plans,
}: {
  account: PaymentsMeDto;
  plans: PaymentPlanDto[];
}) {
  const currentPlan = resolveCurrentPlan(account, plans);
  const [timeZone, setTimeZone] = useState(FALLBACK_TIME_ZONE);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE);
  }, []);

  const isMonthlyPlan = Boolean(currentPlan?.durationDays);
  const isLessonPackage = Boolean(currentPlan?.lessonCredits && !currentPlan.durationDays);
  const expiry =
    isMonthlyPlan && account.access.activeUntil
      ? getExpiryView(account.access.activeUntil, timeZone)
      : null;
  const shouldNudge =
    expiry !== null && expiry.daysLeft >= 0 && expiry.daysLeft <= PAYMENT_EXPIRY_NUDGE_DAYS;

  return (
    <div className="mt-8 space-y-5">
      {shouldNudge && currentPlan ? <ExpiryNudge expiry={expiry} planId={currentPlan.id} /> : null}

      <StatusHero
        plan={currentPlan}
        expiry={expiry}
        lessonCredits={isLessonPackage ? account.access.lessonCredits : null}
      />

      <PaymentHistory account={account} plans={plans} />

      <Renewal currentPlan={currentPlan} plans={plans} />

      <PaidContactBlock />
    </div>
  );
}

function StatusHero({
  plan,
  expiry,
  lessonCredits,
}: {
  plan: PaymentPlanDto | null;
  expiry: ExpiryView | null;
  lessonCredits: number | null;
}) {
  const columnCount = 1 + Number(Boolean(expiry)) + Number(lessonCredits !== null);

  return (
    <Card id="payment-status" className="scroll-mt-24 gap-0 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>Текущий статус</Eyebrow>
        <p className="g-body text-[12px] text-gojo-ink-muted sm:text-[13px]">
          План: {plan?.title ?? "не определён"}
        </p>
      </div>

      <div
        className={cn(
          "mt-5 grid divide-y divide-black/10 sm:divide-x sm:divide-y-0",
          columnCount === 3
            ? "sm:grid-cols-3"
            : columnCount === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-1",
        )}
      >
        <StatusCell label="Доступ">
          <span className="inline-flex items-center gap-2 text-gojo-success">
            <span className="h-2.5 w-2.5 rounded-full bg-gojo-success" aria-hidden="true" />
            Активен
          </span>
        </StatusCell>

        {expiry ? (
          <StatusCell label="Действует до" sub={daysRemainingCopy(expiry.daysLeft)}>
            <time dateTime={expiry.iso}>{expiry.formattedDate}</time>
          </StatusCell>
        ) : null}

        {lessonCredits !== null ? (
          <StatusCell label="Уроков осталось">
            {plan && lessonCredits <= plan.lessonCredits
              ? `${lessonCredits} из ${plan.lessonCredits}`
              : String(lessonCredits)}
          </StatusCell>
        ) : null}
      </div>

      <div className="g-body mt-5 flex items-start gap-2.5 rounded-xl bg-gojo-surface-2 px-4 py-3 text-[13px] leading-relaxed text-gojo-ink-muted">
        <RefreshCw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Разовый платёж — <strong className="font-bold text-gojo-ink">автопродления нет</strong>.{" "}
          {expiry
            ? `Доступ закончится ${expiry.formattedDate}, если не продлить заранее.`
            : "Новые уроки добавятся только после следующей оплаты."}
        </p>
      </div>
    </Card>
  );
}

function StatusCell({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0">
      <div className="g-mono text-[10px] font-bold uppercase tracking-[0.12em] text-gojo-ink-ghost">
        {label}
      </div>
      <div className="g-display mt-1.5 text-[27px] font-bold leading-tight text-gojo-ink sm:text-[30px]">
        {children}
      </div>
      {sub ? <div className="g-body mt-1 text-[12px] text-gojo-ink-muted">{sub}</div> : null}
    </div>
  );
}

function ExpiryNudge({ expiry, planId }: { expiry: ExpiryView; planId: string }) {
  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-gojo-warning/25 bg-gojo-warning-soft p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gojo-warning" />
        <div>
          <h2 className="g-body text-[15px] font-bold text-gojo-ink sm:text-[16px]">
            {expiry.daysLeft === 0
              ? "Доступ заканчивается сегодня"
              : `Доступ заканчивается через ${daysCount(expiry.daysLeft)}`}
          </h2>
          <p className="g-body mt-1 text-[13px] text-gojo-ink-muted">
            Автосписания нет — продли до {expiry.formattedDate}, чтобы не прерывать занятия.
          </p>
        </div>
      </div>
      <CheckoutForm planId={planId} label="Продлить" compact />
    </aside>
  );
}

function PaymentHistory({ account, plans }: { account: PaymentsMeDto; plans: PaymentPlanDto[] }) {
  const planNames = new Map(plans.map((plan) => [plan.id, plan.title]));

  return (
    <Card id="payment-history" className="scroll-mt-24 gap-0 p-5 sm:p-7">
      <Eyebrow muted>История операций</Eyebrow>

      {account.payments.length === 0 ? (
        <p className="g-body mt-4 text-[13px] text-gojo-ink-muted">Операций пока нет.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/10">
          {account.payments.map((payment) => (
            <li
              key={payment.id}
              className="grid items-center gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[120px_minmax(0,1fr)_auto_auto] sm:gap-4"
            >
              <LocalTime
                iso={payment.paidAt ?? payment.createdAt}
                options={{ day: "numeric", month: "short", year: "numeric" }}
                className="g-body text-[12px] text-gojo-ink-muted sm:text-[13px]"
              />
              <div className="g-body min-w-0 truncate text-[14px] font-bold text-gojo-ink sm:text-[15px]">
                {planNames.get(payment.planId) ?? payment.planId}
              </div>
              <div className="g-body text-[14px] font-bold text-gojo-ink sm:text-[15px]">
                {formatPrice(payment.amountValue, payment.currency)}
              </div>
              <PaymentStatusBadge status={payment.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const content = {
    succeeded: {
      label: "Успешно",
      icon: <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />,
      className: "bg-gojo-success-soft text-gojo-success",
    },
    pending: {
      label: "В обработке",
      icon: <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />,
      className: "bg-gojo-warning-soft text-gojo-warning",
    },
    canceled: {
      label: "Отменено",
      icon: <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />,
      className: "bg-gojo-error-soft text-gojo-error",
    },
  }[status];

  return (
    <span
      className={cn(
        "g-body inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold",
        content.className,
      )}
    >
      {content.icon}
      {content.label}
    </span>
  );
}

function Renewal({
  currentPlan,
  plans,
}: {
  currentPlan: PaymentPlanDto | null;
  plans: PaymentPlanDto[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="gap-0 p-5 sm:p-7">
      <Eyebrow muted>Продление</Eyebrow>

      {currentPlan ? (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="g-display text-[22px] font-bold text-gojo-ink">{currentPlan.title}</h2>
            <p className="g-body mt-1 text-[13px] text-gojo-ink-muted">
              Продлить тот же план — {formatPrice(currentPlan.amountValue, currentPlan.currency)}
            </p>
          </div>
          <CheckoutForm planId={currentPlan.id} label="Продлить через ЮKassa" />
        </div>
      ) : (
        <p className="g-body mt-4 text-[13px] text-gojo-ink-muted">
          Выбери подходящий вариант продления.
        </p>
      )}

      <Button
        type="button"
        variant="unstyled"
        aria-expanded={open}
        aria-controls="other-payment-plans"
        onClick={() => setOpen((current) => !current)}
        className="g-body mt-5 inline-flex items-center gap-1.5 rounded-lg text-[14px] font-bold text-gojo-ink-muted outline-none transition-colors hover:text-gojo-orange focus-visible:ring-2 focus-visible:ring-gojo-orange focus-visible:ring-offset-2"
      >
        Другие варианты
        {open ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        )}
      </Button>

      {open ? (
        <div id="other-payment-plans" className="mt-4 grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-col rounded-xl border border-black/10 p-4">
              <h3 className="g-display text-[19px] font-bold text-gojo-ink">{plan.title}</h3>
              <p className="g-body mt-1 text-[13px] leading-relaxed text-gojo-ink-muted">
                {plan.description}
              </p>
              <div className="g-display mt-auto pt-3 text-[23px] font-bold text-gojo-ink">
                {formatPrice(plan.amountValue, plan.currency)}
              </div>
              <CheckoutForm planId={plan.id} label="Выбрать" compact className="mt-3" />
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function CheckoutForm({
  planId,
  label,
  compact = false,
  className,
}: {
  planId: string;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <form action={checkoutAction} className={cn("shrink-0", className)}>
      <Input type="hidden" name="planId" value={planId} />
      <Button type="submit" size={compact ? "sm" : "default"} className="w-full sm:w-auto">
        {label}
      </Button>
    </form>
  );
}

function PaidContactBlock() {
  return (
    <Card className="flex-col gap-5 border-0 bg-gojo-paper-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div>
        <h2 className="g-display text-[20px] font-extrabold text-gojo-ink">
          Проблема с оплатой или хочешь сменить план?
        </h2>
        <p className="g-body mt-1 text-[13px] text-gojo-ink-muted sm:text-[14px]">
          Напиши — поможем разобраться.
        </p>
      </div>
      <a
        href="https://t.me/gojoedu"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ size: "lg" }), "shrink-0 rounded-xl")}
      >
        <MessageCircle aria-hidden="true" />
        Telegram
      </a>
    </Card>
  );
}

function Eyebrow({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      className={cn(
        "g-mono text-[11px] font-bold uppercase tracking-[0.16em]",
        muted ? "text-gojo-ink-ghost" : "text-gojo-orange",
      )}
    >
      {children}
    </div>
  );
}

function resolveCurrentPlan(account: PaymentsMeDto, plans: PaymentPlanDto[]) {
  if (account.assignedPlan) return account.assignedPlan;

  const successfulPlanId = account.payments.find(
    (payment) => payment.status === "succeeded",
  )?.planId;
  const paidPlan = plans.find((plan) => plan.id === successfulPlanId);
  if (paidPlan) return paidPlan;

  if (account.access.activeUntil) return plans.find((plan) => plan.durationDays > 0) ?? null;
  if (account.access.lessonCredits > 0) return plans.find((plan) => plan.lessonCredits > 0) ?? null;
  return null;
}

function getExpiryView(iso: string, timeZone: string): ExpiryView {
  const expiryDate = new Date(iso);
  const expiryDay = dateParts(expiryDate, timeZone);
  const today = dateParts(new Date(), timeZone);
  const expiryUtc = Date.UTC(expiryDay.year, expiryDay.month - 1, expiryDay.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);

  return {
    iso,
    formattedDate: new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone,
    }).format(expiryDate),
    daysLeft: Math.ceil((expiryUtc - todayUtc) / DAY_MS),
  };
}

function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return { year: value("year"), month: value("month"), day: value("day") };
}

function daysRemainingCopy(days: number) {
  if (days === 0) return "заканчивается сегодня";
  if (days < 0) return "срок закончился";
  return `осталось ${daysCount(days)}`;
}

function daysCount(days: number) {
  const mod10 = days % 10;
  const mod100 = days % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "день"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "дня"
        : "дней";
  return `${days} ${word}`;
}

function formatPrice(value: string, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}
