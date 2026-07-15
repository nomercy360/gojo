"use client";

import { AdminAccountMenu } from "@/components/admin-account-menu";
import { Avatar } from "@/components/avatar";
import { LocalTime, TimeZoneNote } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminDirectoryEntry,
  StudentDirectoryEntry,
  TeacherLeadDto,
  TeacherLessonDto,
} from "@/lib/api";
import { quizLevelLabel } from "@/lib/quiz-level";
import { cn } from "@/lib/utils";
import type { PaymentPlanDto } from "@gojo/shared";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Inbox,
  Info,
  LayoutDashboard,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type TeacherActionState,
  cancelLessonAction,
  updateAdminAction,
  updateLessonAction,
  updateStudentAction,
} from "./actions";
import { CreateLessonForm } from "./create-form";
import { createTrialLessonAction, updateLeadAction } from "./leads/actions";
import { CreateStudentForm } from "./students/new/create-form";

export type DashboardStudent = StudentDirectoryEntry & {
  lessonCount: number;
  attendedCount: number;
  lastLessonAt: string | null;
  activeUntil: string | null;
  lessonCredits: number;
  isActive: boolean;
};

type Collection = "students" | "lessons" | "leads" | "admins";
type Panel =
  | { kind: "new-student" }
  | { kind: "new-lesson" }
  | { kind: "student"; record: DashboardStudent }
  | { kind: "lesson"; record: TeacherLessonDto }
  | { kind: "lead"; record: TeacherLeadDto }
  | { kind: "admin"; record: AdminDirectoryEntry }
  | null;

const LESSON_STATUS: Record<string, string> = {
  scheduled: "Запланирован",
  in_progress: "Идёт сейчас",
  completed: "Завершён",
  cancelled: "Отменён",
};

const LEAD_STATUS: Record<string, string> = {
  new: "Новая",
  contacted: "Связались",
  trial_booked: "Пробный назначен",
  trial_done: "Пробный проведён",
  converted: "Оплатил",
  lost: "Потерян",
};

const LEAD_STATUSES = Object.keys(LEAD_STATUS);

export function AdminWorkspace({
  students,
  lessons,
  leads,
  admins,
  directory,
  plans,
  error,
  currentUser,
  initialCollection = "students",
  initialPanel,
}: {
  students: DashboardStudent[];
  lessons: TeacherLessonDto[];
  leads: TeacherLeadDto[];
  admins: AdminDirectoryEntry[];
  directory: StudentDirectoryEntry[];
  plans: PaymentPlanDto[];
  error?: string | null;
  currentUser: { email: string; nickname: string | null; avatarUrl: string | null };
  initialCollection?: Collection;
  initialPanel?: "new-student" | "new-lesson";
}) {
  const router = useRouter();
  const [collection, setCollection] = useState<Collection>(initialCollection);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(
    initialPanel === "new-student"
      ? { kind: "new-student" }
      : initialPanel === "new-lesson"
        ? { kind: "new-lesson" }
        : null,
  );

  useEffect(() => setCollection(initialCollection), [initialCollection]);

  const selectCollection = (next: Collection) => {
    setCollection(next);
    setQuery("");
    setPanel(null);
    router.replace(`/teacher?collection=${next}`, { scroll: false });
  };
  const closePanel = useCallback(() => setPanel(null), []);

  const filteredStudents = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru");
    if (!term) return students;
    return students.filter((student) =>
      [student.name, student.nickname, student.email, student.jlptLevel, student.quizLevel]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("ru").includes(term)),
    );
  }, [query, students]);

  const filteredLessons = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru");
    if (!term) return lessons;
    return lessons.filter((lesson) =>
      [lesson.title, LESSON_STATUS[lesson.status], formatDateTime(lesson.startsAt)]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("ru").includes(term)),
    );
  }, [lessons, query]);

  const filteredLeads = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru");
    if (!term) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.email, lead.telegram, lead.phone, lead.goal, LEAD_STATUS[lead.status]]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("ru").includes(term)),
    );
  }, [leads, query]);

  const filteredAdmins = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru");
    if (!term) return admins;
    return admins.filter((admin) =>
      [admin.name, admin.nickname, admin.email, admin.id]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("ru").includes(term)),
    );
  }, [admins, query]);

  const isStudents = collection === "students";
  const isLessons = collection === "lessons";
  const isLeads = collection === "leads";
  const isAdmins = collection === "admins";
  const collectionLabel = isStudents
    ? "Студенты"
    : isLessons
      ? "Уроки"
      : isLeads
        ? "Заявки"
        : "Администраторы";
  const visibleCount = isStudents
    ? filteredStudents.length
    : isLessons
      ? filteredLessons.length
      : isLeads
        ? filteredLeads.length
        : filteredAdmins.length;
  const totalCount = isStudents
    ? students.length
    : isLessons
      ? lessons.length
      : isLeads
        ? leads.length
        : admins.length;

  return (
    <main className="min-h-screen bg-gojo-surface">
      <div className="flex min-h-screen w-full flex-col bg-gojo-surface lg:flex-row">
        <aside className="flex shrink-0 flex-col border-b border-gojo-ink/10 bg-gojo-ink text-white lg:w-64 lg:border-b-0 lg:border-r">
          <div className="hidden border-b border-white/10 px-5 py-6 lg:block">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-gojo-orange text-white">
                <LayoutDashboard className="size-4" />
              </div>
              <div>
                <div className="text-sm font-bold">Gojo Admin</div>
                <div className="g-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
                  Рабочее пространство
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:flex-1 lg:space-y-1 lg:p-4">
            <div className="hidden px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35 lg:block">
              Коллекции
            </div>
            <CollectionButton
              active={collection === "students"}
              icon={UsersRound}
              count={students.length}
              onClick={() => selectCollection("students")}
            >
              Студенты
            </CollectionButton>
            <CollectionButton
              active={collection === "lessons"}
              icon={CalendarDays}
              count={lessons.length}
              onClick={() => selectCollection("lessons")}
            >
              Уроки
            </CollectionButton>
            <CollectionButton
              active={collection === "leads"}
              icon={Inbox}
              count={leads.length}
              onClick={() => selectCollection("leads")}
            >
              Заявки
            </CollectionButton>
            <div className="mx-2 hidden border-t border-white/10 pt-5 lg:mt-6 lg:block">
              <div className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                Система
              </div>
            </div>
            <CollectionButton
              active={collection === "admins"}
              icon={ShieldCheck}
              count={admins.length}
              onClick={() => selectCollection("admins")}
            >
              Администраторы
            </CollectionButton>
          </div>

          <div className="hidden border-t border-white/10 p-3 lg:block">
            <AdminAccountMenu user={currentUser} placement="top" dark />
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-4 border-b border-gojo-ink/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gojo-ink-muted">
                {isAdmins ? "Система" : "Коллекции"} <ChevronRight className="size-3.5" />
                <span className="text-gojo-ink">{collectionLabel}</span>
              </div>
              <h1 className="mt-1 font-serif text-3xl font-bold">{collectionLabel}</h1>
            </div>
            {isStudents || isLessons ? (
              <Button onClick={() => setPanel({ kind: isStudents ? "new-student" : "new-lesson" })}>
                <Plus />
                {isStudents ? "Новый студент" : "Новый урок"}
              </Button>
            ) : null}
          </header>

          <div className="border-b border-gojo-ink/10 px-5 py-4 sm:px-7">
            <div className="relative max-w-2xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gojo-ink-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  isStudents
                    ? "Поиск по имени, email или уровню..."
                    : isLessons
                      ? "Поиск по урокам..."
                      : isLeads
                        ? "Поиск по имени, контакту или цели..."
                        : "Поиск по имени, email или ID..."
                }
                className="bg-gojo-paper/60 pl-10"
              />
            </div>
          </div>

          {error ? (
            <div className="m-5 rounded-lg border border-gojo-error/20 bg-gojo-error-soft p-4 text-sm font-bold text-gojo-error sm:m-7">
              {error}
            </div>
          ) : isStudents ? (
            <StudentsTable
              students={filteredStudents}
              onSelect={(record) => setPanel({ kind: "student", record })}
            />
          ) : isLessons ? (
            <LessonsTable
              lessons={filteredLessons}
              onSelect={(record) => setPanel({ kind: "lesson", record })}
            />
          ) : isLeads ? (
            <LeadsTable
              leads={filteredLeads}
              onSelect={(record) => setPanel({ kind: "lead", record })}
            />
          ) : (
            <AdminsTable
              admins={filteredAdmins}
              onSelect={(record) => setPanel({ kind: "admin", record })}
            />
          )}

          <footer className="mt-auto flex items-center justify-between border-t border-gojo-ink/10 px-5 py-3 text-xs text-gojo-ink-muted sm:px-7">
            <span>Показано: {visibleCount}</span>
            <span>Всего: {totalCount}</span>
          </footer>
        </section>
      </div>

      <RecordSheet panel={panel} plans={plans} directory={directory} onClose={closePanel} />
    </main>
  );
}

function CollectionButton({
  active,
  icon: Icon,
  count,
  onClick,
  children,
}: {
  active: boolean;
  icon: typeof UsersRound;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition lg:w-full",
        active ? "bg-white text-gojo-ink" : "text-white/60 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className={cn("size-4", active && "text-gojo-orange")} />
      <span>{children}</span>
      <span className={cn("ml-auto text-[10px]", active ? "text-gojo-ink-muted" : "text-white/35")}>
        {count}
      </span>
    </button>
  );
}

function StudentsTable({
  students,
  onSelect,
}: {
  students: DashboardStudent[];
  onSelect: (student: DashboardStudent) => void;
}) {
  if (students.length === 0) return <EmptyState title="Студенты не найдены" />;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-gojo-surface">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-12 min-w-[260px] pl-7">Студент</TableHead>
            <TableHead>Доступ</TableHead>
            <TableHead>Уроки</TableHead>
            <TableHead>Уровень</TableHead>
            <TableHead>Последний урок</TableHead>
            <TableHead className="w-14 pr-5">
              <span className="sr-only">Открыть</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id} className="group h-[68px]">
              <TableCell className="pl-7">
                <button
                  type="button"
                  onClick={() => onSelect(student)}
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  <Avatar
                    value={student.avatarUrl}
                    size={36}
                    fallback={student.nickname ?? student.name}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold group-hover:text-gojo-orange">
                      {student.nickname ?? student.name}
                    </span>
                    <span className="block truncate text-xs text-gojo-ink-muted">
                      {student.email}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell>
                <AccessBadge student={student} />
              </TableCell>
              <TableCell>
                <span className="font-semibold">{student.attendedCount}</span>
                <span className="text-gojo-ink-muted"> / {student.lessonCount}</span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1.5">
                  <Badge variant="outline">{student.jlptLevel ?? "JLPT —"}</Badge>
                  {student.quizLevel ? (
                    <Badge variant="secondary">{quizLevelLabel(student.quizLevel)}</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-gojo-ink-muted">
                {student.lastLessonAt ? formatDate(student.lastLessonAt) : "Без уроков"}
              </TableCell>
              <TableCell className="pr-5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onSelect(student)}
                  aria-label={`Открыть ${student.nickname ?? student.name}`}
                >
                  <ChevronRight />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LessonsTable({
  lessons,
  onSelect,
}: {
  lessons: TeacherLessonDto[];
  onSelect: (lesson: TeacherLessonDto) => void;
}) {
  if (lessons.length === 0) return <EmptyState title="Уроки не найдены" />;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-gojo-surface">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-12 min-w-[280px] pl-7">Урок</TableHead>
            <TableHead>Дата и время</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Студенты</TableHead>
            <TableHead>Встреча</TableHead>
            <TableHead className="w-14 pr-5">
              <span className="sr-only">Открыть</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((lesson) => (
            <TableRow key={lesson.id} className="group h-[68px]">
              <TableCell className="pl-7">
                <button
                  type="button"
                  onClick={() => onSelect(lesson)}
                  className="flex items-center gap-3 text-left"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-gojo-orange-soft text-gojo-orange">
                    <BookOpen className="size-4" />
                  </span>
                  <span>
                    <span className="block font-bold group-hover:text-gojo-orange">
                      {lesson.title}
                    </span>
                    <span className="g-mono block max-w-52 truncate text-[10px] text-gojo-ink-muted">
                      {lesson.id}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell>
                <LocalTime
                  iso={lesson.startsAt}
                  options={{
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }}
                  showTimeZone
                  className="font-semibold"
                />
                <span className="block text-xs text-gojo-ink-muted">{durationLabel(lesson)}</span>
              </TableCell>
              <TableCell>
                <LessonStatusBadge status={lesson.status} />
              </TableCell>
              <TableCell>{lesson.studentCount}</TableCell>
              <TableCell>
                {lesson.meetingUrl ? (
                  <span className="text-gojo-success">Добавлена</span>
                ) : (
                  <span className="text-gojo-ink-muted">Нет ссылки</span>
                )}
              </TableCell>
              <TableCell className="pr-5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onSelect(lesson)}
                  aria-label={`Открыть ${lesson.title}`}
                >
                  <ChevronRight />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LeadsTable({
  leads,
  onSelect,
}: {
  leads: TeacherLeadDto[];
  onSelect: (lead: TeacherLeadDto) => void;
}) {
  if (leads.length === 0) return <EmptyState title="Заявки не найдены" />;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-gojo-surface">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-12 min-w-[240px] pl-7">Контакт</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Цель</TableHead>
            <TableHead>Следующий контакт</TableHead>
            <TableHead>Создана</TableHead>
            <TableHead className="w-14 pr-5">
              <span className="sr-only">Открыть</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="group h-[68px]">
              <TableCell className="pl-7">
                <button type="button" onClick={() => onSelect(lead)} className="min-w-0 text-left">
                  <span className="block truncate font-bold group-hover:text-gojo-orange">
                    {lead.name}
                  </span>
                  <span className="block max-w-64 truncate text-xs text-gojo-ink-muted">
                    {lead.email ?? lead.telegram ?? lead.phone ?? "Без контакта"}
                  </span>
                </button>
              </TableCell>
              <TableCell>
                <LeadStatusBadge status={lead.status} />
              </TableCell>
              <TableCell className="max-w-64 truncate text-gojo-ink-muted">
                {[lead.level, lead.goal].filter(Boolean).join(" · ") || "Без деталей"}
              </TableCell>
              <TableCell className="text-gojo-ink-muted">
                {lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : "Не назначен"}
              </TableCell>
              <TableCell className="text-gojo-ink-muted">{formatDate(lead.createdAt)}</TableCell>
              <TableCell className="pr-5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onSelect(lead)}
                  aria-label={`Открыть ${lead.name}`}
                >
                  <ChevronRight />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdminsTable({
  admins,
  onSelect,
}: {
  admins: AdminDirectoryEntry[];
  onSelect: (admin: AdminDirectoryEntry) => void;
}) {
  if (admins.length === 0) return <EmptyState title="Администраторы не найдены" />;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-gojo-surface">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-12 min-w-[260px] pl-7">Администратор</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Создан</TableHead>
            <TableHead>Обновлён</TableHead>
            <TableHead className="w-14 pr-5">
              <span className="sr-only">Открыть</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id} className="group h-[68px]">
              <TableCell className="pl-7">
                <button
                  type="button"
                  onClick={() => onSelect(admin)}
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  <Avatar
                    value={admin.avatarUrl}
                    size={36}
                    fallback={admin.nickname ?? admin.name}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold group-hover:text-gojo-orange">
                      {admin.nickname ?? admin.name}
                    </span>
                    <span className="g-mono block max-w-52 truncate text-[10px] text-gojo-ink-muted">
                      {admin.id}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell className="text-gojo-ink-muted">{admin.email}</TableCell>
              <TableCell>
                <Badge
                  variant={admin.emailVerified ? "default" : "outline"}
                  className={
                    admin.emailVerified ? "bg-gojo-success/10 text-gojo-success" : undefined
                  }
                >
                  {admin.emailVerified ? "Email подтверждён" : "Не подтверждён"}
                </Badge>
              </TableCell>
              <TableCell className="text-gojo-ink-muted">
                <LocalTime
                  iso={admin.createdAt}
                  options={{
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }}
                  showTimeZone
                />
              </TableCell>
              <TableCell className="text-gojo-ink-muted">
                <LocalTime
                  iso={admin.updatedAt}
                  options={{
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }}
                  showTimeZone
                />
              </TableCell>
              <TableCell className="pr-5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onSelect(admin)}
                  aria-label={`Открыть ${admin.nickname ?? admin.name}`}
                >
                  <ChevronRight />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RecordSheet({
  panel,
  plans,
  directory,
  onClose,
}: {
  panel: Panel;
  plans: PaymentPlanDto[];
  directory: StudentDirectoryEntry[];
  onClose: () => void;
}) {
  const title =
    panel?.kind === "new-student"
      ? "Новый студент"
      : panel?.kind === "new-lesson"
        ? "Новый урок"
        : panel?.kind === "student"
          ? (panel.record.nickname ?? panel.record.name)
          : panel?.kind === "lesson"
            ? panel.record.title
            : panel?.kind === "lead"
              ? panel.record.name
              : panel?.kind === "admin"
                ? (panel.record.nickname ?? panel.record.name)
                : "Запись";

  return (
    <Sheet open={panel !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <div className="g-mono text-[10px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            {panel?.kind.startsWith("new-") ? "Создание записи" : "Просмотр и редактирование"}
          </div>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {panel?.kind === "new-student"
              ? "Создаст аккаунт и отправит приглашение на email."
              : panel?.kind === "new-lesson"
                ? "Урок сразу появится у выбранных студентов."
                : panel?.kind === "admin"
                  ? "Единая роль администратора и преподавателя. Любой администратор может редактировать запись."
                  : "Изменения сохраняются в текущей коллекции."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {panel?.kind === "new-student" ? (
            <CreateStudentForm plans={plans} presentation="plain" onSuccess={onClose} />
          ) : panel?.kind === "new-lesson" ? (
            <CreateLessonForm students={directory} presentation="plain" onSuccess={onClose} />
          ) : panel?.kind === "student" ? (
            <StudentPanel student={panel.record} plans={plans} onSuccess={onClose} />
          ) : panel?.kind === "lesson" ? (
            <LessonPanel lesson={panel.record} onSuccess={onClose} />
          ) : panel?.kind === "lead" ? (
            <LeadPanel lead={panel.record} onSuccess={onClose} />
          ) : panel?.kind === "admin" ? (
            <AdminPanel admin={panel.record} onSuccess={onClose} />
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function AdminPanel({ admin, onSuccess }: { admin: AdminDirectoryEntry; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    updateAdminAction,
    {},
  );
  const router = useRouter();
  const [name, setName] = useState(admin.name);
  const [nickname, setNickname] = useState(admin.nickname ?? "");
  const [email, setEmail] = useState(admin.email);
  const [avatarUrl, setAvatarUrl] = useState(admin.avatarUrl ?? "");
  const [telegramId, setTelegramId] = useState(admin.telegramId?.toString() ?? "");

  useEffect(() => {
    setName(admin.name);
    setNickname(admin.nickname ?? "");
    setEmail(admin.email);
    setAvatarUrl(admin.avatarUrl ?? "");
    setTelegramId(admin.telegramId?.toString() ?? "");
  }, [admin]);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Администратор сохранён");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  return (
    <div>
      <div className="flex items-center gap-4 rounded-2xl bg-gojo-paper-2 p-4">
        <Avatar value={avatarUrl || null} size={56} fallback={nickname || name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{nickname || name}</div>
          <div className="truncate text-sm text-gojo-ink-muted">{email}</div>
        </div>
        <Badge className="shrink-0 bg-gojo-orange-soft text-gojo-orange">Администратор</Badge>
      </div>

      <form
        action={formAction}
        onReset={(event) => event.preventDefault()}
        className="mt-7 space-y-5 border-t border-gojo-ink/10 pt-6"
      >
        <Input type="hidden" name="adminId" value={admin.id} />
        <div className="g-mono text-[10px] font-bold uppercase tracking-[0.16em] text-gojo-ink-ghost">
          Данные
        </div>
        <Field>
          <FieldLabel htmlFor={`admin-name-${admin.id}`}>Имя</FieldLabel>
          <Input
            id={`admin-name-${admin.id}`}
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`admin-nickname-${admin.id}`}>Отображаемое имя</FieldLabel>
          <Input
            id={`admin-nickname-${admin.id}`}
            name="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Как показывать в интерфейсе"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`admin-email-${admin.id}`}>Email</FieldLabel>
          <Input
            id={`admin-email-${admin.id}`}
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`admin-avatar-${admin.id}`}>Аватар (URL или preset:...)</FieldLabel>
          <Input
            id={`admin-avatar-${admin.id}`}
            name="avatarUrl"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://... или preset:sensei"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`admin-telegram-${admin.id}`}>Telegram ID</FieldLabel>
          <Input
            id={`admin-telegram-${admin.id}`}
            name="telegramId"
            type="number"
            min="1"
            step="1"
            value={telegramId}
            onChange={(event) => setTelegramId(event.target.value)}
            placeholder="Числовой ID"
          />
        </Field>
        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
        <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
          {pending ? "Сохраняем..." : "Сохранить администратора"}
        </Button>
      </form>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-4 border-t border-gojo-ink/8 pt-5 opacity-70">
        <div className="min-w-0">
          <div className="g-mono text-[9px] font-bold uppercase tracking-[0.12em] text-gojo-ink-ghost">
            Системный ID
          </div>
          <div className="g-mono mt-1 break-all text-[10px] text-gojo-ink-muted">{admin.id}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="g-mono text-[9px] font-bold uppercase tracking-[0.12em] text-gojo-ink-ghost">
            Создан · обновлён
          </div>
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-gojo-ink-muted">
            <LocalTime
              iso={admin.createdAt}
              options={{
                day: "2-digit",
                month: "short",
                year: "numeric",
              }}
              className="whitespace-nowrap"
            />
            <span aria-hidden="true">·</span>
            <LocalTime
              iso={admin.updatedAt}
              options={{
                day: "2-digit",
                month: "short",
                year: "numeric",
              }}
              className="whitespace-nowrap"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentPanel({
  student,
  plans,
  onSuccess,
}: {
  student: DashboardStudent;
  plans: PaymentPlanDto[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    updateStudentAction,
    {},
  );
  const router = useRouter();
  const [name, setName] = useState(student.name);
  const [nickname, setNickname] = useState(student.nickname ?? "");
  const [email, setEmail] = useState(student.email);
  const [avatarUrl, setAvatarUrl] = useState(student.avatarUrl ?? "");
  const [telegramId, setTelegramId] = useState(student.telegramId?.toString() ?? "");
  const [telegramUsername, setTelegramUsername] = useState(student.telegramUsername ?? "");
  const [jlptLevel, setJlptLevel] = useState(student.jlptLevel ?? "");
  const [quizLevel, setQuizLevel] = useState(student.quizLevel ?? "");
  const [currentLevel, setCurrentLevel] = useState(String(student.currentLevel));
  const [assignedPlanId, setAssignedPlanId] = useState(student.assignedPlanId ?? "");
  const [accessEndDate, setAccessEndDate] = useState(
    student.activeUntil ? formatDateInput(new Date(student.activeUntil)) : "",
  );
  const [lessonCredits, setLessonCredits] = useState(String(student.lessonCredits));
  const quizReference = quizLevel ? quizLevelLabel(quizLevel) : "—";
  const levelMismatch = Boolean(jlptLevel && quizLevel && jlptLevel !== quizLevel);

  useEffect(() => {
    setName(student.name);
    setNickname(student.nickname ?? "");
    setEmail(student.email);
    setAvatarUrl(student.avatarUrl ?? "");
    setTelegramId(student.telegramId?.toString() ?? "");
    setTelegramUsername(student.telegramUsername ?? "");
    setJlptLevel(student.jlptLevel ?? "");
    setQuizLevel(student.quizLevel ?? "");
    setCurrentLevel(String(student.currentLevel));
    setAssignedPlanId(student.assignedPlanId ?? "");
    setAccessEndDate(student.activeUntil ? formatDateInput(new Date(student.activeUntil)) : "");
    setLessonCredits(String(student.lessonCredits));
  }, [student]);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Студент сохранён");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  return (
    <div>
      <div className="flex items-center gap-4 rounded-2xl bg-gojo-paper-2 p-4">
        <Avatar value={avatarUrl || null} size={56} fallback={nickname || name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{nickname || name}</div>
          <div className="truncate text-sm text-gojo-ink-muted">{email}</div>
        </div>
        <AccessBadge student={student} />
      </div>

      <div className="mt-4 grid grid-cols-3 rounded-2xl border border-gojo-ink/10 px-4 py-4">
        <StudentSummaryStat label="Уроков" value={String(student.lessonCount)} />
        <StudentSummaryStat
          label="Посещено"
          value={String(student.attendedCount)}
          className="border-l border-gojo-ink/10 pl-4"
        />
        <StudentSummaryStat
          label="Квиз · онбординг"
          value={quizReference}
          accent
          className="border-l border-gojo-ink/10 pl-4"
        />
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-gojo-ink-ghost">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Квиз — самооценка при регистрации. Справочно, не редактируется.
      </p>

      <form
        action={formAction}
        onReset={(event) => event.preventDefault()}
        className="mt-7 space-y-5 border-t border-gojo-ink/10 pt-6"
      >
        <Input type="hidden" name="studentId" value={student.id} />
        <Input type="hidden" name="quizLevel" value={quizLevel} />
        <div>
          <div className="g-mono text-[10px] font-bold uppercase tracking-[0.16em] text-gojo-ink-ghost">
            Данные
          </div>
        </div>
        <Field>
          <FieldLabel htmlFor={`student-name-${student.id}`}>Имя</FieldLabel>
          <Input
            id={`student-name-${student.id}`}
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`student-nickname-${student.id}`}>Отображаемое имя</FieldLabel>
          <Input
            id={`student-nickname-${student.id}`}
            name="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Как показывать в личном кабинете"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`student-email-${student.id}`}>Email</FieldLabel>
          <Input
            id={`student-email-${student.id}`}
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`student-avatar-${student.id}`}>
            Аватар (URL или preset:...)
          </FieldLabel>
          <Input
            id={`student-avatar-${student.id}`}
            name="avatarUrl"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://... или preset:kitsune"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`student-telegram-username-${student.id}`}>Telegram</FieldLabel>
            <Input
              id={`student-telegram-username-${student.id}`}
              name="telegramUsername"
              value={telegramUsername}
              onChange={(event) => setTelegramUsername(event.target.value)}
              placeholder="@username"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`student-telegram-${student.id}`}>Telegram ID</FieldLabel>
            <Input
              id={`student-telegram-${student.id}`}
              name="telegramId"
              type="number"
              min="1"
              step="1"
              value={telegramId}
              onChange={(event) => setTelegramId(event.target.value)}
              placeholder="Числовой ID"
            />
          </Field>
        </div>
        <p className="text-xs leading-relaxed text-gojo-ink-muted">
          Оба поля нужны для входа по коду через Telegram.
        </p>
        <div className="border-t border-gojo-ink/10 pt-6">
          <div className="g-mono text-[10px] font-bold uppercase tracking-[0.16em] text-gojo-ink-ghost">
            Учебный уровень
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gojo-ink-muted">
            Выставляет преподаватель. Этот уровень ведёт обучение и показывается студенту.
          </p>
        </div>
        {levelMismatch ? (
          <div className="flex items-start gap-2 rounded-xl border border-gojo-orange/15 bg-gojo-orange-soft/50 px-3.5 py-3 text-sm leading-relaxed text-gojo-ink-muted">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gojo-orange" />
            <span>
              Квиз показал <strong className="text-gojo-ink">{quizReference}</strong>, преподаватель
              выставил <strong className="text-gojo-ink">{jlptLevel}</strong>. Студент видит уровень
              преподавателя.
            </span>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`student-jlpt-${student.id}`}>JLPT</FieldLabel>
            <NativeSelect
              id={`student-jlpt-${student.id}`}
              name="jlptLevel"
              value={jlptLevel}
              onChange={(event) => setJlptLevel(event.target.value)}
            >
              <option value="">Не задан</option>
              {["N5", "N4", "N3", "N2"].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`student-current-level-${student.id}`}>
              Уровень программы
            </FieldLabel>
            <Input
              id={`student-current-level-${student.id}`}
              name="currentLevel"
              type="number"
              min="1"
              max="30"
              step="1"
              value={currentLevel}
              onChange={(event) => setCurrentLevel(event.target.value)}
              required
            />
            <p className="text-xs text-gojo-ink-muted">1–30 · позиция в курсе gojo</p>
          </Field>
        </div>
        <div className="border-t border-gojo-ink/10 pt-6">
          <div className="g-mono text-[10px] font-bold uppercase tracking-[0.16em] text-gojo-ink-ghost">
            Доступ к занятиям
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gojo-ink-muted">
            Тариф задаёт срок доступа или количество оставшихся уроков.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor={`plan-${student.id}`}>Тариф и доступ</FieldLabel>
          <NativeSelect
            id={`plan-${student.id}`}
            name="assignedPlanId"
            value={assignedPlanId}
            onChange={(event) => {
              const planId = event.target.value;
              setAssignedPlanId(planId);
              if (planId === "monthly-standard" && !accessEndDate) {
                const defaultEnd = new Date();
                defaultEnd.setDate(defaultEnd.getDate() + 30);
                setAccessEndDate(formatDateInput(defaultEnd));
              }
              if (planId === "bundle-8" && Number(lessonCredits) < 1) {
                setLessonCredits("8");
              }
            }}
          >
            <option value="">Без тарифа</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} — {Number(plan.amountValue).toLocaleString("ru-RU")} ₽
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs leading-relaxed text-gojo-ink-muted">
            Назначение тарифа открывает доступ без отдельной оплаты.
          </p>
        </Field>
        {assignedPlanId === "monthly-standard" ? (
          <Field>
            <FieldLabel htmlFor={`access-end-${student.id}`}>Доступ до (включительно)</FieldLabel>
            <Input
              id={`access-end-${student.id}`}
              type="date"
              min={formatDateInput(new Date())}
              value={accessEndDate}
              onChange={(event) => setAccessEndDate(event.target.value)}
              required
            />
            <Input
              type="hidden"
              name="activeUntil"
              value={localDateTimeIso(accessEndDate, "23:59")}
            />
            <Input type="hidden" name="lessonCredits" value="0" />
          </Field>
        ) : assignedPlanId === "bundle-8" ? (
          <Field>
            <FieldLabel htmlFor={`lesson-credits-${student.id}`}>Осталось уроков</FieldLabel>
            <Input
              id={`lesson-credits-${student.id}`}
              name="lessonCredits"
              type="number"
              min="1"
              max="1000"
              step="1"
              value={lessonCredits}
              onChange={(event) => setLessonCredits(event.target.value)}
              required
            />
            <Input type="hidden" name="activeUntil" value="" />
          </Field>
        ) : (
          <>
            <Input type="hidden" name="activeUntil" value="" />
            <Input type="hidden" name="lessonCredits" value="0" />
          </>
        )}
        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
        <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
          {pending ? "Сохраняем..." : "Сохранить студента"}
        </Button>
      </form>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-4 border-t border-gojo-ink/8 pt-5 opacity-70">
        <div className="min-w-0">
          <div className="g-mono text-[9px] font-bold uppercase tracking-[0.12em] text-gojo-ink-ghost">
            Системный ID
          </div>
          <div className="g-mono mt-1 break-all text-[10px] text-gojo-ink-muted">{student.id}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="g-mono text-[9px] font-bold uppercase tracking-[0.12em] text-gojo-ink-ghost">
            Создан · обновлён
          </div>
          <div className="mt-1 text-[11px] text-gojo-ink-muted">
            {formatDate(student.createdAt)} · {formatDate(student.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonPanel({ lesson, onSuccess }: { lesson: TeacherLessonDto; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    updateLessonAction,
    {},
  );
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(String(durationMinutes(lesson)));
  const [meetingUrl, setMeetingUrl] = useState(lesson.meetingUrl ?? "");

  useEffect(() => {
    const localStart = new Date(lesson.startsAt);
    setTitle(lesson.title);
    setDate(formatDateInput(localStart));
    setTime(formatTimeInput(localStart));
    setDuration(String(durationMinutes(lesson)));
    setMeetingUrl(lesson.meetingUrl ?? "");
  }, [lesson]);

  const startsAt = localDateTimeIso(date, time);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Урок сохранён");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-gojo-ink/10 bg-gojo-paper p-4">
        <div>
          <div className="text-xs text-gojo-ink-muted">Статус</div>
          <div className="mt-1">
            <LessonStatusBadge status={lesson.status} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gojo-ink-muted">Студенты</div>
          <div className="font-serif text-2xl font-bold">{lesson.studentCount}</div>
        </div>
      </div>

      <form action={formAction} onReset={(event) => event.preventDefault()} className="space-y-5">
        <Input type="hidden" name="lessonId" value={lesson.id} />
        <Input type="hidden" name="startsAt" value={startsAt} />
        <Field>
          <FieldLabel htmlFor={`title-${lesson.id}`}>Название</FieldLabel>
          <Input
            id={`title-${lesson.id}`}
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <TimeZoneNote />
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor={`date-${lesson.id}`}>Дата</FieldLabel>
            <Input
              id={`date-${lesson.id}`}
              name="date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`time-${lesson.id}`}>Время</FieldLabel>
            <Input
              id={`time-${lesson.id}`}
              name="time"
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`duration-${lesson.id}`}>Длительность</FieldLabel>
          <NativeSelect
            id={`duration-${lesson.id}`}
            name="duration"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          >
            {[30, 50, 60, 90].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} минут
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`meeting-${lesson.id}`}>Ссылка на Zoom / Meet</FieldLabel>
          <Input
            id={`meeting-${lesson.id}`}
            name="meetingUrl"
            type="url"
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.target.value)}
            placeholder="https://meet.google.com/..."
          />
        </Field>
        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
        <Button type="submit" disabled={pending || !startsAt} className="w-full">
          {pending ? "Сохраняем..." : "Сохранить изменения"}
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 border-t border-gojo-ink/10 pt-6">
        <Link
          href={`/teacher/lessons/${lesson.id}`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Управлять <ArrowUpRight />
        </Link>
        {lesson.status === "scheduled" ? (
          <form action={cancelLessonAction}>
            <Input type="hidden" name="lessonId" value={lesson.id} />
            <Button type="submit" variant="destructive" className="w-full">
              Отменить
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function LeadPanel({ lead, onSuccess }: { lead: TeacherLeadDto; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    updateLeadAction,
    {},
  );
  const router = useRouter();
  const [trialTitle, setTrialTitle] = useState(`Пробный урок · ${lead.name}`);
  const [trialDate, setTrialDate] = useState("");
  const [trialTime, setTrialTime] = useState("19:00");
  const [trialDuration, setTrialDuration] = useState("50");
  const [today, setToday] = useState("");

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Заявка сохранена");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  useEffect(() => {
    const now = new Date();
    setToday(formatDateInput(now));
    setTrialDate(formatDateInput(new Date(now.getTime() + 86_400_000)));
    setTrialTitle(`Пробный урок · ${lead.name}`);
  }, [lead.name]);

  const trialStartsAt = localDateTimeIso(trialDate, trialTime);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gojo-ink/10 bg-gojo-paper p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <LeadStatusBadge status={lead.status} />
            <div className="mt-3 text-sm font-bold">{lead.name}</div>
            <div className="mt-1 space-y-0.5 text-sm text-gojo-ink-muted">
              {lead.email ? <div>{lead.email}</div> : null}
              {lead.telegram ? <div>@{lead.telegram}</div> : null}
              {lead.phone ? <div>{lead.phone}</div> : null}
            </div>
          </div>
          <Badge variant="outline">{lead.kind}</Badge>
        </div>
        {lead.goal || lead.level ? (
          <p className="mt-4 border-t border-gojo-ink/10 pt-3 text-sm text-gojo-ink-muted">
            {[lead.level, lead.goal].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      <form action={formAction} className="space-y-5">
        <Input type="hidden" name="leadId" value={lead.id} />
        <Field>
          <FieldLabel htmlFor={`lead-status-${lead.id}`}>Статус</FieldLabel>
          <NativeSelect id={`lead-status-${lead.id}`} name="status" defaultValue={lead.status}>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS[status]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`follow-up-${lead.id}`}>Следующий контакт</FieldLabel>
          <Input
            id={`follow-up-${lead.id}`}
            name="nextFollowUpAt"
            type="datetime-local"
            defaultValue={lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 16) : ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`lead-notes-${lead.id}`}>Заметки</FieldLabel>
          <Textarea
            id={`lead-notes-${lead.id}`}
            name="notes"
            defaultValue={lead.notes ?? ""}
            placeholder="Что обсудили и какой следующий шаг?"
            className="min-h-32"
          />
        </Field>
        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Сохраняем..." : "Сохранить изменения"}
        </Button>
      </form>

      {lead.trialLessonId ? (
        <Link
          href={`/teacher/lessons/${lead.trialLessonId}`}
          className={buttonVariants({ variant: "secondary", className: "w-full" })}
        >
          Открыть пробный урок <ArrowUpRight />
        </Link>
      ) : (
        <form
          action={createTrialLessonAction}
          className="space-y-4 border-t border-gojo-ink/10 pt-6"
        >
          <Input type="hidden" name="leadId" value={lead.id} />
          <Input type="hidden" name="startsAt" value={trialStartsAt} />
          <div>
            <h3 className="font-bold">Назначить пробный урок</h3>
            <p className="mt-1 text-sm text-gojo-ink-muted">
              Создаст урок и свяжет его с этой заявкой.
            </p>
          </div>
          <Input
            name="title"
            value={trialTitle}
            onChange={(event) => setTrialTitle(event.target.value)}
          />
          <TimeZoneNote />
          <div className="grid grid-cols-2 gap-3">
            <Input
              name="date"
              type="date"
              min={today}
              value={trialDate}
              onChange={(event) => setTrialDate(event.target.value)}
              required
            />
            <Input
              name="time"
              type="time"
              value={trialTime}
              onChange={(event) => setTrialTime(event.target.value)}
              required
            />
          </div>
          <NativeSelect
            name="duration"
            value={trialDuration}
            onChange={(event) => setTrialDuration(event.target.value)}
          >
            <option value="30">30 минут</option>
            <option value="50">50 минут</option>
            <option value="60">60 минут</option>
          </NativeSelect>
          <Button type="submit" variant="outline" className="w-full" disabled={!trialStartsAt}>
            Создать пробный урок
          </Button>
        </form>
      )}
    </div>
  );
}

function AccessBadge({ student }: { student: DashboardStudent }) {
  if (!student.isActive) return <Badge variant="destructive">Нет доступа</Badge>;
  const label = student.activeUntil
    ? `До ${formatDate(student.activeUntil)}`
    : `${student.lessonCredits} ур.`;
  return <Badge className="bg-gojo-success-soft text-gojo-success">{label}</Badge>;
}

function LessonStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "cancelled" ? "destructive" : status === "scheduled" ? "default" : "secondary"
      }
    >
      {LESSON_STATUS[status] ?? status}
    </Badge>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "lost" ? "destructive" : status === "converted" ? "default" : "secondary"}
    >
      {LEAD_STATUS[status] ?? status}
    </Badge>
  );
}

function StudentSummaryStat({
  label,
  value,
  accent = false,
  className,
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-1", className)}>
      <div className="g-mono text-[9px] font-bold uppercase leading-relaxed tracking-[0.12em] text-gojo-ink-ghost">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-serif text-2xl font-bold text-gojo-ink",
          accent && "text-gojo-orange",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gojo-ink/10 p-4">
      <div className="g-mono text-[9px] font-bold uppercase tracking-[0.14em] text-gojo-ink-muted">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-bold">{value}</div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="grid min-h-72 flex-1 place-items-center p-8 text-center">
      <div>
        <Search className="mx-auto size-8 text-gojo-ink-ghost" />
        <p className="mt-3 font-bold">{title}</p>
        <p className="mt-1 text-sm text-gojo-ink-muted">Измени запрос или создай новую запись.</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function durationMinutes(lesson: TeacherLessonDto) {
  return Math.round(
    (new Date(lesson.endsAt).getTime() - new Date(lesson.startsAt).getTime()) / 60000,
  );
}

function durationLabel(lesson: TeacherLessonDto) {
  return `${durationMinutes(lesson)} минут`;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function localDateTimeIso(date: string, time: string) {
  if (!date || !time) return "";
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}
