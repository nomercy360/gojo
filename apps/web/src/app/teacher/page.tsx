import { redirect } from "next/navigation";
import type { TeacherLessonDto } from "@/lib/api";
import { fetchTeacherLessons } from "@/lib/api";
import { getCurrentUser, getSessionToken } from "@/lib/session";
import { cancelLessonAction } from "./actions";
import { CreateLessonForm } from "./create-form";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const token = await getSessionToken();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "teacher" && user.role !== "admin") {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="card-pop rounded-lg border-2 border-gojo-ink bg-gojo-surface px-6 py-8">
            <p className="text-sm font-bold text-gojo-error">
              Доступ только для учителей.
            </p>
          </div>
        </div>
      </main>
    );
  }

  let lessons: TeacherLessonDto[] = [];
  let error: string | null = null;
  try {
    lessons = await fetchTeacherLessons(token!);
  } catch (e) {
    error = e instanceof Error ? e.message : "unknown";
  }

  const scheduled = lessons.filter((l) => l.status === "scheduled");
  const past = lessons.filter((l) => l.status !== "scheduled");

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Панель учителя
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Мои уроки</h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Lessons list */}
          <div>
            {error ? (
              <div className="rounded-lg border-2 border-gojo-error bg-gojo-error-soft px-5 py-4 text-sm font-bold text-gojo-error">
                {error}
              </div>
            ) : scheduled.length === 0 ? (
              <div className="card-pop rounded-lg border-2 border-gojo-ink bg-gojo-surface px-5 py-10 text-center text-gojo-ink-muted">
                Нет запланированных уроков. Создай первый →
              </div>
            ) : (
              <ul className="space-y-4">
                {scheduled.map((l) => (
                  <TeacherLessonCard key={l.id} lesson={l} />
                ))}
              </ul>
            )}

            {past.length > 0 ? (
              <>
                <h3 className="mt-10 text-sm font-bold text-gojo-ink-muted">
                  Прошедшие / отменённые
                </h3>
                <ul className="mt-3 space-y-3">
                  {past.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded-lg border border-gojo-ink/10 bg-gojo-surface-2 p-4 text-sm"
                    >
                      <div>
                        <span className="font-bold">{l.title}</span>
                        <span className="ml-2 text-gojo-ink-muted">
                          {l.status} · {l.studentCount} студ.
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {/* Create form */}
          <CreateLessonForm />
        </div>
      </div>
    </main>
  );
}

function TeacherLessonCard({ lesson }: { lesson: TeacherLessonDto }) {
  const starts = new Date(lesson.startsAt);
  const ends = new Date(lesson.endsAt);
  const durationMin = Math.round((ends.getTime() - starts.getTime()) / 60000);
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="card-pop relative overflow-hidden rounded-lg border-2 border-gojo-ink bg-gojo-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-bold text-gojo-ink-muted">
            {fmt.format(starts)} · {durationMin} мин
          </span>
          <h3 className="mt-1 font-serif text-[18px] font-bold">{lesson.title}</h3>
          <div className="mt-2 flex items-center gap-3">
            <span className="rounded-sm bg-gojo-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
              {lesson.studentCount} студ.
            </span>
            <a
              href={`/lessons/${lesson.id}/room`}
              className="text-sm font-bold text-gojo-orange hover:underline"
            >
              Войти ▸
            </a>
          </div>
        </div>
        <form action={cancelLessonAction}>
          <input type="hidden" name="lessonId" value={lesson.id} />
          <button
            type="submit"
            className="rounded-md border-2 border-gojo-ink px-3 py-1.5 text-[11px] font-bold text-gojo-ink-muted hover:bg-gojo-error-soft hover:text-gojo-error"
          >
            Отменить
          </button>
        </form>
      </div>
    </li>
  );
}
