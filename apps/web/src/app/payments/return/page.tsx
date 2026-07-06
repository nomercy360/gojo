import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PaymentReturnPage() {
  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="g-card px-6 py-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            ЮKassa
          </div>
          <h1 className="mt-2 font-serif text-[28px] font-bold">Проверяем оплату</h1>
          <p className="mt-3 text-sm leading-relaxed text-gojo-ink-muted">
            Если платёж прошёл успешно, доступ обновится автоматически после уведомления от ЮKassa.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/payments" className="g-btn-primary text-sm">
              Обновить статус
            </Link>
            <Link href="/dashboard" className="g-btn-secondary text-sm">
              В кабинет
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
