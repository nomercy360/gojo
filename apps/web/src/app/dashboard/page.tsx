import { CalendarSection } from "@/components/calendar-section";
import { LocalTime } from "@/components/local-time";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type HomeworkDueEntry,
  fetchHomeworkDue,
  fetchLessons,
  fetchMyPayments,
  fetchStudentStats,
} from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { LessonDto, StudentStatsDto } from "@gojo/shared";
import { ArrowRight, Check, Flame, Layers3, MessageCircle, Type, Video } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { SavedToast } from "./saved-toast";

const EMPTY_STATS: StudentStatsDto = {
  completedLessons: 0,
  upcomingLessons: 0,
  totalBookings: 0,
  homeworkDone: 0,
  homeworkTotal: 0,
  trainingSeconds: 0,
  currentStreak: 0,
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isTeacherUser(user)) redirect("/teacher");

  const [stats, paymentAccount, lessons, homeworkDue] = await Promise.all([
    fetchStudentStats().catch(() => EMPTY_STATS),
    fetchMyPayments().catch(() => null),
    fetchLessons().catch((): LessonDto[] => []),
    fetchHomeworkDue().catch((): HomeworkDueEntry[] => []),
  ]);

  const level = getLevelState(user.jlptLevel, user.quizLevel);
  const isPaid = paymentAccount?.access.isActive ?? false;

  return (
    <main className="min-h-screen bg-gojo-paper">
      <Suspense fallback={null}>
        <SavedToast />
      </Suspense>

      <div className="mx-auto max-w-4xl px-6 py-12 sm:px-10 sm:py-14">
        <DashboardHeader
          subtitle={
            isPaid
              ? `Индивидуальные занятия · ${activeLevelLabel(level)}`
              : `Пробный урок пройден · ${unpaidLevelSubtitle(level)}`
          }
        />

        {isPaid && paymentAccount ? (
          <ActiveDashboard
            stats={stats}
            lessons={lessons}
            homeworkDue={homeworkDue}
            level={activeLevelLabel(level)}
            activeUntil={paymentAccount.access.activeUntil}
            lessonCredits={paymentAccount.access.lessonCredits}
          />
        ) : (
          <UnpaidDashboard level={level} />
        )}
      </div>
    </main>
  );
}

function DashboardHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="mb-8 sm:mb-10">
      <div className="g-mono flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gojo-orange">
        <span className="h-0.5 w-7 bg-gojo-orange" />
        {getGreeting()}
      </div>
      <h1 className="g-display mt-4 text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-gojo-ink sm:text-[52px]">
        Личный кабинет
      </h1>
      <p className="g-body mt-3 text-[15px] font-medium text-gojo-ink-muted sm:text-[16px]">
        {subtitle}
        <span className="g-jp ml-2 text-[14px] text-gojo-ink-ghost">いらっしゃい</span>
      </p>
    </header>
  );
}

function UnpaidDashboard({ level }: { level: DashboardLevelState }) {
  const stepLevel = level.value
    ? `${level.value}${level.level_provisional ? " · предварительно" : ""}`
    : "уровень уточняется";
  const stepDescription = level.level_provisional
    ? level.value
      ? "По тесту определён предварительный уровень. Преподаватель уточнит его после урока."
      : "Итоговый уровень ещё уточняется командой после пробного урока."
    : "Преподаватель определил твой стартовый уровень.";
  const steps = [
    {
      title: "Заявка отправлена",
      description: "Мы получили запрос и связались с тобой.",
    },
    {
      title: `Пробный урок · ${stepLevel}`,
      description: stepDescription,
    },
    {
      title: "Оплати доступ",
      description: "Разовый платёж через ЮKassa открывает регулярные занятия.",
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="gap-0 p-7 sm:p-8">
        <Eyebrow>Первые шаги</Eyebrow>
        <h2 className="g-display mt-3 text-[28px] font-extrabold leading-tight text-gojo-ink sm:text-[32px]">
          Ты почти на месте
        </h2>
        <p className="g-body mt-2 text-[14px] text-gojo-ink-muted">
          Заявка и пробный урок уже позади. Осталось открыть доступ к занятиям.
        </p>

        <ol className="mt-6">
          {steps.map((step, index) => {
            const done = index < 2;
            const active = index === 2;
            return (
              <li
                key={step.title}
                className={cn("flex gap-4 py-5", index > 0 && "border-t border-black/10")}
              >
                <span
                  className={cn(
                    "g-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    done && "bg-gojo-success text-white",
                    active && "bg-gojo-orange text-white",
                  )}
                >
                  {done ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : 3}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="g-body text-[16px] font-bold text-gojo-ink">{step.title}</h3>
                  <p className="g-body mt-1 text-[14px] text-gojo-ink-muted">{step.description}</p>
                  {active ? (
                    <Link
                      href="/payments"
                      className={cn(buttonVariants({ size: "lg" }), "mt-4 rounded-xl")}
                    >
                      К оплате
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <ContactStrip />
    </div>
  );
}

function ActiveDashboard({
  stats,
  lessons,
  homeworkDue,
  level,
  activeUntil,
  lessonCredits,
}: {
  stats: StudentStatsDto;
  lessons: LessonDto[];
  homeworkDue: HomeworkDueEntry[];
  level: string;
  activeUntil: string | null;
  lessonCredits: number;
}) {
  const nextLesson = lessons[0];

  return (
    <div className="space-y-5">
      {nextLesson ? <NextLesson lesson={nextLesson} /> : null}

      <HomeworkDueCard items={homeworkDue} />

      <StatusStrip activeUntil={activeUntil} lessonsLeft={lessonCredits} level={level} />

      <CalendarSection />

      <ProgressCard done={stats.completedLessons} streak={stats.currentStreak} />

      <section aria-labelledby="training-title">
        <div className="mb-3">
          <Eyebrow muted id="training-title">
            Тренировка
          </Eyebrow>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ToolCard
            href="/review"
            icon={<Layers3 aria-hidden="true" />}
            title="Карточки"
            subtitle="Повторение слов · FSRS"
          />
          <ToolCard
            href="/kana"
            icon={<Type aria-hidden="true" />}
            title="Хирагана · Катакана"
            subtitle="Тренажёр символов"
          />
        </div>
      </section>

      <ContactStrip />
    </div>
  );
}

const HOMEWORK_STATE_LABEL: Record<HomeworkDueEntry["state"], string> = {
  todo: "Нужно сдать",
  needs_revision: "Нужны правки",
  in_review: "На проверке",
};

function HomeworkDueCard({ items }: { items: HomeworkDueEntry[] }) {
  const actionable = items.filter((item) => item.state !== "in_review");
  if (items.length === 0) return null;

  return (
    <Card className="gap-0 p-7">
      <Eyebrow muted>Домашние задания</Eyebrow>
      <p className="g-body mt-2 text-[14px] text-gojo-ink-muted">
        {actionable.length > 0
          ? `Открытых заданий: ${actionable.length}. Задание сдаётся на странице урока.`
          : "Всё сдано — ждём проверку преподавателя."}
      </p>
      <ul className="mt-4 divide-y divide-black/5">
        {items.map((item) => (
          <li key={item.lessonId}>
            <Link
              href={`/lessons/${item.lessonId}`}
              className="group flex items-center justify-between gap-4 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold text-gojo-ink group-hover:text-gojo-orange">
                  {item.title}
                </span>
                <span className="text-[12px] text-gojo-ink-muted">
                  <LocalTime iso={item.startsAt} options={{ day: "numeric", month: "long" }} />
                </span>
              </span>
              <span
                className={cn(
                  "g-mono shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                  item.state === "in_review"
                    ? "bg-gojo-ink/5 text-gojo-ink-muted"
                    : "bg-gojo-orange-soft text-gojo-orange",
                )}
              >
                {HOMEWORK_STATE_LABEL[item.state]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NextLesson({ lesson }: { lesson: LessonDto }) {
  const durationMinutes = Math.max(
    0,
    Math.round((new Date(lesson.endsAt).getTime() - new Date(lesson.startsAt).getTime()) / 60_000),
  );
  const canJoin = lesson.joinState === "joinable";
  const actionLabel = canJoin ? "Подключиться" : "Открыть урок";
  const actionClass =
    "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[14px] font-bold text-gojo-orange transition-transform hover:-translate-y-0.5";
  const actionContent = (
    <>
      <Video aria-hidden="true" className="h-[18px] w-[18px]" />
      {actionLabel}
    </>
  );

  return (
    <Card className="flex-col gap-6 border-0 bg-gojo-orange p-7 text-white shadow-[0_8px_24px_rgb(232_66_10/0.18)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="g-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
          Ближайшее занятие
        </div>
        <h2 className="g-display mt-2 truncate text-[25px] font-extrabold sm:text-[28px]">
          {lesson.title}
        </h2>
        <div className="g-body mt-1 text-[14px] text-white/85 sm:text-[15px]">
          <LocalTime
            iso={lesson.startsAt}
            options={{
              weekday: "short",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            }}
          />
          {durationMinutes > 0 ? ` · ${durationMinutes} мин` : null}
        </div>
      </div>

      {canJoin && lesson.meetingUrl ? (
        <a
          href={lesson.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={actionClass}
        >
          {actionContent}
        </a>
      ) : (
        <Link href={`/lessons/${lesson.id}`} className={actionClass}>
          {actionContent}
        </Link>
      )}
    </Card>
  );
}

function StatusStrip({
  activeUntil,
  lessonsLeft,
  level,
}: {
  activeUntil: string | null;
  lessonsLeft: number;
  level: string;
}) {
  return (
    <Card className="grid grid-cols-2 gap-0 p-0 sm:grid-cols-4">
      <StatusCell
        label="Доступ"
        value="Активен"
        success
        className="border-b border-black/10 sm:border-b-0"
      />
      <StatusCell
        label="До"
        value={
          activeUntil ? (
            <LocalTime iso={activeUntil} options={{ day: "numeric", month: "short" }} />
          ) : (
            "По пакету"
          )
        }
        className="border-b border-l border-black/10 sm:border-b-0"
      />
      <StatusCell
        label="Осталось"
        value={lessonsLeft > 0 ? lessonsWord(lessonsLeft) : activeUntil ? "По плану" : "0 уроков"}
        className="sm:border-l sm:border-black/10"
      />
      <StatusCell label="Уровень" value={level} className="border-l border-black/10" />
    </Card>
  );
}

function StatusCell({
  label,
  value,
  success = false,
  className,
}: {
  label: string;
  value: ReactNode;
  success?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-5 py-5 sm:px-6", className)}>
      <div className="g-mono text-[10px] font-bold uppercase tracking-[0.14em] text-gojo-ink-ghost">
        {label}
      </div>
      <div
        className={cn(
          "g-display mt-1 truncate text-[19px] font-extrabold text-gojo-ink sm:text-[21px]",
          success && "text-gojo-success",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ProgressCard({ done, streak }: { done: number; streak: number }) {
  return (
    <Card className="gap-0 p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Прогресс</Eyebrow>
        <div className="g-body inline-flex items-center gap-1.5 rounded-full bg-gojo-orange-soft px-3 py-1.5 text-[12px] font-bold text-gojo-orange">
          <Flame aria-hidden="true" className="h-4 w-4" />
          {streak > 0
            ? `${streak} ${plural(streak, ["день", "дня", "дней"])} подряд`
            : "Начни серию"}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric
          value={done}
          label={plural(done, ["урок пройден", "урока пройдено", "уроков пройдено"])}
        />
        <Metric value={streak} label={plural(streak, ["день серии", "дня серии", "дней серии"])} />
      </div>
    </Card>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-gojo-paper px-5 py-5">
      <div className="g-display text-[34px] font-extrabold leading-none text-gojo-ink">{value}</div>
      <div className="g-body mt-2 text-[13px] text-gojo-ink-muted">{label}</div>
    </div>
  );
}

function ToolCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Card
      asChild
      className="flex-row items-center gap-4 p-5 hover:-translate-y-0.5 hover:border-gojo-orange hover:shadow-lg"
    >
      <Link href={href}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gojo-orange-soft text-gojo-orange [&_svg]:h-[22px] [&_svg]:w-[22px]">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="g-body block text-[15px] font-bold text-gojo-ink">{title}</span>
          <span className="g-body mt-0.5 block text-[12px] text-gojo-ink-muted">{subtitle}</span>
        </span>
      </Link>
    </Card>
  );
}

function ContactStrip() {
  return (
    <Card className="flex-col gap-5 border-0 bg-gojo-paper-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div>
        <h2 className="g-display text-[20px] font-extrabold text-gojo-ink">Вопрос по обучению?</h2>
        <p className="g-body mt-1 text-[13px] text-gojo-ink-muted sm:text-[14px]">
          Материалы, расписание, индивидуальный план — пиши преподавателю.
        </p>
      </div>
      <a
        href="https://t.me/gojoedu"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ size: "lg" }), "rounded-xl")}
      >
        <MessageCircle aria-hidden="true" />
        Telegram
      </a>
    </Card>
  );
}

function Eyebrow({
  children,
  muted = false,
  id,
}: {
  children: ReactNode;
  muted?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "g-mono text-[11px] font-bold uppercase tracking-[0.16em]",
        muted ? "text-gojo-ink-ghost" : "text-gojo-orange",
      )}
    >
      {children}
    </div>
  );
}

type DashboardLevelState = {
  value: string | null;
  level_provisional: boolean;
};

function getLevelState(jlptLevel: string | null, quizLevel: string | null): DashboardLevelState {
  if (jlptLevel) {
    return {
      value: jlptLevel,
      level_provisional: false,
    };
  }
  if (quizLevel) {
    return {
      value: quizLevel === "start" ? "с нуля" : quizLevel,
      level_provisional: true,
    };
  }
  return {
    value: null,
    level_provisional: true,
  };
}

function activeLevelLabel(level: DashboardLevelState): string {
  if (!level.value) return "уровень уточняется";
  return `${level.value}${level.level_provisional ? " · предварительно" : ""}`;
}

function unpaidLevelSubtitle(level: DashboardLevelState): string {
  if (!level.value) return "уровень уточняется";
  return level.level_provisional
    ? `предварительный уровень ${level.value}`
    : `твой уровень ${level.value}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

function lessonsWord(n: number): string {
  return `${n} ${plural(n, ["урок", "урока", "уроков"])}`;
}
