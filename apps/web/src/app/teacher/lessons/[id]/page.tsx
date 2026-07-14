import { LessonCardsManager } from "@/app/lessons/[id]/cards-manager";
import { HomeworkManager } from "@/app/lessons/[id]/homework-manager";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ApiError,
  type LessonStudentDto,
  fetchLesson,
  fetchLessonCards,
  fetchLessonMaterials,
  fetchLessonStudents,
  fetchLessonSubmissions,
} from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import type {
  LessonCardDto,
  LessonDto,
  LessonMaterialDto,
  TeacherSubmissionDto,
} from "@gojo/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MaterialUploadForm } from "./material-upload-form";
import { MeetingLinkForm } from "./meeting-link-form";
import { SubmissionsReview } from "./submissions-review";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherLessonPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  let lesson: LessonDto;
  let students: LessonStudentDto[] = [];
  let cards: LessonCardDto[] = [];
  let materials: LessonMaterialDto[] = [];
  let submissions: TeacherSubmissionDto[] = [];
  try {
    lesson = await fetchLesson(id);
    [students, cards, materials, submissions] = await Promise.all([
      fetchLessonStudents(id),
      fetchLessonCards(id),
      fetchLessonMaterials(id),
      fetchLessonSubmissions(id),
    ]);
  } catch (e) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <Card className="px-6 py-8">
            <p className="text-sm font-bold text-gojo-error">
              {e instanceof ApiError ? `Не удалось открыть урок (${e.status})` : "Ошибка загрузки"}
            </p>
            <Link
              href="/teacher"
              className="mt-4 inline-block text-sm font-bold text-gojo-orange hover:underline"
            >
              ← К панели учителя
            </Link>
          </Card>
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

        <Card className="mt-6 p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Урок учителя
          </div>
          <div className="mt-3">
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
          <MeetingLinkForm lessonId={id} meetingUrl={lesson.meetingUrl} />
        </Card>

        <section className="mt-10">
          <h2 className="font-serif text-[22px] font-bold">Студенты</h2>
          {students.length === 0 ? (
            <p className="mt-3 rounded-md border border-black/10 bg-gojo-surface px-4 py-5 text-sm text-gojo-ink-muted">
              На урок пока никто не записался.
            </p>
          ) : (
            <HomeworkManager lessonId={id} initialStudents={students} />
          )}
        </section>

        <SubmissionsReview initialSubmissions={submissions} />

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
                <Card key={m.id} asChild className="flex-row items-center justify-between p-4">
                  <li>
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
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Открыть
                    </a>
                  </li>
                </Card>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
