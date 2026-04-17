import Link from "next/link";
import type { LessonDto, StudentStatsDto } from "@gojo/shared";
import { fetchLessons, fetchStudentStats } from "@/lib/api";
import { Avatar } from "@/components/avatar";
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
    <main className="min-h-screen bg-gojo-paper">
      {/* Hero — centered, big, premium, with video background */}
      <section className="relative overflow-hidden border-b-2 border-gojo-ink bg-gojo-ink py-28">
        {/* Background video — desktop only. Boomerang loop (forward+reversed)
            so the last frame equals the first — no freeze on rewind.
            Mobile falls back to poster (hero.webp = first frame). */}
        <video
          className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover opacity-60 md:block"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hero/hero.webp"
        >
          <source src="/hero/hero.webm" type="video/webm" />
          <source src="/hero/hero.mp4" type="video/mp4" />
        </video>

        {/* Mobile: poster as background image */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-50 md:hidden"
          style={{ backgroundImage: "url(/hero/hero.webp)" }}
        />

        {/* Gradient overlay for text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gojo-ink/70 via-gojo-ink/40 to-gojo-ink/80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gojo-ink/60 via-transparent to-gojo-ink/60" />

        <div className="pointer-events-none absolute -right-10 top-8 font-jp-serif text-[200px] font-bold leading-none text-white/[0.08]">
          五
        </div>
        <div className="pointer-events-none absolute -left-10 bottom-8 font-jp-serif text-[200px] font-bold leading-none text-white/[0.08]">
          条
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="inline-block -rotate-2 rounded-sm border-2 border-gojo-orange bg-gojo-orange px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
            Школа японского
          </div>

          <h1 className="mt-8 font-serif text-[68px] font-bold leading-[1.02] tracking-tight text-white">
            Японский,
            <br />
            который <span className="text-gojo-orange">не бросают.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-white/70">
            Живые учителя, выверенная система, AI‑практика между уроками.
            <br className="hidden sm:inline" />
            Для тех, кто хочет дойти до конца.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/login"
              className="btn-pop inline-flex items-center rounded-md border-2 border-gojo-ink bg-gojo-orange px-9 py-4 text-[15px] font-bold text-white"
            >
              Записаться на пробный урок ▸
            </Link>
            <a
              href="#how"
              className="text-sm font-bold text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              как это работает
            </a>
          </div>
        </div>
      </section>

      {/* Core value — living teachers first, methodology second, tech as support */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-gojo-orange">
              Как это работает
            </div>
            <h2 className="mx-auto mt-3 max-w-2xl font-serif text-[34px] font-bold leading-tight">
              Школа, которая доводит до результата. Не инфобизнес.
            </h2>
          </div>

          {/* Primary: живые учителя — большой блок */}
          <div className="card-pop mt-14 relative overflow-hidden rounded-xl border-2 border-gojo-ink bg-gojo-surface p-8 md:p-10">
            <div className="pointer-events-none absolute -right-4 -top-8 font-jp-serif text-[200px] font-bold leading-none text-gojo-orange/10">
              師
            </div>
            <div className="relative">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-gojo-orange">
                Ядро · 01
              </div>
              <h3 className="mt-2 font-serif text-[28px] font-bold leading-tight">
                Живые преподаватели, а не видеокурс
              </h3>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gojo-ink-muted">
                Группы до 8 человек или индивидуально. Настоящие уроки с обратной связью,
                разбором ошибок и разговорной практикой. Учителя — носители методики, не
                фрилансеры с Авито.
              </p>
            </div>
          </div>

          {/* Secondary: методология системы */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FeatureCard
              kanji="系"
              title="Японский как система"
              body="Урок → разбор → повторение → прогресс. Структурность и унификация материала, которой нет больше нигде."
            />
            <FeatureCard
              kanji="道"
              title="Вымощенный путь"
              body="Адаптируемся под цель — работа в Японии, аниме и манга, культура. Но методика — одна. Не даём свернуть."
            />
          </div>

          {/* Tertiary: tech support */}
          <div className="mt-5">
            <FeatureCard
              kanji="力"
              title="Технологии и AI — в поддержку"
              body="All‑in‑one платформа, AI‑тренер между уроками, прогресс и повторение в одном месте. Технологии служат учителю, не заменяют его."
              wide
            />
          </div>
        </div>
      </section>

      {/* 80% insight */}
      <section className="border-y-2 border-gojo-ink bg-gojo-paper-2 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="font-serif text-[120px] font-bold leading-[0.9] text-gojo-orange">
            80%
          </div>
          <p className="mt-6 font-serif text-[26px] font-bold leading-tight">
            учеников бросают японский до уровня, где язык начинает приносить реальную пользу.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-gojo-ink-muted">
            Университеты скучны. Самообучение не удерживает. Мы — проводники ученика:
            контролируем качество, строим вымощенный путь и делаем всё, чтобы вы не стали
            частью этих 80%. До уровня <strong className="text-gojo-ink">N2</strong> — где
            язык уже работает на вас.
          </p>
        </div>
      </section>

      {/* Target audience */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Для кого мы
          </div>
          <h2 className="mt-2 font-serif text-[28px] font-bold">Начинающие. Любая цель.</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AudienceCard eyebrow="ZERO" label="С нуля" body="Никогда не учили — начнём с хираганы." />
            <AudienceCard eyebrow="RESTART" label="Начал, но отвалился" body="Поможем вернуться и не сдаться снова." />
            <AudienceCard eyebrow="JLPT" label="Сдать экзамен" body="N5 → N4 → N3 → N2 с проверяемым прогрессом." />
            <AudienceCard eyebrow="CULTURE" label="Фанат Японии" body="Аниме, манга, жизнь в Японии — язык как ключ." />
          </div>
        </div>
      </section>

      {/* Mascot CTA */}
      <section className="border-t-2 border-gojo-ink bg-gojo-ink py-12">
        <div className="mx-auto flex max-w-5xl items-center gap-5 px-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-gojo-orange bg-gojo-orange font-jp-serif text-2xl font-bold text-white">
            狐
          </span>
          <div className="card-pop relative rounded-lg border-2 border-gojo-surface bg-gojo-surface px-5 py-4">
            <div className="absolute -left-2 top-5 h-0 w-0 border-y-8 border-y-transparent border-r-[10px] border-r-gojo-ink" />
            <p className="text-sm text-gojo-ink">
              <span className="font-bold">Кицунэ‑сэнсэй:</span>{" "}
              «Давайте покорять высоты японского языка вместе. 頑張りましょう!» —{" "}
              <Link href="/login" className="font-bold text-gojo-orange hover:underline">
                начать путь →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AudienceCard({
  eyebrow,
  label,
  body,
}: {
  eyebrow: string;
  label: string;
  body: string;
}) {
  return (
    <div className="card-pop rounded-lg border-2 border-gojo-ink bg-gojo-surface p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
        {eyebrow}
      </div>
      <h3 className="mt-1 text-[16px] font-bold">{label}</h3>
      <p className="mt-2 text-sm text-gojo-ink-muted">{body}</p>
    </div>
  );
}

function FeatureCard({
  kanji,
  title,
  body,
  wide,
}: {
  kanji: string;
  title: string;
  body: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`card-pop relative overflow-hidden rounded-lg border-2 border-gojo-ink bg-gojo-surface ${
        wide ? "p-6" : "p-5"
      }`}
    >
      <div
        className={`pointer-events-none absolute font-jp-serif font-bold leading-none text-gojo-orange/10 ${
          wide ? "-right-2 -top-4 text-[96px]" : "-right-2 -top-2 text-[64px]"
        }`}
      >
        {kanji}
      </div>
      <div className="relative">
        <h3 className="text-[18px] font-bold">{title}</h3>
        <p className="mt-2 text-sm text-gojo-ink-muted">{body}</p>
      </div>
    </div>
  );
}
