import { fetchMyPayments, fetchPaymentPlans } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkoutAction } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  payment_provider_not_configured:
    "Оплата через ЮKassa ещё не настроена: не заданы shop id или secret key.",
  payment_forbidden: "Оплата доступна только студентскому аккаунту.",
  checkout_failed: "Не удалось создать платёж. Попробуй ещё раз или напиши администратору.",
};

function ContactBlock() {
  return (
    <section className="g-card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <div className="font-serif text-[18px] font-bold">
          Возникла проблема или хочешь изменить план?
        </div>
        <p className="mt-1 text-sm text-gojo-ink-muted">Свяжись с нами — поможем разобраться.</p>
      </div>
      <a
        href="https://t.me/gojoedu"
        target="_blank"
        rel="noopener noreferrer"
        className="g-btn-secondary shrink-0 text-sm"
      >
        Написать в Telegram
      </a>
    </section>
  );
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isTeacherUser(user)) redirect("/teacher");

  const { error } = await searchParams;
  const [account, plans] = await Promise.all([fetchMyPayments(), fetchPaymentPlans()]);

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Оплата
        </div>
        <h1 className="mt-2 font-serif text-[32px] font-bold">Доступ к занятиям</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gojo-ink-muted">
          Оплата проходит через ЮKassa. Сейчас это разовый платёж без автоматического продления и
          повторных списаний. После успешного платежа доступ обновится автоматически; если ты уже
          вернулся с оплаты, обнови страницу через несколько секунд. Сведения об обработке данных —
          в{" "}
          <Link href="/privacy" className="font-bold text-gojo-orange underline">
            Политике
          </Link>
          .
        </p>

        {error ? (
          <div className="mt-6 rounded-lg border border-gojo-error/40 bg-gojo-error-soft px-5 py-4 text-sm font-bold text-gojo-error">
            {ERROR_COPY[error] ?? ERROR_COPY.checkout_failed}
          </div>
        ) : null}

        <section className="g-card mt-8 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Текущий статус
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatusTile label="Доступ" value={account.access.isActive ? "Активен" : "Нет"} />
            <StatusTile
              label="До"
              value={
                account.access.activeUntil
                  ? new Date(account.access.activeUntil).toLocaleDateString("ru-RU")
                  : "—"
              }
            />
            <StatusTile label="Уроки" value={String(account.access.lessonCredits)} />
          </div>
        </section>

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className="g-card p-5">
              <form action={checkoutAction}>
                <input type="hidden" name="planId" value={plan.id} />
                <h2 className="font-serif text-[24px] font-bold">{plan.title}</h2>
                <p className="mt-2 text-sm text-gojo-ink-muted">{plan.description}</p>
                <div className="mt-5 font-serif text-[34px] font-bold">
                  {Number(plan.amountValue).toLocaleString("ru-RU")} ₽
                </div>
                <button type="submit" className="g-btn-primary mt-5 w-full text-sm">
                  Оплатить через ЮKassa
                </button>
              </form>
            </div>
          ))}
        </section>

        <ContactBlock />

        <section className="mt-10">
          <h2 className="font-serif text-[24px] font-bold">История платежей</h2>
          {account.payments.length === 0 ? (
            <p className="mt-3 text-sm text-gojo-ink-muted">Платежей пока нет.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {account.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gojo-ink/10 bg-gojo-surface-2 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-bold">{payment.planId}</div>
                    <div className="text-gojo-ink-muted">
                      {new Date(payment.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <div className="font-bold">
                    {Number(payment.amountValue).toLocaleString("ru-RU")} ₽ · {payment.status}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link href="/dashboard" className="mt-10 inline-block text-sm font-bold text-gojo-orange">
          ← В кабинет
        </Link>
      </div>
    </main>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gojo-paper px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gojo-ink-muted">
        {label}
      </div>
      <div className="mt-1 font-serif text-[22px] font-bold">{value}</div>
    </div>
  );
}
