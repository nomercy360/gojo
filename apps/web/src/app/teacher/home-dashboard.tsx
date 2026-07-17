"use client";

import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeacherLeadDto, TeacherLessonDto } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  type Inbox,
  Plus,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { type TeacherActionState, updateMeetingUrlAction } from "./actions";
import type { DashboardStudent } from "./admin-workspace";

const DAY_MS = 86_400_000;
const ACCESS_RISK_DAYS = 7;

/**
 * Triage home: today's schedule plus queues of unclosed work. Every item
 * links into the existing detail surfaces (lesson route, lead/student
 * sheets) — the only inline edit is pasting a missing meeting link.
 */
export function HomeDashboard({
  lessons,
  students,
  leads,
  onNewLesson,
  onOpenLead,
  onOpenStudent,
  onOpenLesson,
  onBrowse,
}: {
  lessons: TeacherLessonDto[];
  students: DashboardStudent[];
  leads: TeacherLeadDto[];
  onNewLesson: () => void;
  onOpenLead: (lead: TeacherLeadDto) => void;
  onOpenStudent: (student: DashboardStudent) => void;
  onOpenLesson: (lesson: TeacherLessonDto) => void;
  onBrowse: (collection: "students" | "lessons" | "leads") => void;
}) {
  // Day bucketing depends on the browser timezone, so compute after mount to
  // keep SSR and hydration output identical (same trick as LocalTime).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const derived = useMemo(() => {
    if (!now) return null;
    const todayLessons = lessons
      .filter((l) => l.status !== "cancelled" && isSameLocalDay(new Date(l.startsAt), now))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const unprocessed = lessons
      .filter(
        (l) =>
          l.status !== "cancelled" &&
          new Date(l.endsAt).getTime() < now.getTime() &&
          l.pendingAttendance + l.pendingHomework > 0,
      )
      .sort((a, b) => b.endsAt.localeCompare(a.endsAt));
    const staleLeads = leads.filter(
      (lead) =>
        !["converted", "lost"].includes(lead.status) &&
        (lead.status === "new" ||
          (lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() <= now.getTime())),
    );
    const accessRisk = students.filter((s) => {
      if (!s.isActive) return true;
      if (s.activeUntil) {
        return new Date(s.activeUntil).getTime() - now.getTime() <= ACCESS_RISK_DAYS * DAY_MS;
      }
      return s.lessonCredits > 0 && s.lessonCredits <= 1;
    });
    return { todayLessons, unprocessed, staleLeads, accessRisk };
  }, [lessons, leads, students, now]);

  const newLeadCount = leads.filter((lead) => lead.status === "new").length;
  const activeStudentCount = students.filter((s) => s.isActive).length;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-5 py-7 sm:px-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="g-mono text-[10px] font-bold uppercase tracking-[0.16em] text-gojo-ink-ghost">
              Рабочее пространство
            </div>
            <h1 className="mt-1 font-serif text-3xl font-bold" suppressHydrationWarning>
              Сегодня{now ? ` · ${formatDayLabel(now)}` : ""}
            </h1>
          </div>
          <Button onClick={onNewLesson}>
            <Plus />
            Новый урок
          </Button>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Уроков сегодня" value={derived ? derived.todayLessons.length : 0} />
          <MetricCard label="Активных студентов" value={activeStudentCount} />
          <MetricCard label="Новых заявок" value={newLeadCount} accent={newLeadCount > 0} />
        </div>

        <section className="mt-8">
          <SectionTitle icon={CalendarDays}>Расписание</SectionTitle>
          {!derived || derived.todayLessons.length === 0 ? (
            <EmptyNote text="На сегодня уроков нет." />
          ) : (
            <div className="mt-3 divide-y divide-gojo-ink/8 rounded-2xl border border-gojo-ink/10 bg-gojo-paper">
              {derived.todayLessons.map((lesson) => (
                <ScheduleRow key={lesson.id} lesson={lesson} onOpen={onOpenLesson} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 pb-10">
          <SectionTitle icon={ClipboardList}>Требует внимания</SectionTitle>
          {derived &&
          derived.unprocessed.length + derived.staleLeads.length + derived.accessRisk.length ===
            0 ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gojo-success/20 bg-gojo-success-soft px-5 py-4 text-sm font-bold text-gojo-success">
              <CheckCircle2 className="size-5 shrink-0" />
              Всё закрыто — хвостов нет.
            </div>
          ) : (
            <div className="mt-3 divide-y divide-gojo-ink/8 rounded-2xl border border-gojo-ink/10 bg-gojo-paper">
              <QueueSection
                title="Уроки без обработки"
                subtitle="не отмечена домашка · посещение"
                count={derived?.unprocessed.length ?? 0}
                tone="red"
                onShowAll={() => onBrowse("lessons")}
              >
                {derived?.unprocessed.slice(0, 8).map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onOpenLesson(lesson)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-gojo-ink/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {lesson.title}
                        {lesson.studentNames ? (
                          <span className="font-semibold text-gojo-ink-muted">
                            {" "}
                            · {lesson.studentNames}
                          </span>
                        ) : null}
                      </span>
                      <LocalTime
                        iso={lesson.startsAt}
                        options={{
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }}
                        className="text-xs text-gojo-ink-muted"
                      />
                    </span>
                    <span className="flex shrink-0 gap-1.5">
                      {lesson.pendingAttendance > 0 ? (
                        <Badge variant="outline">посещение · {lesson.pendingAttendance}</Badge>
                      ) : null}
                      {lesson.pendingHomework > 0 ? (
                        <Badge variant="outline">домашка · {lesson.pendingHomework}</Badge>
                      ) : null}
                    </span>
                  </button>
                ))}
              </QueueSection>

              <QueueSection
                title="Заявки без контакта"
                subtitle="новые + просроченный «следующий контакт»"
                count={derived?.staleLeads.length ?? 0}
                tone="blue"
                onShowAll={() => onBrowse("leads")}
              >
                {derived?.staleLeads.slice(0, 8).map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onOpenLead(lead)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-gojo-ink/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{lead.name}</span>
                      <span className="block truncate text-xs text-gojo-ink-muted">
                        {lead.email ??
                          (lead.telegram ? `@${lead.telegram}` : lead.phone) ??
                          "Без контакта"}
                      </span>
                    </span>
                    <span className="shrink-0">
                      {lead.status === "new" ? (
                        <Badge>Новая</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gojo-error">
                          контакт просрочен
                        </Badge>
                      )}
                    </span>
                  </button>
                ))}
              </QueueSection>

              <QueueSection
                title="Доступ / оплата под риском"
                subtitle="истекает доступ или нет доступа"
                count={derived?.accessRisk.length ?? 0}
                tone="amber"
                onShowAll={() => onBrowse("students")}
              >
                {derived?.accessRisk.slice(0, 8).map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => onOpenStudent(student)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-gojo-ink/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {student.nickname ?? student.name}
                      </span>
                      <span className="block truncate text-xs text-gojo-ink-muted">
                        {student.email}
                      </span>
                    </span>
                    <span className="shrink-0">
                      {!student.isActive ? (
                        <Badge variant="destructive">Нет доступа</Badge>
                      ) : student.activeUntil ? (
                        <Badge variant="outline" className="text-gojo-error">
                          до {formatShortDate(student.activeUntil)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gojo-error">
                          {student.lessonCredits} ур. осталось
                        </Badge>
                      )}
                    </span>
                  </button>
                ))}
              </QueueSection>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ScheduleRow({
  lesson,
  onOpen,
}: {
  lesson: TeacherLessonDto;
  onOpen: (lesson: TeacherLessonDto) => void;
}) {
  const [editingLink, setEditingLink] = useState(false);
  const duration = Math.round(
    (new Date(lesson.endsAt).getTime() - new Date(lesson.startsAt).getTime()) / 60000,
  );

  return (
    <div className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <LocalTime
          iso={lesson.startsAt}
          options={{ hour: "2-digit", minute: "2-digit" }}
          className="w-14 shrink-0 font-serif text-xl font-bold"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">
            {lesson.title}
            {lesson.studentNames ? (
              <span className="font-semibold text-gojo-ink-muted"> · {lesson.studentNames}</span>
            ) : null}
          </div>
          <div className="text-xs text-gojo-ink-muted">
            {duration} минут ·{" "}
            <LocalTime
              iso={lesson.startsAt}
              options={{ hour: "2-digit", minute: "2-digit", timeZoneName: "short" }}
              className="text-xs"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lesson.meetingUrl ? (
            <a
              href={lesson.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-gojo-success-soft px-3 py-1.5 text-xs font-bold text-gojo-success transition hover:brightness-95"
            >
              <Video className="size-3.5" />
              Войти
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setEditingLink((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-gojo-orange-soft px-3 py-1.5 text-xs font-bold text-gojo-orange transition hover:brightness-95"
            >
              <Video className="size-3.5" />
              нет ссылки
            </button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => onOpen(lesson)}>
            Открыть
          </Button>
        </div>
      </div>
      {editingLink && !lesson.meetingUrl ? (
        <InlineMeetingLinkForm lessonId={lesson.id} onDone={() => setEditingLink(false)} />
      ) : null}
    </div>
  );
}

function InlineMeetingLinkForm({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    updateMeetingUrlAction,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Ссылка сохранена");
    router.refresh();
    onDone();
  }, [state.ok, router, onDone]);

  return (
    <form action={formAction} className="mt-3 flex items-center gap-2">
      <Input type="hidden" name="lessonId" value={lessonId} />
      <Input
        name="meetingUrl"
        type="url"
        required
        autoFocus
        placeholder="https://zoom.us/j/..."
        className="h-9 flex-1"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить"}
      </Button>
      {state.error ? (
        <span className="text-xs font-bold text-gojo-error">{state.error}</span>
      ) : null}
    </form>
  );
}

function QueueSection({
  title,
  subtitle,
  count,
  tone,
  onShowAll,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  tone: "red" | "blue" | "amber";
  onShowAll: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toneClass =
    tone === "red"
      ? "bg-gojo-error-soft text-gojo-error"
      : tone === "blue"
        ? "bg-gojo-ink/8 text-gojo-ink"
        : "bg-gojo-orange-soft text-gojo-orange";

  return (
    <div>
      <button
        type="button"
        onClick={() => count > 0 && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5",
          count > 0 ? "transition hover:bg-gojo-ink/4" : "cursor-default",
        )}
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{title}</span>
          <span className="block truncate text-xs text-gojo-ink-muted">{subtitle}</span>
        </span>
        {count === 0 ? (
          <CheckCircle2 className="size-4 shrink-0 text-gojo-success" />
        ) : (
          <>
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                toneClass,
              )}
            >
              {count}
            </span>
            <ChevronDown
              className={cn("size-4 shrink-0 text-gojo-ink-muted transition", open && "rotate-180")}
            />
          </>
        )}
      </button>
      {open && count > 0 ? (
        <div className="space-y-0.5 px-2 pb-3 sm:px-3">
          {children}
          {count > 8 ? (
            <button
              type="button"
              onClick={onShowAll}
              className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-gojo-orange transition hover:bg-gojo-ink/5"
            >
              Показать все ({count}) →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Inbox;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 font-serif text-lg font-bold">
      <Icon className="size-4 text-gojo-orange" />
      {children}
    </h2>
  );
}

function MetricCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gojo-ink/10 bg-gojo-paper px-5 py-4">
      <div className="text-sm text-gojo-ink-muted">{label}</div>
      <div
        className={cn("mt-1 font-serif text-3xl font-bold", accent && "text-gojo-orange")}
        suppressHydrationWarning
      >
        {value}
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-gojo-ink/15 px-5 py-6 text-sm text-gojo-ink-muted">
      {text}
    </div>
  );
}

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
}
