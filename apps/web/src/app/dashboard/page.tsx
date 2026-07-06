import { Avatar } from "@/components/avatar";
import { CalendarSection } from "@/components/calendar-section";
import { fetchStudentStats } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import type { StudentStatsDto } from "@gojo/shared";
import Link from "next/link";
import { redirect } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  student: "Студент",
  teacher: "Учитель",
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
  const hasAnyProgress =
    stats.lessonsCompleted > 0 || stats.homeworkSubmitted > 0 || apiStats.trainingSeconds > 0;
  const streakLabel =
    apiStats.currentStreak > 0
      ? `${apiStats.currentStreak} ${pluralizeDays(apiStats.currentStreak)} подряд`
      : "начни серию";

  return (
    <main className="min-h-screen" style={{ background: "#f8f4ec" }}>
      <div className="mx-auto max-w-4xl px-10 py-14">
        {/* ── Greeting ── */}
        <div className="mb-10">
          <div
            className="g-mono mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "#e8420a" }}
          >
            <span
              style={{ display: "inline-block", width: 24, height: 2, background: "#e8420a" }}
            />
            {greeting}
          </div>
          <h1
            className="g-display text-[42px] font-extrabold leading-tight"
            style={{ color: "#252525", letterSpacing: "-0.025em" }}
          >
            Твой личный кабинет
          </h1>
          <p className="g-body mt-2 text-[16px] font-medium" style={{ color: "#6b6b6b" }}>
            Индивидуальные занятия · японский язык
            <span className="g-jp ml-2" style={{ color: "#a0a0a0", fontSize: 14 }}>
              いらっしゃい
            </span>
          </p>
        </div>

        {/* ── Profile card ── */}
        <div
          className="mb-6 flex items-center gap-5 rounded-2xl bg-white px-7 py-5"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <Avatar value={user.avatarUrl} size={64} fallback={user.nickname ?? user.email} />
          <div className="flex-1 min-w-0">
            <div
              className="g-display truncate text-[18px] font-extrabold leading-tight"
              style={{ color: "#252525" }}
            >
              {user.nickname ?? user.email}
            </div>
            <div className="g-mono mt-0.5 truncate text-[12px]" style={{ color: "#a0a0a0" }}>
              @{user.nickname ?? user.email.split("@")[0]} · {ROLE_LABEL[user.role] ?? user.role}
            </div>
          </div>
          <Link
            href="/profile"
            className="g-body shrink-0 rounded-lg border px-4 py-2 text-[13px] font-bold transition-colors hover:border-[#e8420a] hover:text-[#e8420a]"
            style={{ color: "#6b6b6b", borderColor: "rgba(0,0,0,0.12)" }}
          >
            Редактировать
          </Link>
        </div>

        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-7 py-5"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div>
            <div
              className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: "#e8420a" }}
            >
              Доступ
            </div>
            <p className="g-body mt-1 text-[14px]" style={{ color: "#6b6b6b" }}>
              Первый урок можно попробовать бесплатно. Для регулярных занятий подключи оплату.
            </p>
          </div>
          <Link
            href="/payments"
            className="btn-pop rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white"
          >
            Оплата и доступ
          </Link>
        </div>

        {/* ── Progress ── */}
        <div
          className="mb-6 rounded-2xl bg-white p-7"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div
                className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "#e8420a" }}
              >
                Прогресс
              </div>
              <h2
                className="g-display mt-2 text-[24px] font-extrabold"
                style={{ color: "#252525" }}
              >
                {hasAnyProgress ? "Продолжай серию" : "Начни первую серию"}
              </h2>
            </div>
            <div
              className="rounded-full px-3 py-1.5 text-[11px] font-bold"
              style={{ background: "#f8f4ec", color: "#6b6b6b" }}
            >
              {streakLabel}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span
              className="g-mono text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#a0a0a0" }}
            >
              MVP-прогресс
            </span>
            <span className="g-mono text-[11px] font-bold" style={{ color: "#252525" }}>
              {progressPercent} / 100
            </span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full"
            style={{ background: "#efe7d8" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%`, background: "#e8420a" }}
            />
          </div>

          {hasAnyProgress ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {stats.lessonsCompleted > 0 ? (
                <ProgressTile value={stats.lessonsCompleted} label="уроков пройдено" />
              ) : null}
              {apiStats.trainingSeconds > 0 ? (
                <ProgressTile
                  value={`${stats.trainingHoursWhole}ч ${stats.trainingMinutes}м`}
                  label="в тренировках"
                />
              ) : null}
              {stats.homeworkSubmitted > 0 ? (
                <ProgressTile value={stats.homeworkSubmitted} label="домашних заданий" />
              ) : null}
            </div>
          ) : (
            <p className="g-body mt-5 text-[13px]" style={{ color: "#6b6b6b" }}>
              Здесь появятся реальные уроки, тренировки и домашние задания после первой активности.
            </p>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Calendar — wide (live Google Calendar integration) */}
          <CalendarSection />

          {/* Level card */}
          <div
            className="rounded-2xl bg-white p-7"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div
              className="g-mono mb-4 text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: "#e8420a" }}
            >
              Уровень
            </div>
            {user.jlptLevel ? (
              <>
                <div
                  className="g-display text-[72px] font-extrabold leading-none"
                  style={{ color: "#252525", letterSpacing: "-0.04em" }}
                >
                  {user.jlptLevel}
                </div>
                <p className="g-body mt-3 text-[13px]" style={{ color: "#6b6b6b" }}>
                  {LEVEL_BLURB[user.jlptLevel] ?? "Уровень подтверждён преподавателем"}
                </p>
              </>
            ) : user.quizLevel ? (
              <>
                <div
                  className="g-display text-[56px] font-extrabold leading-none"
                  style={{ color: "#252525", letterSpacing: "-0.04em" }}
                >
                  ~{user.quizLevel}
                </div>
                <p className="g-body mt-3 text-[13px]" style={{ color: "#6b6b6b" }}>
                  Предварительная оценка по квизу. Финальный уровень выставит преподаватель на
                  бесплатной консультации.
                </p>
              </>
            ) : (
              <>
                <div
                  className="g-display text-[32px] font-extrabold leading-tight"
                  style={{ color: "#252525" }}
                >
                  Пока не определён
                </div>
                <p className="g-body mt-3 text-[13px]" style={{ color: "#6b6b6b" }}>
                  Пройди короткий квиз или запишись на бесплатную консультацию с преподавателем.
                </p>
              </>
            )}

            <div className="mt-6 rounded-xl p-4" style={{ background: "#f8f4ec" }}>
              <div
                className="g-mono mb-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#e8420a" }}
              >
                Индивидуальный план
              </div>
              <div className="g-body text-[12px]" style={{ color: "#6b6b6b" }}>
                Программа подобрана под ваши цели и темп обучения
              </div>
            </div>
          </div>
        </div>

        {/* ── Tools ── */}
        <div className="mt-10">
          <div
            className="g-mono mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "#6b6b6b" }}
          >
            <span
              style={{ display: "inline-block", width: 24, height: 2, background: "#6b6b6b" }}
            />
            Тренировки
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/review"
              className="group flex items-center gap-4 rounded-xl bg-white p-5 transition-all hover:shadow-sm"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div
                className="g-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[24px] font-bold"
                style={{ background: "#f8f4ec", color: "#e8420a" }}
              >
                単
              </div>
              <div>
                <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>
                  Карточки
                </div>
                <div className="g-body mt-0.5 text-[12px]" style={{ color: "#6b6b6b" }}>
                  Повторение слов
                </div>
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
                <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>
                  Хирагана · Катакана
                </div>
                <div className="g-body mt-0.5 text-[12px]" style={{ color: "#6b6b6b" }}>
                  Тренажёр символов
                </div>
              </div>
            </Link>

            <Link
              href="/kanji"
              className="group flex items-center gap-4 rounded-xl bg-white p-5 transition-all hover:shadow-sm"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div
                className="g-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[24px] font-bold"
                style={{ background: "#f8f4ec", color: "#e8420a" }}
              >
                漢
              </div>
              <div>
                <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>
                  Кандзи
                </div>
                <div className="g-body mt-0.5 text-[12px]" style={{ color: "#6b6b6b" }}>
                  Тренажёр иероглифов
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Contact ── */}
        <div
          className="mt-4 flex items-center justify-between rounded-2xl bg-white px-7 py-5"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div>
            <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>
              Связаться с учителем
            </div>
            <div className="g-body mt-0.5 text-[13px]" style={{ color: "#6b6b6b" }}>
              Руслан · вопросы по обучению, материалы, индивидуальный план
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

function ProgressTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: "#f8f4ec" }}>
      <div className="g-display text-[24px] font-extrabold" style={{ color: "#252525" }}>
        {value}
      </div>
      <div className="g-body mt-1 text-[12px]" style={{ color: "#6b6b6b" }}>
        {label}
      </div>
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
