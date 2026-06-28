import Link from "next/link";

export default function DashboardPage() {
  const greeting = getGreeting();

  return (
    <main className="min-h-screen" style={{ background: "#f8f4ec" }}>
      <div className="mx-auto max-w-4xl px-10 py-14">

        {/* ── Greeting ── */}
        <div className="mb-12">
          <div className="g-mono mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#e8420a" }}>
            <span style={{ display: "inline-block", width: 24, height: 2, background: "#e8420a" }} />
            {greeting}
          </div>
          <h1 className="g-display text-[42px] font-extrabold leading-tight" style={{ color: "#252525", letterSpacing: "-0.025em" }}>
            Твой личный кабинет
          </h1>
          <p className="g-body mt-2 text-[16px] font-medium" style={{ color: "#6b6b6b" }}>
            Школа японского языка нового поколения
            <span className="g-jp ml-2" style={{ color: "#a0a0a0", fontSize: 14 }}>いらっしゃい</span>
          </p>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Next lesson — wide */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-7" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="mb-5 flex items-center justify-between">
              <div className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#e8420a" }}>
                Следующий урок
              </div>
              <Link href="/lessons" className="g-body text-[12px] font-bold transition-colors hover:text-gojo-orange" style={{ color: "#6b6b6b" }}>
                Все уроки →
              </Link>
            </div>

            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="g-jp mb-3 text-[48px]" style={{ color: "#a0a0a0" }}>予</div>
              <p className="g-body mb-5 text-[15px]" style={{ color: "#6b6b6b" }}>
                Запишись на первый бесплатный урок
              </p>
              <a
                href="https://t.me/gojoedu"
                target="_blank"
                rel="noopener noreferrer"
                className="g-body rounded-lg px-6 py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#e8420a" }}
              >
                Записаться через Telegram →
              </a>
            </div>
          </div>

          {/* Level card */}
          <div className="rounded-2xl bg-white p-7" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="g-mono mb-4 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#e8420a" }}>
              Уровень
            </div>
            <div className="g-display text-[72px] font-extrabold leading-none" style={{ color: "#252525", letterSpacing: "-0.04em" }}>
              N5
            </div>
            <p className="g-body mt-3 text-[13px]" style={{ color: "#6b6b6b" }}>
              Базовый уровень · хирагана, катакана, первые иероглифы
            </p>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between">
                <span className="g-mono text-[10px] font-bold" style={{ color: "#a0a0a0" }}>N5</span>
                <span className="g-mono text-[10px] font-bold" style={{ color: "#a0a0a0" }}>N4</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#efe7d8" }}>
                <div className="h-full w-[8%] rounded-full" style={{ background: "#e8420a" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Tools ── */}
        <div className="mt-10">
          <div className="g-mono mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6b6b6b" }}>
            <span style={{ display: "inline-block", width: 24, height: 2, background: "#6b6b6b" }} />
            Тренировки
          </div>
          <div className="grid gap-3 sm:grid-cols-3">

            <Link
              href="/review"
              className="group flex items-center gap-4 rounded-xl bg-white p-5 transition-all hover:shadow-sm"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div
                className="g-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[24px] font-bold transition-colors"
                style={{ background: "#f8f4ec", color: "#e8420a" }}
              >
                単
              </div>
              <div>
                <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>Карточки</div>
                <div className="g-body mt-0.5 text-[12px]" style={{ color: "#6b6b6b" }}>Повторение слов</div>
              </div>
            </Link>

            <Link
              href="/kana"
              className="group flex items-center gap-4 rounded-xl bg-white p-5 transition-all hover:shadow-sm"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div
                className="g-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[24px] font-bold"
                style={{ background: "#f8f4ec", color: "#e8420a" }}
              >
                あ
              </div>
              <div>
                <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>Хирагана · Катакана</div>
                <div className="g-body mt-0.5 text-[12px]" style={{ color: "#6b6b6b" }}>Тренажёр символов</div>
              </div>
            </Link>

            <div
              className="flex items-center gap-4 rounded-xl bg-white p-5"
              style={{ border: "1px dashed rgba(0,0,0,0.12)", opacity: 0.5 }}
            >
              <div
                className="g-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[24px]"
                style={{ background: "#f8f4ec", color: "#a0a0a0" }}
              >
                漢
              </div>
              <div>
                <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>Словарь кандзи</div>
                <div className="g-mono mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: "#a0a0a0" }}>Скоро</div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Contact ── */}
        <div
          className="mt-4 flex items-center justify-between rounded-2xl bg-white px-7 py-5"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div>
            <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>Написать куратору</div>
            <div className="g-body mt-0.5 text-[13px]" style={{ color: "#6b6b6b" }}>
              Руслан · вопросы по обучению, материалы, расписание
            </div>
          </div>
          <a
            href="https://t.me/gojoedu"
            target="_blank"
            rel="noopener noreferrer"
            className="g-body shrink-0 rounded-lg px-5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#e8420a" }}
          >
            Telegram →
          </a>
        </div>

      </div>
    </main>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 17) return "Добрый день";
  return "Добрый вечер";
}
