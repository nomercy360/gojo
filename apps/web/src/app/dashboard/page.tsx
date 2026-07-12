import { Avatar } from "@/components/avatar";
import { CalendarSection } from "@/components/calendar-section";
import { LocalTime } from "@/components/local-time";
import { fetchMyPayments, fetchMyRecordings, fetchStudentStats } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import type { StudentStatsDto } from "@gojo/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SavedToast } from "./saved-toast";

const ROLE_LABEL: Record<string, string> = {
  student: "Студент",
  admin: "Админ",
};

const LEVEL_BLURB: Record<string, string> = {
  N5: "Базовый уровень · хирагана, катакана, первые иероглифы",
  N4: "Уверенный новичок · базовая грамматика, 250+ кандзи",
  N3: "Средний уровень · простые тексты, поддержка диалога",
  N2: "Продвинутый уровень · новости, деловой язык",
};

function calcScore(stats: {
  lessonsCompleted: number;
  homeworkSubmitted: number;
  trainingHours: number;
}) {
  const lessons = Math.round((Math.min(stats.lessonsCompleted, 20) / 20) * 40);
  const homework = Math.round((Math.min(stats.homeworkSubmitted, 20) / 20) * 35);
  const training = Math.round((Math.min(stats.trainingHours, 10) / 10) * 25);
  return { lessons, homework, training, total: lessons + homework + training };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isTeacherUser(user)) redirect("/teacher");

  const greeting = getGreeting();

  const apiStats = await fetchStudentStats().catch(
    (): StudentStatsDto => ({
      completedLessons: 0,
      upcomingLessons: 0,
      totalBookings: 0,
      homeworkDone: 0,
      homeworkTotal: 0,
      trainingSeconds: 0,
      currentStreak: 0,
    }),
  );

  const recordings = await fetchMyRecordings().catch(() => []);
  const isPaid = await fetchMyPayments()
    .then((p) => p.access.isActive)
    .catch(() => false);

  const trainingHoursWhole = Math.floor(apiStats.trainingSeconds / 3600);
  const trainingMinutes = Math.floor((apiStats.trainingSeconds % 3600) / 60);

  const stats = {
    lessonsCompleted: apiStats.completedLessons,
    homeworkSubmitted: apiStats.homeworkDone,
    trainingHours: apiStats.trainingSeconds / 3600,
    trainingHoursWhole,
    trainingMinutes,
  };

  const score = calcScore(stats);
  const progressPercent = Math.min(score.total, 100);
  const hasMeaningfulTraining = apiStats.trainingSeconds >= 60;
  const hasAnyProgress =
    stats.lessonsCompleted > 0 || stats.homeworkSubmitted > 0 || hasMeaningfulTraining;
  const streakLabel =
    apiStats.currentStreak > 0
      ? `${apiStats.currentStreak} ${pluralizeDays(apiStats.currentStreak)} подряд`
      : "начни серию";
  const hasAssessedLevel = Boolean(user.jlptLevel || user.quizLevel);
  const hasLessonHistory = apiStats.totalBookings > 0;

  return (
    <main className="min-h-screen bg-gojo-paper">
      <Suspense fallback={null}>
        <SavedToast />
      </Suspense>
      <div className="mx-auto max-w-4xl px-10 py-14">
        {/* ── Greeting ── */}
        <div className="mb-10">
          <div className="g-mono mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gojo-orange">
            <span className="inline-block h-0.5 w-6 bg-gojo-orange" />
            {greeting}
          </div>
          <h1 className="g-display text-[42px] font-extrabold leading-tight tracking-[-0.025em] text-gojo-ink">
            Твой личный кабинет
          </h1>
          <p className="g-body mt-2 text-[16px] font-medium text-gojo-ink-muted">
            Индивидуальные занятия · японский язык
            <span className="g-jp ml-2 text-[14px] text-gojo-ink-ghost">いらっしゃい</span>
          </p>
        </div>

        {/* ── Profile card ── */}
        <div className="g-card mb-6 flex items-center gap-5 px-7 py-5">
          <Avatar value={user.avatarUrl} size={64} fallback={user.nickname ?? user.email} />
          <div className="min-w-0 flex-1">
            <div className="g-display truncate text-[18px] font-extrabold leading-tight text-gojo-ink">
              {user.nickname ?? user.email}
            </div>
            <div className="g-mono mt-0.5 flex flex-wrap items-center gap-2 truncate text-[12px] text-gojo-ink-ghost">
              <span>
                @{user.nickname ?? user.email.split("@")[0]} · {ROLE_LABEL[user.role] ?? user.role}
              </span>
              <span
                className={`rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white ${
                  isPaid ? "bg-gojo-success" : "bg-gojo-error"
                }`}
              >
                {isPaid ? "Оплачено" : "Не оплачено"}
              </span>
            </div>
          </div>
          <Link
            href="/profile"
            className="g-body shrink-0 rounded-md border border-black/10 px-4 py-2 text-[13px] font-bold text-gojo-ink-muted transition-colors hover:border-gojo-orange hover:text-gojo-orange"
          >
            Редактировать
          </Link>
        </div>

        {/* ── Library ── */}
        <div id="library" className="g-card mb-6 scroll-mt-20 px-7 py-5">
          <div className="g-mono text-[11px] font-bold uppercase tracking-[0.16em] text-gojo-orange">
            Библиотека
          </div>
          {recordings.length === 0 ? (
            <p className="g-body mt-1 text-[14px] text-gojo-ink-muted">
              Видеоуроки и материалы появятся здесь после первых занятий.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recordings.map((rec) => (
                <li key={rec.lessonId}>
                  <Link
                    href={`/lessons/${rec.lessonId}`}
                    className="g-body flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-gojo-paper px-4 py-3 text-[14px] transition-colors hover:border-gojo-orange"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold text-gojo-ink">{rec.title}</div>
                      <div className="mt-0.5 text-[12px] text-gojo-ink-muted">
                        <LocalTime
                          iso={rec.startsAt}
                          options={{ day: "numeric", month: "numeric", year: "numeric" }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-[12px] font-bold text-gojo-orange">
                      Смотреть →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Progress + trainers ── */}
        <div id="trainers" className="g-card mb-6 scroll-mt-20 p-7">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="g-mono text-[11px] font-bold uppercase tracking-[0.16em] text-gojo-orange">
                Прогресс
              </div>
              <h2 className="g-display mt-2 text-[24px] font-extrabold text-gojo-ink">
                {hasAnyProgress ? "Продолжай серию" : "С чего начать"}
              </h2>
            </div>
            <div className="rounded-full bg-gojo-paper px-3 py-1.5 text-[11px] font-bold text-gojo-ink-muted">
              {streakLabel}
            </div>
          </div>

          {hasAnyProgress ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="g-mono text-[10px] font-bold uppercase tracking-wider text-gojo-ink-ghost">
                  MVP-прогресс
                </span>
                <span className="g-mono text-[11px] font-bold text-gojo-ink">
                  {progressPercent} / 100
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gojo-paper-2">
                <div
                  className="h-full rounded-full bg-gojo-orange transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {stats.lessonsCompleted > 0 ? (
                  <ProgressTile value={stats.lessonsCompleted} label="уроков пройдено" />
                ) : null}
                {hasMeaningfulTraining ? (
                  <ProgressTile
                    value={`${stats.trainingHoursWhole}ч ${stats.trainingMinutes}м`}
                    label="в тренировках"
                  />
                ) : null}
                {stats.homeworkSubmitted > 0 ? (
                  <ProgressTile value={stats.homeworkSubmitted} label="домашних заданий" />
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl bg-gojo-paper p-5">
              <div className="g-display text-[22px] font-extrabold text-gojo-ink">
                Запишись на первый бесплатный урок
              </div>
              <p className="g-body mt-2 max-w-2xl text-[13px] text-gojo-ink-muted">
                Здесь появятся часы практики, уроки и домашние задания после реальной активности.
                Преподаватель определит уровень на бесплатной консультации.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://t.me/gojoedu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="g-btn-primary text-sm"
                >
                  Записаться на консультацию
                </a>
                <Link href="/lessons" className="g-btn-secondary text-sm">
                  Посмотреть уроки
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-black/10 pt-6">
            <div className="g-mono mb-4 text-[10px] font-bold uppercase tracking-wider text-gojo-ink-ghost">
              Тренажёры
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/review" className="g-card group flex items-center gap-4 p-5">
                <div className="g-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gojo-paper text-[24px] font-bold text-gojo-orange">
                  単
                </div>
                <div>
                  <div className="g-display text-[15px] font-bold text-gojo-ink">Карточки</div>
                  <div className="g-body mt-0.5 text-[12px] text-gojo-ink-muted">
                    Повторение слов
                  </div>
                </div>
              </Link>

              <Link href="/kana" className="g-card group flex items-center gap-4 p-5">
                <div className="g-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gojo-paper text-[24px] font-bold text-gojo-orange">
                  あ
                </div>
                <div>
                  <div className="g-display text-[15px] font-bold text-gojo-ink">
                    Хирагана · Катакана
                  </div>
                  <div className="g-body mt-0.5 text-[12px] text-gojo-ink-muted">
                    Тренажёр символов
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Calendar — wide */}
          <CalendarSection />

          {/* Level card */}
          <div className="g-card p-7">
            <div className="g-mono mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-gojo-orange">
              Уровень
            </div>
            {user.jlptLevel ? (
              <>
                <div className="g-display text-[72px] font-extrabold leading-none tracking-[-0.04em] text-gojo-ink">
                  {user.jlptLevel}
                </div>
                <p className="g-body mt-3 text-[13px] text-gojo-ink-muted">
                  Подтверждено преподавателем · {LEVEL_BLURB[user.jlptLevel] ?? "уровень определён"}
                </p>
              </>
            ) : user.quizLevel ? (
              <>
                <div className="g-display text-[56px] font-extrabold leading-none tracking-[-0.04em] text-gojo-ink">
                  {user.quizLevel === "start" ? "с нуля" : `~${user.quizLevel}`}
                </div>
                <p className="g-body mt-3 text-[13px] text-gojo-ink-muted">
                  Предварительная оценка по квизу. Преподаватель уточнит её на первом уроке.
                </p>
              </>
            ) : (
              <>
                <div className="g-display text-[32px] font-extrabold leading-tight text-gojo-ink">
                  Пока не определён
                </div>
                <p className="g-body mt-3 text-[13px] text-gojo-ink-muted">
                  {hasLessonHistory
                    ? "Уровень ещё не выставлен. Уточни его у преподавателя после занятия."
                    : "Пройди квиз или запишись на бесплатную консультацию, чтобы определить уровень."}
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gojo-paper p-4">
              <div>
                <div className="g-mono mb-1 text-[10px] font-bold uppercase tracking-wider text-gojo-orange">
                  Индивидуальный план
                </div>
                <div className="g-body text-[12px] text-gojo-ink-muted">
                  {hasAssessedLevel
                    ? "Программа подобрана под ваши цели и темп обучения"
                    : "Сначала определим уровень и подходящий план обучения"}
                </div>
              </div>
              {hasAssessedLevel ? (
                <Link href="/payments" className="g-btn-primary shrink-0 text-[13px]">
                  Оплата
                </Link>
              ) : (
                <a
                  href="https://t.me/gojoedu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="g-btn-primary shrink-0 text-[13px]"
                >
                  {hasLessonHistory ? "Уточнить уровень" : "Консультация"}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Contact ── */}
        <div
          id="contact"
          className="g-card mt-10 scroll-mt-20 flex items-center justify-between px-7 py-5"
        >
          <div>
            <div className="g-display text-[15px] font-bold text-gojo-ink">Связаться с нами</div>
            <div className="g-body mt-0.5 text-[13px] text-gojo-ink-muted">
              Вопросы по обучению, материалы, индивидуальный план
            </div>
          </div>
          <a
            href="https://t.me/gojoedu"
            target="_blank"
            rel="noopener noreferrer"
            className="g-btn-primary shrink-0 text-[13px]"
          >
            Telegram
          </a>
        </div>
      </div>
    </main>
  );
}

function ProgressTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-gojo-paper px-4 py-3">
      <div className="g-display text-[24px] font-extrabold text-gojo-ink">{value}</div>
      <div className="g-body mt-1 text-[12px] text-gojo-ink-muted">{label}</div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 17) return "Добрый день";
  return "Добрый вечер";
}

function pluralizeDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "дня";
  return "дней";
}
