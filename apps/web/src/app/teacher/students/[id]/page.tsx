import { Avatar } from "@/components/avatar";
import { ApiError, type TeacherStudentProfileDto, fetchTeacherStudentProfile } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherStudentProfilePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  const { id } = await params;
  let profile: TeacherStudentProfileDto;
  try {
    profile = await fetchTeacherStudentProfile(id);
  } catch (e) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="g-card px-6 py-8">
            <p className="text-sm font-bold text-gojo-error">
              {e instanceof ApiError ? `API ${e.status}: ${e.message}` : "Ошибка загрузки"}
            </p>
            <Link
              href="/teacher/students"
              className="mt-4 inline-block text-sm font-bold text-gojo-orange hover:underline"
            >
              ← К студентам
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const student = profile.student;

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/teacher/students"
          className="text-sm font-bold text-gojo-orange hover:underline"
        >
          ← К студентам
        </Link>

        <section className="g-card mt-6 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              value={student.avatarUrl}
              size={64}
              fallback={student.nickname ?? student.email}
            />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
                Профиль студента
              </div>
              <h1 className="mt-1 font-serif text-[32px] font-bold">
                {student.nickname ?? student.email}
              </h1>
              <p className="text-sm text-gojo-ink-muted">
                {student.email} · JLPT: {student.jlptLevel ?? "не выставлен"} · Квиз:{" "}
                {student.quizLevel ?? "нет"}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section>
            <h2 className="font-serif text-[24px] font-bold">История уроков</h2>
            {profile.lessons.length === 0 ? (
              <p className="mt-3 text-sm text-gojo-ink-muted">Уроков пока нет.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {profile.lessons.map((lesson) => (
                  <li
                    key={lesson.lessonId}
                    className="rounded-lg border border-black/10 bg-gojo-surface p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/teacher/lessons/${lesson.lessonId}`}
                          className="font-bold hover:text-gojo-orange"
                        >
                          {lesson.title}
                        </Link>
                        <div className="mt-1 text-[12px] text-gojo-ink-muted">
                          {new Date(lesson.startsAt).toLocaleString("ru-RU")} · {lesson.status}
                        </div>
                      </div>
                      <div className="text-right text-[12px] font-bold text-gojo-ink-muted">
                        <div>Посещение: {lesson.attendanceStatus}</div>
                        <div>ДЗ: {lesson.homeworkStatus}</div>
                      </div>
                    </div>
                    {lesson.postLessonNote || lesson.recommendation ? (
                      <div className="mt-3 rounded-md bg-gojo-paper p-3 text-sm text-gojo-ink-muted">
                        {lesson.postLessonNote ? <p>{lesson.postLessonNote}</p> : null}
                        {lesson.recommendation ? (
                          <p className="mt-1 font-bold">Следующий шаг: {lesson.recommendation}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-serif text-[24px] font-bold">Заявки</h2>
            {profile.leads.length === 0 ? (
              <p className="mt-3 text-sm text-gojo-ink-muted">Связанных заявок нет.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {profile.leads.map((lead) => (
                  <li
                    key={lead.id}
                    className="rounded-lg border border-gojo-ink/10 bg-gojo-surface-2 p-4"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gojo-orange">
                      {lead.status} · {lead.kind}
                    </div>
                    <div className="mt-1 font-bold">{lead.name}</div>
                    <p className="mt-1 text-sm text-gojo-ink-muted">
                      {[lead.level, lead.goal].filter(Boolean).join(" · ") || "Без деталей"}
                    </p>
                    {lead.notes ? (
                      <p className="mt-2 text-sm text-gojo-ink-muted">{lead.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
