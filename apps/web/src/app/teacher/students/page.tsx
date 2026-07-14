import { Avatar } from "@/components/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError, type TeacherStudentDto, fetchTeacherStudents } from "@/lib/api";
import { quizLevelLabel } from "@/lib/quiz-level";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  let students: TeacherStudentDto[] = [];
  let error: string | null = null;
  try {
    students = await fetchTeacherStudents();
  } catch (e) {
    error = e instanceof ApiError ? `API ${e.status}: ${e.message}` : "Ошибка загрузки";
  }

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/teacher" className="text-sm font-bold text-gojo-orange hover:underline">
          ← К урокам
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
              Панель учителя
            </div>
            <h1 className="mt-2 font-serif text-[28px] font-bold">Мои студенты</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-black/10 bg-gojo-surface px-4 py-2 text-sm font-bold">
              {students.length} всего
            </div>
            <Link href="/teacher/students/new" className={buttonVariants()}>
              + Новый студент
            </Link>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-8 bg-gojo-error-soft">
            <AlertDescription className="font-bold text-gojo-error">{error}</AlertDescription>
          </Alert>
        ) : students.length === 0 ? (
          <Card className="mt-8 px-5 py-10 text-center text-gojo-ink-muted">
            Студенты появятся здесь после первой брони урока.
          </Card>
        ) : (
          <ul className="mt-8 space-y-3">
            {students.map((s) => (
              <Card
                key={s.studentId}
                asChild
                className="flex-row flex-wrap items-center justify-between gap-4 p-4"
              >
                <li>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar value={s.avatarUrl} size={42} fallback={s.nickname ?? s.email} />
                    <div className="min-w-0">
                      <Link
                        href={`/teacher/students/${s.studentId}`}
                        className="truncate font-bold hover:text-gojo-orange"
                      >
                        {s.nickname ?? s.email}
                      </Link>
                      <div className="truncate text-[12px] text-gojo-ink-muted">{s.email}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold">
                    <Badge variant="secondary">
                      {s.attendedCount}/{s.lessonCount} уроков
                    </Badge>
                    <PaymentPill student={s} />
                    <span className="rounded-sm border border-black/10 px-2 py-1 text-gojo-ink-muted">
                      JLPT: {s.jlptLevel ?? "не выставлен"}
                    </span>
                    {s.quizLevel ? (
                      <span className="rounded-sm border border-black/10 px-2 py-1 text-gojo-ink-muted">
                        Квиз: {quizLevelLabel(s.quizLevel)}
                      </span>
                    ) : null}
                    <span className="rounded-sm border border-black/10 px-2 py-1 text-gojo-ink-muted">
                      {s.lastLessonAt
                        ? `Последний: ${new Date(s.lastLessonAt).toLocaleDateString("ru-RU")}`
                        : "Без уроков"}
                    </span>
                  </div>
                </li>
              </Card>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function PaymentPill({ student }: { student: TeacherStudentDto }) {
  if (!student.isActive) {
    return (
      <span className="rounded-sm border border-gojo-error/40 bg-gojo-error-soft px-2 py-1 text-gojo-error">
        нет оплаты
      </span>
    );
  }
  const label = student.activeUntil
    ? `до ${new Date(student.activeUntil).toLocaleDateString("ru-RU")}`
    : `${student.lessonCredits} ур. осталось`;
  return <span className="rounded-sm bg-gojo-orange px-2 py-1 text-white">{label}</span>;
}
