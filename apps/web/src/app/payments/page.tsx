import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchMyPayments, fetchPaymentPlans } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkoutAction } from "./actions";
import { PaidPayments } from "./paid-payments";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  payment_provider_not_configured:
    "Оплата через ЮKassa ещё не настроена: не заданы shop id или secret key.",
  payment_forbidden: "Оплата доступна только студентскому аккаунту.",
  checkout_failed: "Не удалось создать платёж. Попробуй ещё раз или напиши администратору.",
};

function ContactBlock() {
  return (
    <Card className="mt-8 flex-row flex-wrap items-center justify-between gap-4 p-5">
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
        className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
      >
        Написать в Telegram
      </a>
    </Card>
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
      <div className="mx-auto max-w-4xl px-6 py-12 sm:px-10 sm:py-14">
        <h1 className="g-display text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-gojo-ink sm:text-[52px]">
          {account.access.isActive ? "Платежи и доступ" : "Доступ к занятиям"}
        </h1>
        <p className="g-body mt-3 max-w-2xl text-[15px] font-medium leading-relaxed text-gojo-ink-muted sm:text-[16px]">
          {account.access.isActive
            ? "Здесь можно проверить текущий доступ, историю операций и при необходимости продлить занятия. "
            : "Оплата проходит через ЮKassa. Сейчас это разовый платёж без автоматического продления и повторных списаний. После успешного платежа доступ обновится автоматически. "}
          Нажимая кнопку оплаты, ты принимаешь условия{" "}
          <Link href="/offer" className="font-bold text-gojo-orange underline">
            публичной оферты
          </Link>
          . Сведения об обработке данных — в{" "}
          <Link href="/privacy" className="font-bold text-gojo-orange underline">
            Политике
          </Link>
          .
        </p>

        {error ? (
          <Alert variant="destructive" className="mt-6 bg-gojo-error-soft">
            <AlertDescription className="font-bold text-gojo-error">
              {ERROR_COPY[error] ?? ERROR_COPY.checkout_failed}
            </AlertDescription>
          </Alert>
        ) : null}

        {account.access.isActive ? (
          <PaidPayments account={account} plans={plans} />
        ) : (
          <>
            {account.payments.length > 0 ? (
              <Card id="payment-status" className="mt-8 scroll-mt-24 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
                  Текущий статус
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <StatusTile label="Доступ" value="Нет" />
                  <StatusTile label="До" value="—" />
                  <StatusTile label="Уроки" value="0" />
                </div>
              </Card>
            ) : null}

            <section className="mt-8">
              <h2 className="font-serif text-[24px] font-bold">Выбери формат занятий</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {plans.map((plan) => (
                  <Card key={plan.id} className="p-5">
                    <form action={checkoutAction} className="flex flex-1 flex-col">
                      <Input type="hidden" name="planId" value={plan.id} />
                      <h3 className="font-serif text-[24px] font-bold">{plan.title}</h3>
                      <p className="mt-2 text-sm text-gojo-ink-muted">{plan.description}</p>
                      <div className="mt-auto pt-5">
                        <div className="font-serif text-[34px] font-bold">
                          {Number(plan.amountValue).toLocaleString("ru-RU")} ₽
                        </div>
                        <Button type="submit" className="mt-5 w-full">
                          Оплатить через ЮKassa
                        </Button>
                        <p className="mt-3 text-xs leading-relaxed text-gojo-ink-muted">
                          Разовый платёж без автопродления. Условия — в{" "}
                          <Link href="/offer" className="font-bold underline">
                            публичной оферте
                          </Link>
                          .
                        </p>
                      </div>
                    </form>
                  </Card>
                ))}
              </div>
            </section>

            <ContactBlock />

            {account.payments.length > 0 ? (
              <section id="payment-history" className="mt-10 scroll-mt-24">
                <h2 className="font-serif text-[24px] font-bold">История платежей</h2>
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
              </section>
            ) : null}
          </>
        )}

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
