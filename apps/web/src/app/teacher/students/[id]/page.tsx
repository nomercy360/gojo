import { Avatar } from "@/components/avatar";
import { LocalTime } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  ApiError,
  type TeacherStudentProfileDto,
  fetchPaymentPlans,
  fetchTeacherStudentProfile,
} from "@/lib/api";
import { quizLevelLabel } from "@/lib/quiz-level";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setStudentPlanAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherStudentProfilePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  const { id } = await params;
  let profile: TeacherStudentProfileDto;
  try {
    profile = await fetchTeacherStudentProfile(id);
  } catch (e) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <Card className="px-6 py-8">
            <p className="text-sm font-bold text-gojo-error">
              {e instanceof ApiError ? `API ${e.status}: ${e.message}` : "Ошибка загрузки"}
            </p>
            <Link
              href="/teacher/students"
              className="mt-4 inline-block text-sm font-bold text-gojo-orange hover:underline"
            >
              ← К студентам
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  const student = profile.student;
  const plans = await fetchPaymentPlans();

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/teacher/students"
          className="text-sm font-bold text-gojo-orange hover:underline"
        >
          ← К студентам
        </Link>

        <Card asChild className="mt-6 p-5">
          <section>
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
                  {student.quizLevel ? quizLevelLabel(student.quizLevel) : "нет"}
                </p>
              </div>
            </div>
          </section>
        </Card>

        <Card asChild className="mt-6 p-5">
          <section>
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
              Тариф
            </div>
            <p className="mt-2 text-sm text-gojo-ink-muted">
              Текущий:{" "}
              <span className="font-bold text-gojo-ink">
                {plans.find((p) => p.id === student.assignedPlanId)?.title ?? "не назначен"}
              </span>
            </p>
            <form action={setStudentPlanAction} className="mt-4 flex flex-wrap items-center gap-3">
              <Input type="hidden" name="studentId" value={student.id} />
              <NativeSelect
                key={student.assignedPlanId ?? ""}
                name="planId"
                defaultValue={student.assignedPlanId ?? ""}
                className="max-w-sm"
              >
                <option value="" disabled>
                  Выбери тариф
                </option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title} — {Number(plan.amountValue).toLocaleString("ru-RU")} ₽
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" variant="outline">
                Сохранить тариф
              </Button>
            </form>
          </section>
        </Card>

        <Card asChild className="mt-6 p-5">
          <section>
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
              Статус оплаты
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <StatusTile label="Доступ" value={profile.access.isActive ? "Активен" : "Нет"} />
              <StatusTile
                label="До"
                value={
                  profile.access.activeUntil
                    ? new Date(profile.access.activeUntil).toLocaleDateString("ru-RU")
                    : "—"
                }
              />
              <StatusTile label="Уроки" value={String(profile.access.lessonCredits)} />
            </div>

            {profile.payments.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {profile.payments.slice(0, 5).map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-gojo-paper px-3 py-2 text-sm"
                  >
                    <span className="text-gojo-ink-muted">
                      {new Date(payment.createdAt).toLocaleDateString("ru-RU")} · {payment.planId}
                    </span>
                    <span className="font-bold">
                      {Number(payment.amountValue).toLocaleString("ru-RU")} ₽ · {payment.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gojo-ink-muted">Платежей пока нет.</p>
            )}
          </section>
        </Card>

        <Card asChild className="mt-6 p-5">
          <section>
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
              Прогресс по урокам
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <StatusTile label="Посещено" value={String(profile.progress.attended)} />
              <StatusTile label="Пропущено" value={String(profile.progress.noShow)} />
              <StatusTile label="Всего" value={String(profile.progress.total)} />
            </div>
          </section>
        </Card>

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
                          href={`/teacher?lesson=${lesson.lessonId}`}
                          className="font-bold hover:text-gojo-orange"
                        >
                          {lesson.title}
                        </Link>
                        <div className="mt-1 text-[12px] text-gojo-ink-muted">
                          <LocalTime
                            iso={lesson.startsAt}
                            options={{
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }}
                            showTimeZone
                          />{" "}
                          · {lesson.status}
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

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gojo-paper px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gojo-ink-muted">
        {label}
      </div>
      <div className="mt-1 font-serif text-[22px] font-bold">{value}</div>
    </div>
  );
}
