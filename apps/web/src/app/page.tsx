import Link from "next/link";
import type { LessonDto, StudentStatsDto } from "@gojo/shared";
import { fetchLessons, fetchStudentStats } from "@/lib/api";
import { Avatar } from "@/components/avatar";
import { CyclingText } from "@/components/cycling-text";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) return <Dashboard />;
  return <Landing />;
}

async function Dashboard() {
  const [user, statsResult, lessonsResult] = await Promise.all([
    getCurrentUser(),
    fetchStudentStats().catch(() => null),
    fetchLessons().catch(() => [] as LessonDto[]),
  ]);

  const stats: StudentStatsDto = statsResult ?? {
    completedLessons: 0,
    upcomingLessons: 0,
    totalBookings: 0,
  };
  const lessons = Array.isArray(lessonsResult) ? lessonsResult : [];
  const booked = lessons.filter((l) => l.booked);
  const nextLesson = booked[0];

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Welcome */}
        <div className="flex items-center gap-4">
          <Avatar value={user?.avatarUrl ?? null} size={48} fallback={user?.nickname ?? "?"} />
          <div>
            <p className="text-sm font-bold text-gojo-ink-muted">おかえり!</p>
            <h1 className="font-serif text-[28px] font-bold">{user?.nickname ?? user?.email}</h1>
          </div>
        </div>

        {/* Next lesson highlight */}
        {nextLesson ? (
          <div className="card-pop mt-8 relative overflow-hidden rounded-lg border-2 border-gojo-ink bg-gojo-ink p-6">
            <div className="pointer-events-none absolute -right-4 top-0 font-jp-serif text-[100px] font-bold leading-none text-white/[0.05]">
              次
            </div>
            <div className="-rotate-2 inline-block rounded-sm bg-gojo-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
              Следующий урок
            </div>
            <h2 className="mt-3 font-serif text-[22px] font-bold text-white">
              {nextLesson.title}
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {nextLesson.teacherNickname} ·{" "}
              {new Date(nextLesson.startsAt).toLocaleString("ru-RU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/lessons/${nextLesson.id}/room`}
                className="btn-pop rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white"
              >
                Войти ▸
              </Link>
              <Link
                href={`/lessons/${nextLesson.id}`}
                className="rounded-md border-2 border-white/30 px-5 py-2.5 text-sm font-bold text-white hover:border-white"
              >
                Материалы
              </Link>
            </div>
          </div>
        ) : null}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <StatTile eyebrow="Пройдено уроков" value={String(stats.completedLessons)} />
          <StatTile eyebrow="Предстоит" value={String(stats.upcomingLessons)} />
          <StatTile eyebrow="Всего записей" value={String(stats.totalBookings)} />
        </div>

        {/* Upcoming schedule */}
        {lessons.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-serif text-[22px] font-bold">Расписание</h2>
            <ul className="mt-4 space-y-3">
              {lessons.slice(0, 5).map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border-2 border-gojo-ink bg-gojo-surface p-4"
                >
                  <div>
                    <p className="font-bold">{l.title}</p>
                    <p className="text-sm text-gojo-ink-muted">
                      {l.teacherNickname} ·{" "}
                      {new Date(l.startsAt).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {l.booked ? (
                    <Link
                      href={`/lessons/${l.id}/room`}
                      className="btn-pop rounded-md border-2 border-gojo-ink bg-gojo-orange px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      Войти ▸
                    </Link>
                  ) : (
                    <span className="text-[11px] font-bold text-gojo-ink-ghost">Не записан</span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href="/lessons"
              className="mt-4 inline-block text-sm font-bold text-gojo-orange hover:underline"
            >
              Все уроки →
            </Link>
          </section>
        ) : null}

        {/* Mascot */}
        <div className="mt-10 flex items-center gap-4 rounded-lg border-2 border-gojo-ink bg-gojo-ink p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gojo-orange bg-gojo-orange font-jp-serif text-xl font-bold text-white">
            狐
          </span>
          <div className="relative rounded-lg border-2 border-gojo-surface bg-gojo-surface px-4 py-3">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-gojo-ink" />
            <p className="text-sm">
              <span className="font-bold">Кицунэ-сэнсэй:</span>{" "}
              «Повтори вчерашний урок перед следующим. 頑張って!»
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatTile({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div className="card-pop rounded-lg border-2 border-gojo-ink bg-gojo-surface p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
        {eyebrow}
      </div>
      <div className="mt-1 font-serif text-[26px] font-bold">{value}</div>
    </div>
  );
}

function Landing() {
  return (
    <div className="landing-root">
      <nav className="lp-nav">
        <Link href="/" className="flex items-center gap-[10px] no-underline">
          <div className="lp-logo-icon">五</div>
          <div>
            <span className="block font-heading text-[15px] font-bold uppercase leading-none tracking-[0.12em] text-white">
              Gojo Learn
            </span>
            <span className="mt-[2px] block font-heading text-[9px] uppercase tracking-[0.2em] text-white/40">
              五条塾 · Школа японского
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-8">
          <a
            href="#why"
            className="text-[13px] font-medium text-white/75 transition-colors hover:text-[var(--lp-orange)]"
          >
            Уроки
          </a>
          <a
            href="#how"
            className="text-[13px] font-medium text-white/75 transition-colors hover:text-[var(--lp-orange)]"
          >
            Как это работает
          </a>
          <Link href="/login" className="lp-nav-cta">
            Войти ▸
          </Link>
        </div>
      </nav>

      <section className="lp-hero">
        <video
          className="lp-hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero/hero.webp"
        >
          <source src="/hero/hero.webm" type="video/webm" />
          <source src="/hero/hero.mp4" type="video/mp4" />
        </video>
        <div className="lp-hero-deco lp-hero-deco-1">語</div>
        <div className="lp-hero-deco lp-hero-deco-2">道</div>

        <div className="lp-hero-ribbon">
          五条塾 · Школа японского нового поколения
        </div>

        <h1 className="lp-hero-title">
          Школа японского,
          <br />
          <span className="lp-orange">которая даёт результат.</span>
        </h1>
        <p className="lp-hero-subtitle">
          Для тех, кто хочет
          <br />
          <CyclingText />
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/login" className="lp-btn-primary">
            ▸ Начать бесплатно
          </Link>
          <a href="#how" className="lp-btn-secondary">
            Как это работает
          </a>
        </div>

        <div className="lp-hero-sticker">
          ЗАВТРА 19:00
          <br />
          明日から
          <span className="jp">Следующий урок →</span>
        </div>
      </section>

      <div className="lp-diag-cream-from-black" />

      <section className="lp-why" id="why">
        <div className="lp-section-label">Почему Gojo Learn?</div>
        <h2 className="lp-section-title">Наш результат — это ваш успех.</h2>
        <div className="lp-cards-grid">
          <article className="lp-card">
            <div className="lp-card-number">一</div>
            <span className="lp-card-tag">Цель</span>
            <div className="lp-card-title">Адаптируемся под цель</div>
            <ul className="lp-card-list">
              <li>Учёба и жизнь в Японии</li>
              <li>Аниме и манга в оригинале</li>
              <li>Саморазвитие</li>
            </ul>
          </article>

          <article className="lp-card">
            <div className="lp-card-number">二</div>
            <span className="lp-card-tag">Метод</span>
            <div className="lp-card-title">Инновационная подача</div>
            <ul className="lp-card-list">
              <li>Никакой зубрёжки ради зубрёжки</li>
              <li>Никаких устаревших методов</li>
            </ul>
          </article>

          <article className="lp-card">
            <div className="lp-card-number">三</div>
            <span className="lp-card-tag">Платформа</span>
            <div className="lp-card-title">Максимальный комфорт</div>
            <ul className="lp-card-list">
              <li>Уроки, практика, прогресс — на одной платформе</li>
              <li>Меньше стресса от вкладок и приложений</li>
            </ul>
          </article>

          <article className="lp-card">
            <div className="lp-card-number">四</div>
            <span className="lp-card-tag">Система</span>
            <div className="lp-card-title">Системность</div>
            <p className="lp-card-text">
              Структура обеспечивает стабильный прогресс без откатов.
            </p>
          </article>
        </div>
      </section>

      <div className="lp-diag-white-from-cream" />

      <section className="lp-how" id="how">
        <div className="lp-section-label">Процесс</div>
        <h2 className="lp-section-title">Как это работает</h2>
        <div className="lp-cards-grid">
          <article className="lp-card">
            <div className="lp-card-number">一</div>
            <span className="lp-card-tag">Шаг 1</span>
            <div className="lp-card-title">Выбери уровень</div>
            <p className="lp-card-text">
              Пройди короткий тест — определим с чего начать: хирагана, базовый
              или продвинутый.
            </p>
          </article>

          <article className="lp-card">
            <div className="lp-card-number">二</div>
            <span className="lp-card-tag">Шаг 2</span>
            <div className="lp-card-title">Живые уроки</div>
            <p className="lp-card-text">
              2–3 занятия в неделю с преподавателем в группе до 8 человек.
              Разговорный формат.
            </p>
          </article>

          <article className="lp-card">
            <div className="lp-card-number">三</div>
            <span className="lp-card-tag">Шаг 3</span>
            <div className="lp-card-title">AI-практика каждый день</div>
            <p className="lp-card-text">
              Между уроками — тренировки с AI: карточки, диалоги, разбор ошибок.
            </p>
          </article>

          <article className="lp-card">
            <div className="lp-card-number">四</div>
            <span className="lp-card-tag">Результат</span>
            <div className="lp-card-title">Реальный результат</div>
            <p className="lp-card-text">
              Ты доходишь до уровня, где язык начинает работать на тебя — и
              делаешь это без скуки.
            </p>
          </article>
        </div>
      </section>

      <div className="lp-diag-dark-from-white" />

      <section className="lp-mission" id="mission">
        <div className="lp-section-label">Наша миссия</div>
        <div className="lp-mission-inner">
          <div className="lp-mission-founder">
            <div className="lp-mission-photo-wrap">
              {/* biome-ignore lint/performance/noImgElement: hero branded asset */}
              <img
                className="lp-mission-photo"
                src="/founder.png"
                alt="Основатель Gojo Learn"
              />
              <div className="lp-mission-photo-badge">五</div>
            </div>
            <div className="mt-1 font-heading text-[13px] font-bold leading-snug text-[var(--lp-black)]">
              Основатель
            </div>
            <div className="mt-[-6px] text-[11px] leading-snug text-[#777]">
              五条塾
            </div>
          </div>

          <div>
            <div className="lp-mission-quote">
              Наша цель — сделать так, чтобы <span className="lp-orange">японский
              перестал быть непреодолимым.</span> Чтобы ты не бросил на полпути,
              а дошёл до уровня, где язык работает на тебя.
            </div>
            <p className="lp-mission-text">
              Мы видим одну и ту же боль в рассказах сотен студентов: начали
              самостоятельно — не хватило дисциплины. Пошли в универ — скучно
              и медленно. Подписались на курс на YouTube — бросили через
              неделю. 80% никогда не доходят до реального результата.
            </p>
            <p className="lp-mission-text">
              Поэтому мы строим школу, где учитель — проводник, платформа —
              опора, а технология — инструмент, не замена человеку. Мы не
              продаём видеокурс. Мы ведём от нуля до уровня, где язык начинает
              приносить жизнь.
            </p>
          </div>
        </div>
      </section>

      <div className="lp-diag-black-from-dark" />

      <section className="lp-cta" id="cta">
        <div className="lp-cta-tag">Свободные места есть</div>
        <h2 className="lp-cta-title">
          Начни свой путь
          <br />к <span className="lp-orange">японскому сегодня.</span>
        </h2>
        <p className="lp-cta-sub">
          Пробный урок бесплатный. Познакомимся, подберём уровень, покажем
          платформу.
        </p>
        <Link href="/login" className="lp-btn-cta">
          ▸ Начать бесплатно
        </Link>
      </section>

      <footer className="lp-footer">
        <div className="flex items-center gap-[10px]">
          <div className="lp-logo-icon" style={{ width: 28, height: 28, fontSize: 12 }}>
            五
          </div>
          <div>
            <span className="block font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
              Gojo Learn
            </span>
            <div className="font-heading text-[9px] uppercase tracking-[0.15em] text-white/20">
              五条塾 · Школа японского
            </div>
          </div>
        </div>
        <span className="text-[12px] text-white/25">
          © 2026 Gojo Learn. Школа японского языка.
        </span>
        <div className="flex gap-6">
          <a
            href="#"
            className="text-[12px] text-white/30 transition-colors hover:text-[var(--lp-orange)]"
          >
            Политика конфиденциальности
          </a>
          <a
            href="#"
            className="text-[12px] text-white/30 transition-colors hover:text-[var(--lp-orange)]"
          >
            Контакты
          </a>
        </div>
      </footer>
    </div>
  );
}
