import Link from "next/link";
import { redirect } from "next/navigation";
import type { StudentStatsDto } from "@gojo/shared";
import { Avatar } from "@/components/avatar";
import { CalendarSection } from "@/components/calendar-section";
import { fetchStudentStats } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

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

const RANKS = [
  { name: "見習い",  sub: "Minarai",    min: 0,  max: 24,  color: "#7B9BAD", stars: 1 },
  { name: "修行者",  sub: "Shugyōsha",  min: 25, max: 49,  color: "#B89A4E", stars: 2 },
  { name: "師匠",    sub: "Shishō",     min: 50, max: 74,  color: "#6B7FBF", stars: 3 },
  { name: "横綱",    sub: "Yokozuna",   min: 75, max: 100, color: "#E8420A", stars: 4 },
];

function IconBamboo({ color }: { color: string }) {
  return (
    <svg width="36" height="42" viewBox="0 0 36 42" fill="none">
      <rect x="7" y="4" width="6" height="32" rx="3" fill={color} />
      <rect x="5" y="13" width="10" height="2.5" rx="1.2" fill={color} />
      <rect x="5" y="24" width="10" height="2.5" rx="1.2" fill={color} />
      <rect x="21" y="10" width="6" height="28" rx="3" fill={color} />
      <rect x="19" y="20" width="10" height="2.5" rx="1.2" fill={color} />
      <rect x="19" y="30" width="10" height="2.5" rx="1.2" fill={color} />
      <ellipse cx="5" cy="7" rx="6" ry="2.2" transform="rotate(-38 5 7)" fill={color} />
      <ellipse cx="31" cy="14" rx="6" ry="2.2" transform="rotate(38 31 14)" fill={color} />
    </svg>
  );
}

function IconTorii({ color }: { color: string }) {
  return (
    <svg width="40" height="38" viewBox="0 0 40 38" fill="none">
      <path d="M2 15 L2 10 L7 5 L11 10 L29 10 L33 5 L38 10 L38 15 Z" fill={color} />
      <rect x="10" y="17" width="20" height="4" rx="2" fill={color} />
      <rect x="10" y="12" width="5" height="24" rx="2" fill={color} />
      <rect x="25" y="12" width="5" height="24" rx="2" fill={color} />
    </svg>
  );
}

function IconPagoda({ color }: { color: string }) {
  return (
    <svg width="38" height="44" viewBox="0 0 38 44" fill="none">
      <circle cx="32" cy="7" r="5" fill="#e8420a" />
      <path d="M19 4 L25 11 H13 Z" fill={color} />
      <rect x="14" y="11" width="10" height="4" fill={color} />
      <path d="M19 15 L27 21 H11 Z" fill={color} />
      <rect x="12" y="21" width="14" height="5" fill={color} />
      <path d="M19 26 L30 32 H8 Z" fill={color} />
      <rect x="10" y="32" width="18" height="8" rx="1" fill={color} />
    </svg>
  );
}

function IconSakura({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <ellipse cx="18" cy="9" rx="4.5" ry="9" fill={color} />
      <ellipse cx="18" cy="9" rx="4.5" ry="9" transform="rotate(72 18 18)" fill={color} />
      <ellipse cx="18" cy="9" rx="4.5" ry="9" transform="rotate(144 18 18)" fill={color} />
      <ellipse cx="18" cy="9" rx="4.5" ry="9" transform="rotate(216 18 18)" fill={color} />
      <ellipse cx="18" cy="9" rx="4.5" ry="9" transform="rotate(288 18 18)" fill={color} />
      <circle cx="18" cy="18" r="4" fill="#252525" />
    </svg>
  );
}

const RANK_ICONS = [IconBamboo, IconTorii, IconPagoda, IconSakura];

function calcScore(stats: { lessonsCompleted: number; homeworkSubmitted: number; trainingHours: number }) {
  const lessons  = Math.round((Math.min(stats.lessonsCompleted,  20) / 20) * 40);
  const homework = Math.round((Math.min(stats.homeworkSubmitted, 20) / 20) * 35);
  const training = Math.round((Math.min(stats.trainingHours,     10) / 10) * 25);
  return { lessons, homework, training, total: lessons + homework + training };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const greeting = getGreeting();

  const apiStats = await fetchStudentStats().catch(
    (): StudentStatsDto => ({
      completedLessons: 0,
      upcomingLessons: 0,
      totalBookings: 0,
      homeworkDone: 0,
      homeworkTotal: 0,
      trainingSeconds: 0,
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
  const rankIdx = RANKS.findIndex(r => score.total >= r.min && score.total <= r.max);
  const rank = RANKS[rankIdx];
  const nextRank = RANKS[rankIdx + 1] ?? null;
  const progressInRank = rank
    ? Math.round(((score.total - rank.min) / (rank.max - rank.min)) * 100)
    : 100;

  return (
    <main className="min-h-screen" style={{ background: "#f8f4ec" }}>
      <div className="mx-auto max-w-4xl px-10 py-14">

        {/* ── Greeting ── */}
        <div className="mb-10">
          <div className="g-mono mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#e8420a" }}>
            <span style={{ display: "inline-block", width: 24, height: 2, background: "#e8420a" }} />
            {greeting}
          </div>
          <h1 className="g-display text-[42px] font-extrabold leading-tight" style={{ color: "#252525", letterSpacing: "-0.025em" }}>
            Твой личный кабинет
          </h1>
          <p className="g-body mt-2 text-[16px] font-medium" style={{ color: "#6b6b6b" }}>
            Индивидуальные занятия · японский язык
            <span className="g-jp ml-2" style={{ color: "#a0a0a0", fontSize: 14 }}>いらっしゃい</span>
          </p>
        </div>

        {/* ── Profile card ── */}
        <div className="mb-6 flex items-center gap-5 rounded-2xl bg-white px-7 py-5" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
          <Avatar value={user.avatarUrl} size={64} fallback={user.nickname ?? user.email} />
          <div className="flex-1 min-w-0">
            <div className="g-display truncate text-[18px] font-extrabold leading-tight" style={{ color: "#252525" }}>
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

        {/* ── Progress stats ── */}
        <div className="mb-4">
          <div className="g-mono mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6b6b6b" }}>
            <span style={{ display: "inline-block", width: 24, height: 2, background: "#6b6b6b" }} />
            Прогресс
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="g-display text-[40px] font-extrabold leading-none" style={{ color: "#252525" }}>
                {stats.lessonsCompleted}
              </div>
              <div className="g-body mt-2 text-[13px]" style={{ color: "#6b6b6b" }}>уроков пройдено</div>
            </div>
            <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="g-display text-[40px] font-extrabold leading-none" style={{ color: "#252525" }}>
                {stats.trainingHoursWhole}
                <span className="text-[20px] font-bold">ч</span>
                {" "}
                {stats.trainingMinutes}
                <span className="text-[20px] font-bold">м</span>
              </div>
              <div className="g-body mt-2 text-[13px]" style={{ color: "#6b6b6b" }}>в тренировках</div>
            </div>
            <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="g-display text-[40px] font-extrabold leading-none" style={{ color: "#252525" }}>
                {stats.homeworkSubmitted}
              </div>
              <div className="g-body mt-2 text-[13px]" style={{ color: "#6b6b6b" }}>домашних заданий</div>
            </div>
          </div>
        </div>

        {/* ── Rank card ── */}
        <div className="mb-6 rounded-2xl bg-white p-7" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="mb-6 flex items-center justify-between">
            <div className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#e8420a" }}>
              Ранг
            </div>
            <div className="g-mono text-[11px] font-bold" style={{ color: "#6b6b6b" }}>
              {score.total} / 100 очков
            </div>
          </div>

          {/* 4 rank medals */}
          <div className="mb-6 grid grid-cols-4 gap-3">
            {RANKS.map((r, i) => {
              const isActive = i === rankIdx;
              const isPast   = i < rankIdx;
              const badgeColor = isActive || isPast ? r.color : "#ccc";
              const RankIcon = RANK_ICONS[i];
              return (
                <div
                  key={r.name}
                  className="flex flex-col items-center gap-2 rounded-xl py-4"
                  style={{
                    background: isActive ? `${r.color}12` : "transparent",
                    border: isActive ? `1px solid ${r.color}35` : "1px solid transparent",
                  }}
                >
                  {/* Rank icon */}
                  <div style={{ opacity: !isActive && !isPast ? 0.25 : isPast ? 0.5 : 1, marginBottom: 2 }}>
                    <RankIcon color={badgeColor} />
                  </div>
                  {/* Stars */}
                  <div
                    className="text-[11px] tracking-tight"
                    style={{ color: isActive || isPast ? r.color : "#ccc", letterSpacing: 1 }}
                  >
                    {"★".repeat(r.stars)}
                  </div>
                  {/* Name */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className="g-jp text-center text-[13px] font-bold leading-none"
                      style={{ color: isActive ? r.color : isPast ? "#a0a0a0" : "#ccc" }}
                    >
                      {r.name}
                    </div>
                    <div
                      className="g-mono text-center text-[9px] leading-none"
                      style={{ color: isActive ? r.color : isPast ? "#c0c0c0" : "#ddd", opacity: 0.8 }}
                    >
                      {r.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between">
              <span className="g-mono text-[10px] font-bold" style={{ color: rank?.color }}>
                {rank?.name}
              </span>
              {nextRank && (
                <span className="g-mono text-[10px]" style={{ color: "#a0a0a0" }}>
                  до {nextRank.name}: +{nextRank.min - score.total} очков
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "#efe7d8" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressInRank}%`, background: rank?.color }}
              />
            </div>
          </div>

          {/* Score breakdown */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl px-4 py-3" style={{ background: "#f8f4ec" }}>
              <div className="g-mono text-[10px] uppercase tracking-wider" style={{ color: "#a0a0a0" }}>Уроки</div>
              <div className="g-display mt-1 text-[20px] font-extrabold" style={{ color: "#252525" }}>
                +{score.lessons}
                <span className="g-mono ml-1 text-[10px] font-normal" style={{ color: "#a0a0a0" }}>из 40</span>
              </div>
            </div>
            <div className="flex-1 rounded-xl px-4 py-3" style={{ background: "#f8f4ec" }}>
              <div className="g-mono text-[10px] uppercase tracking-wider" style={{ color: "#a0a0a0" }}>Домашние</div>
              <div className="g-display mt-1 text-[20px] font-extrabold" style={{ color: "#252525" }}>
                +{score.homework}
                <span className="g-mono ml-1 text-[10px] font-normal" style={{ color: "#a0a0a0" }}>из 35</span>
              </div>
            </div>
            <div className="flex-1 rounded-xl px-4 py-3" style={{ background: "#f8f4ec" }}>
              <div className="g-mono text-[10px] uppercase tracking-wider" style={{ color: "#a0a0a0" }}>Тренировки</div>
              <div className="g-display mt-1 text-[20px] font-extrabold" style={{ color: "#252525" }}>
                {stats.trainingHoursWhole}
                <span className="text-[14px] font-bold">ч</span>
                {" "}
                {stats.trainingMinutes}
                <span className="text-[14px] font-bold">м</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Calendar — wide (live Google Calendar integration) */}
          <CalendarSection />

          {/* Level card */}
          <div className="rounded-2xl bg-white p-7" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="g-mono mb-4 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#e8420a" }}>
              Уровень
            </div>
            {user.jlptLevel ? (
              <>
                <div className="g-display text-[72px] font-extrabold leading-none" style={{ color: "#252525", letterSpacing: "-0.04em" }}>
                  {user.jlptLevel}
                </div>
                <p className="g-body mt-3 text-[13px]" style={{ color: "#6b6b6b" }}>
                  {LEVEL_BLURB[user.jlptLevel] ?? "Уровень подтверждён преподавателем"}
                </p>
              </>
            ) : user.quizLevel ? (
              <>
                <div className="g-display text-[56px] font-extrabold leading-none" style={{ color: "#252525", letterSpacing: "-0.04em" }}>
                  ~{user.quizLevel}
                </div>
                <p className="g-body mt-3 text-[13px]" style={{ color: "#6b6b6b" }}>
                  Предварительная оценка по квизу. Финальный уровень выставит преподаватель на
                  бесплатной консультации.
                </p>
              </>
            ) : (
              <>
                <div className="g-display text-[32px] font-extrabold leading-tight" style={{ color: "#252525" }}>
                  Пока не определён
                </div>
                <p className="g-body mt-3 text-[13px]" style={{ color: "#6b6b6b" }}>
                  Пройди короткий квиз или запишись на бесплатную консультацию с преподавателем.
                </p>
              </>
            )}

            <div className="mt-6 rounded-xl p-4" style={{ background: "#f8f4ec" }}>
              <div className="g-mono mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#e8420a" }}>
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
                className="g-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[24px] font-bold"
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
                <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>Кандзи</div>
                <div className="g-body mt-0.5 text-[12px]" style={{ color: "#6b6b6b" }}>Тренажёр иероглифов</div>
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
            <div className="g-display text-[15px] font-bold" style={{ color: "#252525" }}>Связаться с учителем</div>
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 17) return "Добрый день";
  return "Добрый вечер";
}
