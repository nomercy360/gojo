import { LessonCountdown } from "@/components/lesson-countdown";
import { LocalTime } from "@/components/local-time";
import {
  ApiError,
  type LessonStudentDto,
  fetchLesson,
  fetchLessonCards,
  fetchLessonMaterials,
  fetchLessonStudents,
  fetchMySubmissions,
} from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import type {
  HomeworkSubmissionDto,
  LessonCardDto,
  LessonDto,
  LessonMaterialDto,
} from "@gojo/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LessonCardsManager } from "./cards-manager";
import { HomeworkManager } from "./homework-manager";
import { HomeworkSubmission } from "./homework-submission";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function LessonDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (isTeacherUser(user)) redirect(`/teacher/lessons/${id}`);

  let lesson: LessonDto;
  try {
    lesson = await fetchLesson(id);
  } catch (e) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="g-card px-6 py-8">
            <p className="text-sm font-bold text-gojo-error">
              {e instanceof ApiError ? `Урок не найден (${e.status})` : "Ошибка загрузки"}
            </p>
            <Link
              href="/lessons"
              className="mt-4 inline-block text-sm font-bold text-gojo-orange hover:underline"
            >
              ← К урокам
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let materials: LessonMaterialDto[] = [];
  try {
    materials = await fetchLessonMaterials(id);
  } catch {
    // no materials — fine
  }

  const isOwner = !!user && user.id === lesson.teacherId;
  let cards: LessonCardDto[] = [];
  let students: LessonStudentDto[] = [];
  if (isOwner) {
    try {
      cards = await fetchLessonCards(id);
    } catch {
      // none yet
    }
    try {
      students = await fetchLessonStudents(id);
    } catch {
      // none yet
    }
  }

  // Homework is only for booked students — the API 403s otherwise, which we
  // treat as "hide the section".
  let submissions: HomeworkSubmissionDto[] | null = null;
  if (user && !isOwner) {
    try {
      submissions = await fetchMySubmissions(id);
    } catch {
      submissions = null;
    }
  }

  const starts = new Date(lesson.startsAt);
  const ends = new Date(lesson.endsAt);
  const durationMin = Math.round((ends.getTime() - starts.getTime()) / 60000);

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/lessons" className="text-sm font-bold text-gojo-orange hover:underline">
          ← К урокам
        </Link>

        <div className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            {lesson.status === "completed" ? "Завершён" : "Запланирован"}
          </div>
          <h1 className="mt-2 font-serif text-[32px] font-bold">{lesson.title}</h1>
          <p className="mt-2 text-sm text-gojo-ink-muted">
            {lesson.teacherNickname ?? "Teacher"} ·{" "}
            <LocalTime
              iso={lesson.startsAt}
              options={{
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              }}
            />{" "}
            · {durationMin} мин
          </p>
        </div>

        {/* Video recording (Task #5) */}
        {lesson.recordingUrl ? (
          <section className="mt-10">
            <h2 className="font-serif text-[22px] font-bold">Запись урока</h2>
            <div className="mt-4 overflow-hidden rounded-lg bg-gojo-ink shadow-[0_2px_16px_rgba(0,0,0,0.15)]">
              <video
                src={lesson.recordingUrl}
                controls
                className="w-full"
                controlsList="nodownload"
                playsInline
              >
                <track kind="captions" />
              </video>
            </div>
          </section>
        ) : lesson.status === "completed" ? (
          <div className="mt-10 rounded-lg border border-black/10 bg-gojo-paper-2 px-5 py-6 text-center text-sm text-gojo-ink-muted">
            Запись обрабатывается. Обычно это занимает до 30 минут.
          </div>
        ) : null}

        {/* Join room — gated by joinState */}
        {user && lesson.joinState === "joinable" ? (
          <div className="mt-8">
            <Link href={`/lessons/${id}/room`} className="g-btn-primary inline-flex text-sm">
              Войти в урок ▸
            </Link>
          </div>
        ) : user && lesson.joinState === "waiting" && lesson.joinOpensAt ? (
          <div className="mt-8 rounded-md border border-black/10 bg-gojo-paper-2 px-5 py-4">
            <div className="text-[13px] font-bold text-gojo-ink">
              Вход откроется за 15 минут до начала
            </div>
            <div className="mt-1">
              <LessonCountdown target={lesson.joinOpensAt} label="Откроется через" />
            </div>
          </div>
        ) : user && lesson.joinState === "bookable" ? (
          <div className="mt-8 text-sm text-gojo-ink-muted">
            <Link href="/lessons" className="font-bold text-gojo-orange hover:underline">
              Записаться
            </Link>{" "}
            на урок — он появится в «Мои уроки» и откроется по расписанию.
          </div>
        ) : null}

        {isOwner ? <LessonCardsManager lessonId={id} initialCards={cards} /> : null}
        {isOwner ? <HomeworkManager lessonId={id} initialStudents={students} /> : null}
        {submissions !== null ? (
          <HomeworkSubmission lessonId={id} initialSubmissions={submissions} />
        ) : null}

        {/* Materials (Task #7) */}
        <section className="mt-10">
          <h2 className="font-serif text-[22px] font-bold">Материалы</h2>
          {materials.length === 0 ? (
            <p className="mt-3 text-sm text-gojo-ink-muted">Материалы пока не добавлены.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {materials.map((m) => (
                <li
                  key={m.id}
                  className="g-card flex items-center justify-between p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{m.title}</p>
                    <p className="text-[11px] text-gojo-ink-muted">
                      {m.fileType} · {new Date(m.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 shrink-0 rounded-md border border-black/10 bg-gojo-surface px-3 py-1.5 text-[11px] font-bold transition-colors hover:border-gojo-orange hover:text-gojo-orange"
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
