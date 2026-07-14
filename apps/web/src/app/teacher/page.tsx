import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { StudentDirectoryEntry, TeacherLessonDto } from "@/lib/api";
import { fetchStudentDirectory, fetchTeacherLessons } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cancelLessonAction } from "./actions";
import { CreateLessonForm } from "./create-form";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  let lessons: TeacherLessonDto[] = [];
  let students: StudentDirectoryEntry[] = [];
  let error: string | null = null;
  try {
    [lessons, students] = await Promise.all([fetchTeacherLessons(), fetchStudentDirectory()]);
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
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-[28px] font-bold">Мои уроки</h1>
          <Link href="/teacher/students" className={buttonVariants({ variant: "outline" })}>
            Мои студенты ▸
          </Link>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Lessons list */}
          <div>
            {error ? (
              <Alert variant="destructive" className="bg-gojo-error-soft">
                <AlertDescription className="font-bold text-gojo-error">{error}</AlertDescription>
              </Alert>
            ) : scheduled.length === 0 ? (
              <Card className="px-5 py-10 text-center text-gojo-ink-muted">
                Нет запланированных уроков. Создай первый →
              </Card>
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
                      <Link
                        href={`/teacher/lessons/${l.id}`}
                        className="shrink-0 text-xs font-bold text-gojo-orange hover:underline"
                      >
                        Управлять ▸
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {/* Create form */}
          <CreateLessonForm students={students} />
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
    <li>
      <Card className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-gojo-ink-muted">
              {fmt.format(starts)} · {durationMin} мин
            </span>
            <h3 className="mt-1 font-serif text-[18px] font-bold">{lesson.title}</h3>
            <div className="mt-2 flex items-center gap-3">
              <Badge variant="secondary">{lesson.studentCount} студ.</Badge>
              <a
                href={`/teacher/lessons/${lesson.id}`}
                className="text-sm font-bold text-gojo-orange hover:underline"
              >
                Управлять ▸
              </a>
              {lesson.meetingUrl ? (
                <a
                  href={lesson.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-gojo-orange hover:underline"
                >
                  Войти ▸
                </a>
              ) : null}
            </div>
          </div>
          <form action={cancelLessonAction}>
            <Input type="hidden" name="lessonId" value={lesson.id} />
            <Button type="submit" variant="destructive" size="sm">
              Отменить
            </Button>
          </form>
        </div>
      </Card>
    </li>
  );
}
