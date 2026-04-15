import type { LessonDto } from "@gojo/shared";
import { fetchLessons } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  let lessons: LessonDto[] = [];
  let error: string | null = null;
  try {
    lessons = await fetchLessons();
  } catch (e) {
    error = e instanceof Error ? e.message : "unknown error";
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Расписание
        </p>
        <h1 className="mt-3 font-serif text-[40px] leading-tight text-text-primary">
          Ближайшие уроки
        </h1>
        <p className="mt-3 text-text-secondary">
          Выбери урок и запишись. Группы до 8 студентов.
        </p>

        {error ? (
          <div className="mt-10 rounded-lg border border-shu-soft bg-shu-soft px-5 py-4 text-sm text-shu">
            API недоступен: {error}. Убедись что `bun run dev:api` запущен и БД поднята.
          </div>
        ) : lessons.length === 0 ? (
          <div className="mt-10 rounded-lg border border-border-subtle bg-bg-elevated px-5 py-10 text-center text-text-tertiary">
            Пока нет запланированных уроков. Запусти{" "}
            <code className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[13px]">
              bun run --cwd packages/db seed
            </code>
          </div>
        ) : (
          <ul className="mt-10 space-y-3">
            {lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function LessonRow({ lesson }: { lesson: LessonDto }) {
  const starts = new Date(lesson.startsAt);
  const ends = new Date(lesson.endsAt);
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-elevated p-5 shadow-sm transition hover:border-border-default hover:shadow-md">
      <div className="min-w-0">
        <h3 className="truncate text-[17px] font-medium text-text-primary">{lesson.title}</h3>
        <p className="mt-1 text-sm text-text-secondary">
          {lesson.teacherNickname ?? "Teacher"} · {fmt.format(starts)}—
          {ends.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <button
        type="button"
        className="ml-4 shrink-0 rounded-md bg-shu px-4 py-2 text-sm font-medium text-white shadow-warm transition hover:bg-shu-hover"
      >
        Записаться
      </button>
    </li>
  );
}
