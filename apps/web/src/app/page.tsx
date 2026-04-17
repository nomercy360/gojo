import Link from "next/link";
import type { LessonDto, StudentStatsDto } from "@gojo/shared";
import { fetchLessons, fetchStudentStats } from "@/lib/api";
import { Avatar } from "@/components/avatar";
import { getCurrentUser, getSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const token = await getSessionToken();
  const user = await getCurrentUser();

  if (user) return <Dashboard token={token!} />;
  return <Landing />;
}

async function Dashboard({ token }: { token: string }) {
  const [user, statsResult, lessonsResult] = await Promise.all([
    getCurrentUser(),
    fetchStudentStats(token).catch(() => null),
    fetchLessons(token).catch(() => [] as LessonDto[]),
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
      <section className="relative overflow-hidden border-b-2 border-gojo-ink bg-gojo-ink py-20">
        <div className="pointer-events-none absolute right-10 top-0 font-jp-serif text-[140px] font-bold leading-none text-white/[0.06]">
          五条
        </div>
        <div className="mx-auto max-w-5xl px-6">
          <div className="inline-block -rotate-2 rounded-md border-2 border-gojo-orange bg-gojo-orange px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
            Школа японского
          </div>
          <h1 className="mt-5 font-serif text-[48px] font-bold leading-[1.05] tracking-tight text-white">
            Учи японский
            <br />
            <span className="text-gojo-orange">как читаешь мангу.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/70">
            Живые уроки в группах до 8 человек, AI-практика между занятиями.
            От хираганы до JLPT N1. 初めまして。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="btn-pop inline-flex items-center rounded-md border-2 border-gojo-ink bg-gojo-orange px-6 py-3 text-sm font-bold text-white"
            >
              Начать бесплатно ▸
            </Link>
            <a
              href="#how"
              className="btn-pop inline-flex items-center rounded-md border-2 border-white/30 bg-transparent px-6 py-3 text-sm font-bold text-white hover:border-white"
            >
              Как это работает
            </a>
          </div>
        </div>
      </section>

      <section id="how" className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Почему Gojo Learn
          </div>
          <h2 className="mt-2 font-serif text-[28px] font-bold">Не приложение — школа.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <FeatureCard kanji="師" title="Живые учителя" body="Видео-уроки в группах до 8 человек с обратной связью." />
            <FeatureCard kanji="力" title="AI между уроками" body="Персональный тренер: карточки, грамматика, практика." />
            <FeatureCard kanji="道" title="Путь до N1" body="Структурированная программа. XP, streak'и, leaderboard." />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ kanji, title, body }: { kanji: string; title: string; body: string }) {
  return (
    <div className="card-pop relative overflow-hidden rounded-lg border-2 border-gojo-ink bg-gojo-surface p-5">
      <div className="pointer-events-none absolute -right-2 -top-2 font-jp-serif text-[64px] font-bold leading-none text-gojo-orange/10">
        {kanji}
      </div>
      <h3 className="text-[18px] font-bold">{title}</h3>
      <p className="mt-2 text-sm text-gojo-ink-muted">{body}</p>
    </div>
  );
}
