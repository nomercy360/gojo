import { type AdminSummaryDto, ApiError, fetchAdminSummary } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/teacher");

  let summary: AdminSummaryDto;
  try {
    summary = await fetchAdminSummary();
  } catch (e) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="g-card px-6 py-8">
            <p className="text-sm font-bold text-gojo-error">
              {e instanceof ApiError ? `API ${e.status}: ${e.message}` : "Ошибка загрузки"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Admin
        </div>
        <h1 className="mt-2 font-serif text-[32px] font-bold">Операционный дашборд</h1>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <Metric label="Выручка" value={`${summary.revenueRub.toLocaleString("ru-RU")} ₽`} />
          <Metric label="Студенты" value={String(summary.activeStudents)} />
          <Metric label="Ближайшие уроки" value={String(summary.upcomingLessons)} />
          <Metric label="Риски" value={String(summary.retentionRisks.length)} />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Lead pipeline">
            {summary.leadPipeline.map((row) => (
              <Row key={row.status} left={row.status} right={String(row.count)} />
            ))}
            <div className="mt-4 flex gap-4">
              <Link href="/teacher/leads" className="text-sm font-bold text-gojo-orange">
                Открыть заявки
              </Link>
              <Link href="/admin/students" className="text-sm font-bold text-gojo-orange">
                Создать аккаунт студента
              </Link>
            </div>
          </Panel>

          <Panel title="Retention risks">
            {summary.retentionRisks.length === 0 ? (
              <p className="text-sm text-gojo-ink-muted">Нет активных флагов.</p>
            ) : (
              summary.retentionRisks
                .slice(0, 8)
                .map((risk) => (
                  <Row
                    key={risk.studentId}
                    left={risk.nickname ?? risk.email}
                    right={risk.reasons.join(", ")}
                    href={`/teacher/students/${risk.studentId}`}
                  />
                ))
            )}
          </Panel>

          <Panel title="Teacher workload / payroll base">
            {summary.teacherWorkload.map((teacher) => (
              <Row
                key={teacher.teacherId}
                left={teacher.nickname ?? teacher.email}
                right={`${teacher.hours}ч · ${teacher.lessonCount} уроков · ${teacher.attendedCount} посещ.`}
              />
            ))}
          </Panel>

          <Panel title="Notifications">
            {summary.recentNotifications.length === 0 ? (
              <p className="text-sm text-gojo-ink-muted">Отправок пока нет.</p>
            ) : (
              summary.recentNotifications
                .slice(0, 8)
                .map((n) => (
                  <Row
                    key={n.id}
                    left={`${n.event} · ${n.status}`}
                    right={new Date(n.createdAt).toLocaleString("ru-RU")}
                  />
                ))
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="g-card p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gojo-orange">
        {label}
      </div>
      <div className="mt-2 font-serif text-[28px] font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="g-card p-5">
      <h2 className="font-serif text-[22px] font-bold">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function Row({ left, right, href }: { left: string; right: string; href?: string }) {
  const content = (
    <>
      <span className="min-w-0 truncate font-bold">{left}</span>
      <span className="shrink-0 text-gojo-ink-muted">{right}</span>
    </>
  );
  const className =
    "flex items-center justify-between gap-3 rounded-md bg-gojo-paper px-3 py-2 text-sm";
  return href ? (
    <Link href={href} className={`${className} hover:text-gojo-orange`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
