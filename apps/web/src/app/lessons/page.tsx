import { LessonCountdown } from "@/components/lesson-countdown";
import { LocalTime, TimeZoneNote } from "@/components/local-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchLessons } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { LessonDto } from "@gojo/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CalendarView } from "./calendar";
import { ViewToggle } from "./view-toggle";

export const dynamic = "force-dynamic";

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "list" } = await searchParams;
  const user = await getCurrentUser();
  if (isTeacherUser(user)) redirect("/teacher");

  const lessonsResult = await fetchLessons().catch((e: unknown) =>
    e instanceof Error ? e.message : "unknown error",
  );

  const error = typeof lessonsResult === "string" ? lessonsResult : null;
  const lessons: LessonDto[] = typeof lessonsResult === "string" ? [] : lessonsResult;

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Расписание
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Ближайшие уроки</h1>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-gojo-ink-muted">Твои занятия с преподавателем.</p>
          <Suspense>
            <ViewToggle />
          </Suspense>
        </div>
        <TimeZoneNote className="mt-2 text-xs text-gojo-ink-muted" />

        {error ? (
          <Alert variant="destructive" className="mt-10 bg-gojo-error-soft">
            <AlertDescription className="font-bold text-gojo-error">
              API недоступен: {error}
            </AlertDescription>
          </Alert>
        ) : lessons.length === 0 ? (
          <Card className="mt-10 px-5 py-10 text-center text-gojo-ink-muted">
            Пока нет запланированных занятий. Договоритесь о времени с преподавателем в Telegram —
            уроки появятся здесь.
          </Card>
        ) : view === "calendar" ? (
          <div className="mt-10">
            <Suspense>
              <CalendarView lessons={lessons} authenticated={!!user} />
            </Suspense>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} authenticated={!!user} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function LessonRow({ lesson, authenticated }: { lesson: LessonDto; authenticated: boolean }) {
  const starts = new Date(lesson.startsAt);
  const ends = new Date(lesson.endsAt);
  const isToday = starts.toDateString() === new Date().toDateString();
  const isTomorrow = starts.toDateString() === new Date(Date.now() + 86400000).toDateString();
  const dayLabel = isToday ? "СЕГОДНЯ" : isTomorrow ? "ЗАВТРА" : null;
  const durationMin = Math.round((ends.getTime() - starts.getTime()) / 60000);

  return (
    <Card asChild className="relative p-5">
      <li>
        <div
          className="absolute right-0 top-0 h-12 w-12 bg-gojo-orange"
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
        />

        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-14">
            <div className="flex flex-wrap items-center gap-2">
              {dayLabel ? <Badge className="-rotate-2">{dayLabel}</Badge> : null}
              {lesson.jlptLevel ? <Badge variant="secondary">{lesson.jlptLevel}</Badge> : null}
              <span className="text-[11px] font-bold text-gojo-ink-muted">
                <LocalTime
                  iso={lesson.startsAt}
                  options={{
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }}
                  showTimeZone
                />{" "}
                · {durationMin} мин
              </span>
            </div>
            <h3 className="mt-2 truncate font-serif text-[20px] font-bold">
              <Link href={`/lessons/${lesson.id}`} className="hover:text-gojo-orange">
                {lesson.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-gojo-ink-muted">
              {lesson.teacherNickname ?? "Преподаватель"}
            </p>
          </div>

          <LessonAction lesson={lesson} authenticated={authenticated} />
        </div>
        {lesson.joinState === "waiting" && lesson.joinOpensAt ? (
          <div className="mt-3 flex justify-end">
            <LessonCountdown target={lesson.joinOpensAt} label="Открытие за 15 мин · через" />
          </div>
        ) : null}
      </li>
    </Card>
  );
}

function LessonAction({
  lesson,
  authenticated,
}: {
  lesson: LessonDto;
  authenticated: boolean;
}) {
  if (!authenticated) {
    return (
      <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
        Войти
      </Link>
    );
  }

  const state = lesson.joinState;

  if (state === "cancelled") {
    return (
      <span className="shrink-0 rounded-md border border-black/10 bg-gojo-paper-2 px-4 py-2 text-sm font-bold text-gojo-ink-ghost">
        Отменён
      </span>
    );
  }

  if (state === "ended") {
    return (
      <Link
        href={`/lessons/${lesson.id}`}
        className="shrink-0 rounded-md border border-black/10 bg-gojo-paper-2 px-4 py-2 text-sm font-bold text-gojo-ink-muted hover:bg-gojo-surface"
      >
        Завершён
      </Link>
    );
  }

  if (state === "joinable") {
    if (lesson.meetingUrl) {
      return (
        <a
          href={lesson.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants(), "shrink-0")}
        >
          Войти ▸
        </a>
      );
    }
    return (
      <Link href={`/lessons/${lesson.id}`} className={cn(buttonVariants(), "shrink-0")}>
        Открыть ▸
      </Link>
    );
  }

  if (state === "waiting") {
    return (
      <span
        aria-disabled
        className="shrink-0 cursor-not-allowed rounded-md border border-black/10 bg-gojo-paper-2 px-4 py-2 text-sm font-bold text-gojo-ink-ghost"
        title="Вход откроется за 15 минут до начала"
      >
        Готовится
      </span>
    );
  }

  // Lessons here are always the student's own (teacher-assigned), so the only
  // remaining state is "waiting" before the join window — handled above. Any
  // other value just links to the lesson detail.
  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
    >
      Открыть ▸
    </Link>
  );
}
