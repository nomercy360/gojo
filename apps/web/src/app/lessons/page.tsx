import Link from "next/link";
import { Suspense } from "react";
import type { LessonDto } from "@gojo/shared";
import { LessonCountdown } from "@/components/lesson-countdown";
import { fetchLessons } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { bookLessonAction } from "./actions";
import { CalendarView } from "./calendar";
import { ViewToggle } from "./view-toggle";

export const dynamic = "force-dynamic";

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "list" } = await searchParams;
  const [user, lessonsResult] = await Promise.all([
    getCurrentUser(),
    fetchLessons().catch((e: unknown) =>
      e instanceof Error ? e.message : "unknown error",
    ),
  ]);

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
          <p className="text-sm text-gojo-ink-muted">
            Выбери урок и запишись. Группы до 8 студентов.
          </p>
          <Suspense>
            <ViewToggle />
          </Suspense>
        </div>

        {error ? (
          <div className="mt-10 rounded-lg border-2 border-gojo-error bg-gojo-error-soft px-5 py-4 text-sm font-bold text-gojo-error">
            API недоступен: {error}
          </div>
        ) : lessons.length === 0 ? (
          <div className="mt-10 rounded-lg border-2 border-gojo-ink bg-gojo-surface px-5 py-10 text-center text-gojo-ink-muted shadow-pop">
            Пока нет запланированных уроков.
          </div>
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
  const isTomorrow =
    starts.toDateString() === new Date(Date.now() + 86400000).toDateString();
  const dayLabel = isToday ? "СЕГОДНЯ" : isTomorrow ? "ЗАВТРА" : null;
  const durationMin = Math.round((ends.getTime() - starts.getTime()) / 60000);
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const seats = lesson.studentCount ?? 0;
  const max = lesson.maxStudents;
  const isFull = seats >= max;

  return (
    <li className="card-pop relative overflow-hidden rounded-lg border-2 border-gojo-ink bg-gojo-surface p-5">
      <div
        className="absolute right-0 top-0 h-12 w-12 bg-gojo-orange"
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      />

      <div className="flex items-center justify-between">
        <div className="min-w-0 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            {dayLabel ? (
              <span className="-rotate-2 inline-block rounded-sm bg-gojo-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                {dayLabel}
              </span>
            ) : null}
            {lesson.jlptLevel ? (
              <span className="rounded-sm bg-gojo-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {lesson.jlptLevel}
              </span>
            ) : null}
            <span className="text-[11px] font-bold text-gojo-ink-muted">
              {fmt.format(starts)} · {durationMin} мин
            </span>
          </div>
          <h3 className="mt-2 truncate font-serif text-[20px] font-bold">
            <Link href={`/lessons/${lesson.id}`} className="hover:text-gojo-orange">
              {lesson.title}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-3 text-sm text-gojo-ink-muted">
            <span>{lesson.teacherNickname ?? "Teacher"}</span>
            <span
              className={`font-mono text-[12px] font-bold ${
                isFull ? "text-gojo-error" : "text-gojo-ink-muted"
              }`}
            >
              {seats}/{max} мест
            </span>
          </p>
        </div>

        <LessonAction
          lesson={lesson}
          authenticated={authenticated}
          isFull={isFull}
        />
      </div>
      {lesson.joinState === "waiting" && lesson.joinOpensAt ? (
        <div className="mt-3 flex justify-end">
          <LessonCountdown target={lesson.joinOpensAt} label="Открытие за 15 мин · через" />
        </div>
      ) : null}
    </li>
  );
}

function LessonAction({
  lesson,
  authenticated,
  isFull,
}: {
  lesson: LessonDto;
  authenticated: boolean;
  isFull: boolean;
}) {
  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="btn-pop shrink-0 rounded-md border-2 border-gojo-ink bg-gojo-surface px-4 py-2 text-sm font-bold"
      >
        Войти
      </Link>
    );
  }

  const state = lesson.joinState;

  if (state === "cancelled") {
    return (
      <span className="shrink-0 rounded-md border-2 border-gojo-ink/30 bg-gojo-surface-2 px-4 py-2 text-sm font-bold text-gojo-ink-ghost">
        Отменён
      </span>
    );
  }

  if (state === "ended") {
    return (
      <Link
        href={`/lessons/${lesson.id}`}
        className="shrink-0 rounded-md border-2 border-gojo-ink bg-gojo-surface-2 px-4 py-2 text-sm font-bold text-gojo-ink-muted hover:bg-gojo-surface"
      >
        Завершён
      </Link>
    );
  }

  if (state === "joinable") {
    return (
      <Link
        href={`/lessons/${lesson.id}/room`}
        className="btn-pop shrink-0 rounded-md border-2 border-gojo-ink bg-gojo-orange px-4 py-2 text-sm font-bold text-white"
      >
        Войти ▸
      </Link>
    );
  }

  if (state === "waiting") {
    return (
      <span
        aria-disabled
        className="shrink-0 cursor-not-allowed rounded-md border-2 border-gojo-ink/30 bg-gojo-surface-2 px-4 py-2 text-sm font-bold text-gojo-ink-ghost"
        title="Вход откроется за 15 минут до начала"
      >
        Готовится
      </span>
    );
  }

  // state is "full" / "bookable" / undefined — fall back to booking controls.
  if (state === "full" || (state === undefined && isFull)) {
    return (
      <span className="shrink-0 rounded-md border-2 border-gojo-ink/30 bg-gojo-surface-2 px-4 py-2 text-sm font-bold text-gojo-ink-ghost">
        Мест нет
      </span>
    );
  }

  return (
    <form action={bookLessonAction}>
      <input type="hidden" name="lessonId" value={lesson.id} />
      <button
        type="submit"
        className="btn-pop shrink-0 rounded-md border-2 border-gojo-ink bg-gojo-surface px-4 py-2 text-sm font-bold hover:bg-gojo-surface-2"
      >
        Записаться
      </button>
    </form>
  );
}
