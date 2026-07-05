import { LessonCardsManager } from "@/app/lessons/[id]/cards-manager";
import { HomeworkManager } from "@/app/lessons/[id]/homework-manager";
import {
  ApiError,
  type LessonStudentDto,
  fetchLesson,
  fetchLessonCards,
  fetchLessonMaterials,
  fetchLessonStudents,
} from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import type { LessonCardDto, LessonDto, LessonMaterialDto } from "@gojo/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MaterialUploadForm } from "./material-upload-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherLessonPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  let lesson: LessonDto;
  let students: LessonStudentDto[] = [];
  let cards: LessonCardDto[] = [];
  let materials: LessonMaterialDto[] = [];
  try {
    lesson = await fetchLesson(id);
    [students, cards, materials] = await Promise.all([
      fetchLessonStudents(id),
      fetchLessonCards(id),
      fetchLessonMaterials(id),
    ]);
  } catch (e) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="card-pop rounded-lg border-2 border-gojo-ink bg-gojo-surface px-6 py-8">
            <p className="text-sm font-bold text-gojo-error">
              {e instanceof ApiError ? `Не удалось открыть урок (${e.status})` : "Ошибка загрузки"}
            </p>
            <Link
              href="/teacher"
              className="mt-4 inline-block text-sm font-bold text-gojo-orange hover:underline"
            >
              ← К панели учителя
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const starts = new Date(lesson.startsAt);
  const ends = new Date(lesson.endsAt);
  const durationMin = Math.round((ends.getTime() - starts.getTime()) / 60000);

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/teacher" className="text-sm font-bold text-gojo-orange hover:underline">
          ← К панели учителя
        </Link>

        <div className="mt-6 rounded-lg border-2 border-gojo-ink bg-gojo-surface p-6 shadow-pop">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Урок учителя
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-[32px] font-bold">{lesson.title}</h1>
              <p className="mt-2 text-sm text-gojo-ink-muted">
                {starts.toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {durationMin} мин · {students.length} студ.
              </p>
            </div>
            <Link
              href={`/lessons/${id}/room`}
              className="btn-pop rounded-md border-2 border-gojo-ink bg-gojo-orange px-4 py-2 text-sm font-bold text-white"
            >
              Войти в комнату ▸
            </Link>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="font-serif text-[22px] font-bold">Студенты</h2>
          {students.length === 0 ? (
            <p className="mt-3 rounded-md border-2 border-gojo-ink bg-gojo-surface px-4 py-5 text-sm text-gojo-ink-muted">
              На урок пока никто не записался.
            </p>
          ) : (
            <HomeworkManager lessonId={id} initialStudents={students} />
          )}
        </section>

        <LessonCardsManager lessonId={id} initialCards={cards} />

        <section className="mt-10">
          <h2 className="font-serif text-[22px] font-bold">Материалы</h2>
          <p className="mt-1 text-[13px] text-gojo-ink-muted">
            Загрузи файлы к уроку: домашку, PDF, таблицы или дополнительные материалы.
          </p>

          <MaterialUploadForm lessonId={id} />

          {materials.length === 0 ? (
            <p className="mt-4 text-sm text-gojo-ink-muted">Материалы пока не добавлены.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {materials.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border-2 border-gojo-ink bg-gojo-surface p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{m.title}</p>
                    <p className="text-[11px] text-gojo-ink-muted">
                      {m.fileType || "file"} · {new Date(m.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-pop ml-3 shrink-0 rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-1.5 text-[11px] font-bold hover:bg-gojo-surface-2"
                  >
                    Открыть
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
