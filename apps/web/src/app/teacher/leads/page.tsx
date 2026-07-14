import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, type TeacherLeadDto, fetchTeacherLeads } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
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
  if (!user) redirect("/admin/login");
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
          <Alert variant="destructive" className="mt-8 bg-gojo-error-soft">
            <AlertDescription className="font-bold text-gojo-error">{error}</AlertDescription>
          </Alert>
        ) : leads.length === 0 ? (
          <Card className="mt-8 px-5 py-10 text-center text-gojo-ink-muted">
            Заявок в этом статусе нет.
          </Card>
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
      className={buttonVariants({ variant: active ? "secondary" : "outline", size: "sm" })}
    >
      {children}
    </Link>
  );
}

function LeadCard({ lead }: { lead: TeacherLeadDto }) {
  const today = formatDateInput(new Date());
  const tomorrow = formatDateInput(new Date(Date.now() + 86400000));
  return (
    <li>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
              <span className="text-[11px] font-bold text-gojo-ink-muted">{lead.kind}</span>
              {lead.userId ? (
                <span className="text-[11px] font-bold text-gojo-success">аккаунт связан</span>
              ) : null}
            </div>
            <h2 className="mt-2 font-serif text-[24px] font-bold">{lead.name}</h2>
            <p className="mt-1 text-sm text-gojo-ink-muted">
              {[lead.telegram ? `@${lead.telegram}` : null, lead.email, lead.phone]
                .filter(Boolean)
                .join(" · ") || "Без контактов"}
            </p>
            <p className="mt-2 text-sm text-gojo-ink-soft">
              {[lead.level, lead.goal].filter(Boolean).join(" · ") || "Без деталей"}
            </p>
            {lead.notes ? (
              <pre className="mt-3 max-w-xl whitespace-pre-wrap rounded-md bg-gojo-paper px-3 py-2 text-[12px] leading-relaxed text-gojo-ink-muted">
                {lead.notes}
              </pre>
            ) : null}
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
            <Input type="hidden" name="leadId" value={lead.id} />
            <NativeSelect name="status" defaultValue={lead.status} className="font-bold">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
            <Input
              name="nextFollowUpAt"
              type="datetime-local"
              defaultValue={lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 16) : ""}
            />
            <Textarea
              name="notes"
              defaultValue={lead.notes ?? ""}
              placeholder="Заметки / следующий шаг"
              className="min-h-20"
            />
            <Button type="submit" variant="secondary">
              Сохранить
            </Button>
          </form>
        </div>

        {!lead.trialLessonId ? (
          <form
            action={createTrialLessonAction}
            className="mt-5 grid gap-3 border-t pt-4 md:grid-cols-5"
          >
            <Input type="hidden" name="leadId" value={lead.id} />
            <Input
              name="title"
              defaultValue={`Пробный урок · ${lead.name}`}
              className="md:col-span-2"
            />
            <Input name="date" type="date" min={today} defaultValue={tomorrow} />
            <Input name="time" type="time" defaultValue="19:00" />
            <NativeSelect name="duration" defaultValue="50">
              <option value="30">30 мин</option>
              <option value="50">50 мин</option>
              <option value="60">60 мин</option>
            </NativeSelect>
            <Button type="submit" className="md:col-span-5">
              Создать пробный урок
            </Button>
          </form>
        ) : null}
      </Card>
    </li>
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
