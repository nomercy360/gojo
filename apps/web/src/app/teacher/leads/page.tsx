import { ApiError, type TeacherLeadDto, fetchTeacherLeads } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTrialLessonAction, updateLeadAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = ["new", "contacted", "trial_booked", "trial_done", "converted", "lost"];

const STATUS_LABEL: Record<string, string> = {
  new: "Новая",
  contacted: "Связались",
  trial_booked: "Пробный назначен",
  trial_done: "Пробный проведён",
  converted: "Оплатил",
  lost: "Потерян",
};

export default async function TeacherLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  const { status } = await searchParams;
  let leads: TeacherLeadDto[] = [];
  let error: string | null = null;
  try {
    leads = await fetchTeacherLeads(status);
  } catch (e) {
    error = e instanceof ApiError ? `API ${e.status}: ${e.message}` : "Ошибка загрузки";
  }

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link href="/teacher" className="text-sm font-bold text-gojo-orange hover:underline">
          ← К урокам
        </Link>
        <div className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            CRM
          </div>
          <h1 className="mt-2 font-serif text-[32px] font-bold">Заявки</h1>
          <p className="mt-2 max-w-2xl text-sm text-gojo-ink-muted">
            Статусы, заметки, follow-up и создание пробного урока из заявки.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Filter href="/teacher/leads" active={!status}>
            Все
          </Filter>
          {STATUSES.map((s) => (
            <Filter key={s} href={`/teacher/leads?status=${s}`} active={status === s}>
              {STATUS_LABEL[s]}
            </Filter>
          ))}
        </div>

        {error ? (
          <div className="mt-8 rounded-lg border border-gojo-error/40 bg-gojo-error-soft px-5 py-4 text-sm font-bold text-gojo-error">
            {error}
          </div>
        ) : leads.length === 0 ? (
          <div className="g-card mt-8 px-5 py-10 text-center text-gojo-ink-muted">
            Заявок в этом статусе нет.
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Filter({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-1.5 text-[12px] font-bold ${
        active
          ? "border-transparent bg-gojo-ink text-white"
          : "border-black/10 bg-gojo-surface text-gojo-ink-muted hover:border-black/20"
      }`}
    >
      {children}
    </Link>
  );
}

function LeadCard({ lead }: { lead: TeacherLeadDto }) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return (
    <li className="g-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-gojo-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
              {STATUS_LABEL[lead.status] ?? lead.status}
            </span>
            <span className="text-[11px] font-bold text-gojo-ink-muted">{lead.kind}</span>
            {lead.userId ? (
              <span className="text-[11px] font-bold text-gojo-success">аккаунт связан</span>
            ) : null}
          </div>
          <h2 className="mt-2 font-serif text-[24px] font-bold">{lead.name}</h2>
          <p className="mt-1 text-sm text-gojo-ink-muted">
            {lead.email}
            {lead.contact ? ` · ${lead.contact}` : ""}
          </p>
          <p className="mt-2 text-sm text-gojo-ink-soft">
            {[lead.level, lead.goal].filter(Boolean).join(" · ") || "Без деталей"}
          </p>
          {lead.trialLessonId ? (
            <Link
              href={`/teacher/lessons/${lead.trialLessonId}`}
              className="mt-3 inline-block text-sm font-bold text-gojo-orange hover:underline"
            >
              Открыть пробный урок ▸
            </Link>
          ) : null}
        </div>

        <form action={updateLeadAction} className="grid min-w-[280px] gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <select
            name="status"
            defaultValue={lead.status}
            className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm font-bold"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            name="nextFollowUpAt"
            type="datetime-local"
            defaultValue={lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 16) : ""}
            className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm"
          />
          <textarea
            name="notes"
            defaultValue={lead.notes ?? ""}
            placeholder="Заметки / следующий шаг"
            className="min-h-20 rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-black/10 bg-gojo-surface-2 px-3 py-2 text-sm font-bold hover:bg-gojo-surface"
          >
            Сохранить
          </button>
        </form>
      </div>

      {!lead.trialLessonId ? (
        <form
          action={createTrialLessonAction}
          className="mt-5 grid gap-3 border-t pt-4 md:grid-cols-5"
        >
          <input type="hidden" name="leadId" value={lead.id} />
          <input
            name="title"
            defaultValue={`Пробный урок · ${lead.name}`}
            className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="date"
            type="date"
            defaultValue={tomorrow}
            className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm"
          />
          <input
            name="time"
            type="time"
            defaultValue="19:00"
            className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm"
          />
          <select
            name="duration"
            defaultValue="50"
            className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm"
          >
            <option value="30">30 мин</option>
            <option value="50">50 мин</option>
            <option value="60">60 мин</option>
          </select>
          <button
            type="submit"
            className="g-btn-primary text-sm md:col-span-5"
          >
            Создать пробный урок
          </button>
        </form>
      ) : null}
    </li>
  );
}
