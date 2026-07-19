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
  TeacherUnit,
} from "@/lib/api";
import { quizLevelLabel } from "@/lib/quiz-level";
import { cn } from "@/lib/utils";
import type { LevelDetailDto, LevelSummaryDto, LevelVocabDto, PaymentPlanDto } from "@gojo/shared";
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
import {
  Fragment,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  type ResendInviteState,
  type TeacherActionState,
  createAdminAction,
  resendStudentInviteAction,
  updateAdminAction,
  updateStudentAction,
} from "./actions";
import { CreateLessonForm } from "./create-form";
import {
  addVocabAction,
  createUnitAction,
  deleteUnitAction,
  deleteVocabAction,
  updateUnitAction,
  updateVocabAction,
} from "./curriculum/actions";
import { HomeDashboard } from "./home-dashboard";
import {
  type SendLeadLinkState,
  createTrialLessonAction,
  markTrialDoneAction,
  rejectLeadAction,
  sendLeadLinkAction,
  updateLeadAction,
} from "./leads/actions";
import { LessonPanel } from "./lesson-panel";

export type DashboardStudent = StudentDirectoryEntry & {
  lessonCount: number;
  attendedCount: number;
  lastLessonAt: string | null;
  activeUntil: string | null;
  lessonCredits: number;
  isActive: boolean;
};

export type CurriculumData = {
  level: number;
  summaries: LevelSummaryDto[];
  detail: LevelDetailDto | null;
};

type Collection = "home" | "students" | "lessons" | "leads" | "curriculum" | "admins";
type Panel =
  | { kind: "new-lesson" }
  | { kind: "new-admin" }
  | { kind: "new-unit"; levelId: number }
  | { kind: "student"; record: DashboardStudent }
  | { kind: "lesson"; record: TeacherLessonDto }
  | { kind: "lead"; record: TeacherLeadDto }
  | { kind: "admin"; record: AdminDirectoryEntry }
  | { kind: "unit"; record: TeacherUnit }
  | { kind: "vocab"; record: LevelVocabDto; levelId: number }
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
  trial_done: "Пробный пройден",
  link_sent: "Ссылка отправлена",
  converted: "Конвертирована",
  lost: "Отклонена",
};

export function AdminWorkspace({
  students,
  lessons,
  leads,
  admins,
  directory,
  units = [],
  curriculum = null,
  plans,
  error,
  currentUser,
  initialCollection = "home",
  initialPanel,
  initialLessonId,
}: {
  students: DashboardStudent[];
  lessons: TeacherLessonDto[];
  leads: TeacherLeadDto[];
  admins: AdminDirectoryEntry[];
  directory: StudentDirectoryEntry[];
  units?: TeacherUnit[];
  curriculum?: CurriculumData | null;
  plans: PaymentPlanDto[];
  error?: string | null;
  currentUser: { email: string; nickname: string | null; avatarUrl: string | null };
  initialCollection?: Collection;
  initialPanel?: "new-lesson";
  initialLessonId?: string;
}) {
  const router = useRouter();
  const [collection, setCollection] = useState<Collection>(initialCollection);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(() => {
    if (initialPanel === "new-lesson") return { kind: "new-lesson" };
    if (initialLessonId) {
      const record = lessons.find((lesson) => lesson.id === initialLessonId);
      if (record) return { kind: "lesson", record };
    }
    return null;
  });

  useEffect(() => setCollection(initialCollection), [initialCollection]);

  const selectCollection = (next: Collection) => {
    setCollection(next);
    setQuery("");
    setPanel(null);
    router.replace(next === "home" ? "/teacher" : `/teacher?collection=${next}`, {
      scroll: false,
    });
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

  const isHome = collection === "home";
  const isStudents = collection === "students";
  const isLessons = collection === "lessons";
  const isLeads = collection === "leads";
  const isCurriculum = collection === "curriculum";
  const isAdmins = collection === "admins";

  const curriculumVocab = useMemo(() => {
    const vocab = curriculum?.detail?.vocab ?? [];
    const term = query.trim().toLocaleLowerCase("ru");
    if (!term) return vocab;
    return vocab.filter((v) =>
      [v.word, v.reading, v.meaning].some((value) => value.toLocaleLowerCase("ru").includes(term)),
    );
  }, [curriculum, query]);

  const collectionLabel = isStudents
    ? "Студенты"
    : isLessons
      ? "Уроки"
      : isLeads
        ? "Заявки"
        : isCurriculum
          ? "Программа"
          : "Администраторы";
  const visibleCount = isStudents
    ? filteredStudents.length
    : isLessons
      ? filteredLessons.length
      : isLeads
        ? filteredLeads.length
        : isCurriculum
          ? curriculumVocab.length
          : filteredAdmins.length;
  const totalCount = isStudents
    ? students.length
    : isLessons
      ? lessons.length
      : isLeads
        ? leads.length
        : isCurriculum
          ? (curriculum?.detail?.vocab.length ?? 0)
          : admins.length;

  return (
    <main className="min-h-screen bg-gojo-surface">
      <div className="flex min-h-screen w-full flex-col bg-gojo-surface lg:h-screen lg:flex-row lg:overflow-hidden">
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

          <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto lg:p-4">
            <CollectionButton
              active={collection === "home"}
              icon={LayoutDashboard}
              onClick={() => selectCollection("home")}
            >
              Сегодня
            </CollectionButton>
            <div className="hidden px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35 lg:block">
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
            <CollectionButton
              active={collection === "curriculum"}
              icon={BookOpen}
              onClick={() => selectCollection("curriculum")}
            >
              Программа
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

        <section className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
          {isHome ? (
            <>
              {error ? (
                <div className="m-5 rounded-lg border border-gojo-error/20 bg-gojo-error-soft p-4 text-sm font-bold text-gojo-error sm:m-7">
                  {error}
                </div>
              ) : null}
              <HomeDashboard
                lessons={lessons}
                students={students}
                leads={leads}
                onNewLesson={() => setPanel({ kind: "new-lesson" })}
                onOpenLead={(record) => setPanel({ kind: "lead", record })}
                onOpenStudent={(record) => setPanel({ kind: "student", record })}
                onOpenLesson={(record) => setPanel({ kind: "lesson", record })}
                onBrowse={selectCollection}
              />
            </>
          ) : (
            <>
              <header className="flex flex-col gap-4 border-b border-gojo-ink/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gojo-ink-muted">
                    {isAdmins ? "Система" : "Коллекции"} <ChevronRight className="size-3.5" />
                    <span className={isCurriculum ? undefined : "text-gojo-ink"}>
                      {collectionLabel}
                    </span>
                    {isCurriculum ? (
                      <>
                        <ChevronRight className="size-3.5" />
                        <span className="text-gojo-ink">Уровень {curriculum?.level ?? 1}</span>
                      </>
                    ) : null}
                  </div>
                  <h1 className="mt-1 font-serif text-3xl font-bold">{collectionLabel}</h1>
                </div>
                {isLessons || isAdmins || isCurriculum ? (
                  <Button
                    onClick={() =>
                      setPanel(
                        isCurriculum
                          ? { kind: "new-unit", levelId: curriculum?.level ?? 1 }
                          : {
                              kind: isLessons ? "new-lesson" : "new-admin",
                            },
                      )
                    }
                  >
                    <Plus />
                    {isLessons ? "Новый урок" : isCurriculum ? "Новый юнит" : "Новый администратор"}
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
                            : isCurriculum
                              ? "Поиск по словам уровня..."
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
              ) : isCurriculum ? (
                <CurriculumView
                  curriculum={curriculum}
                  vocab={curriculumVocab}
                  units={units}
                  students={students}
                  onSelectLevel={(level) => {
                    setPanel(null);
                    router.replace(`/teacher?collection=curriculum&level=${level}`, {
                      scroll: false,
                    });
                  }}
                  onOpenUnit={(record) => setPanel({ kind: "unit", record })}
                  onOpenVocab={(record) =>
                    setPanel({ kind: "vocab", record, levelId: curriculum?.level ?? 1 })
                  }
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
            </>
          )}
        </section>
      </div>

      <RecordSheet
        panel={
          // Record panels stay open across mutations — re-resolve the record
          // so router.refresh() shows the fresh state instead of the snapshot
          // taken on open.
          panel?.kind === "lead"
            ? { ...panel, record: leads.find((l) => l.id === panel.record.id) ?? panel.record }
            : panel?.kind === "lesson"
              ? {
                  ...panel,
                  record: lessons.find((l) => l.id === panel.record.id) ?? panel.record,
                }
              : panel
        }
        plans={plans}
        directory={directory}
        units={units}
        lessons={lessons}
        onOpenLesson={(record) => setPanel({ kind: "lesson", record })}
        onClose={closePanel}
      />
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
  count?: number;
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
      {count !== undefined ? (
        <span
          className={cn("ml-auto text-[10px]", active ? "text-gojo-ink-muted" : "text-white/35")}
        >
          {count}
        </span>
      ) : null}
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
  units,
  lessons,
  onOpenLesson,
  onClose,
}: {
  panel: Panel;
  plans: PaymentPlanDto[];
  directory: StudentDirectoryEntry[];
  units: TeacherUnit[];
  lessons: TeacherLessonDto[];
  onOpenLesson: (lesson: TeacherLessonDto) => void;
  onClose: () => void;
}) {
  const title =
    panel?.kind === "new-lesson"
      ? "Новый урок"
      : panel?.kind === "new-admin"
        ? "Новый администратор"
        : panel?.kind === "new-unit"
          ? `Новый юнит · уровень ${panel.levelId}`
          : panel?.kind === "student"
            ? (panel.record.nickname ?? panel.record.name)
            : panel?.kind === "lesson"
              ? panel.record.title
              : panel?.kind === "lead"
                ? panel.record.name
                : panel?.kind === "admin"
                  ? (panel.record.nickname ?? panel.record.name)
                  : panel?.kind === "unit"
                    ? panel.record.title
                    : panel?.kind === "vocab"
                      ? panel.record.word
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
            {panel?.kind === "new-lesson"
              ? "Урок сразу появится у выбранных студентов."
              : panel?.kind === "new-admin"
                ? "Создаст аккаунт с ролью администратора и отправит приглашение на email."
                : panel?.kind === "new-unit" || panel?.kind === "unit"
                  ? "Юнит — кусок уровня размером в занятие. «Пройден» на привязанном уроке выдаёт студенту деку юнита и открывает уровень."
                  : panel?.kind === "vocab"
                    ? "Дека связана: правка обновит карточку у всех студентов, кому слово уже выдано."
                    : panel?.kind === "admin"
                      ? "Единая роль администратора и преподавателя. Любой администратор может редактировать запись."
                      : "Изменения сохраняются в текущей коллекции."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {panel?.kind === "new-lesson" ? (
            <CreateLessonForm
              students={directory}
              units={units}
              presentation="plain"
              onSuccess={onClose}
            />
          ) : panel?.kind === "new-admin" ? (
            <NewAdminPanel onSuccess={onClose} />
          ) : panel?.kind === "student" ? (
            <StudentPanel student={panel.record} plans={plans} onSuccess={onClose} />
          ) : panel?.kind === "lesson" ? (
            <LessonPanel
              lesson={panel.record}
              units={units}
              directory={directory}
              onSuccess={onClose}
            />
          ) : panel?.kind === "lead" ? (
            <LeadPanel
              lead={panel.record}
              linkedStudent={
                panel.record.studentId
                  ? (directory.find((s) => s.id === panel.record.studentId) ?? null)
                  : null
              }
              trialLesson={
                panel.record.trialLessonId
                  ? (lessons.find((l) => l.id === panel.record.trialLessonId) ?? null)
                  : null
              }
              onOpenLesson={onOpenLesson}
              onSuccess={onClose}
            />
          ) : panel?.kind === "admin" ? (
            <AdminPanel admin={panel.record} onSuccess={onClose} />
          ) : panel?.kind === "new-unit" ? (
            <NewUnitPanel levelId={panel.levelId} onSuccess={onClose} />
          ) : panel?.kind === "unit" ? (
            <UnitPanel unit={panel.record} onSuccess={onClose} />
          ) : panel?.kind === "vocab" ? (
            <VocabPanel
              vocab={panel.record}
              units={units.filter((unit) => unit.levelId === panel.levelId)}
              onSuccess={onClose}
            />
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

function CurriculumView({
  curriculum,
  vocab,
  units,
  students,
  onSelectLevel,
  onOpenUnit,
  onOpenVocab,
}: {
  curriculum: CurriculumData | null;
  vocab: LevelVocabDto[];
  units: TeacherUnit[];
  students: DashboardStudent[];
  onSelectLevel: (level: number) => void;
  onOpenUnit: (unit: TeacherUnit) => void;
  onOpenVocab: (vocab: LevelVocabDto) => void;
}) {
  const [addState, addAction, addPending] = useActionState<TeacherActionState, FormData>(
    addVocabAction,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (!addState.ok) return;
    toast.success("Слово добавлено");
    router.refresh();
  }, [router, addState]);

  if (!curriculum) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-gojo-ink-muted">
        Загружаем программу…
      </div>
    );
  }

  const level = curriculum.level;
  const levelUnits = units
    .filter((unit) => unit.levelId === level)
    .sort((a, b) => a.position - b.position);
  const byUnit = new Map<string, LevelVocabDto[]>();
  const unassigned: LevelVocabDto[] = [];
  for (const word of vocab) {
    if (word.unitId && levelUnits.some((unit) => unit.id === word.unitId)) {
      const list = byUnit.get(word.unitId) ?? [];
      list.push(word);
      byUnit.set(word.unitId, list);
    } else {
      unassigned.push(word);
    }
  }
  const studentsOnLevel = students.filter((student) => student.currentLevel === level).length;

  const wordRow = (word: LevelVocabDto) => (
    <TableRow key={word.id} onClick={() => onOpenVocab(word)} className="cursor-pointer">
      <TableCell className="g-jp text-[16px] font-bold">{word.word}</TableCell>
      <TableCell className="g-jp text-gojo-ink-muted">{word.reading}</TableCell>
      <TableCell>{word.meaning}</TableCell>
      <TableCell className="w-10 text-right text-gojo-ink-ghost">
        <ChevronRight className="ml-auto size-4" />
      </TableCell>
    </TableRow>
  );

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
      <div className="flex flex-wrap gap-1.5">
        {(curriculum.summaries.length > 0
          ? curriculum.summaries.map((s) => s.id)
          : Array.from({ length: 30 }, (_, index) => index + 1)
        ).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectLevel(id)}
            className={cn(
              "grid size-9 place-items-center rounded-lg border text-sm font-bold transition-colors",
              id === level
                ? "border-gojo-orange bg-gojo-orange text-white"
                : "border-gojo-ink/15 bg-white hover:border-gojo-orange",
            )}
          >
            {id}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-gojo-ink-muted">
        Уровень {level} · {levelUnits.length} {plural(levelUnits.length, "юнит", "юнита", "юнитов")}{" "}
        · {curriculum.detail?.vocab.length ?? 0}{" "}
        {plural(curriculum.detail?.vocab.length ?? 0, "слово", "слова", "слов")} · {studentsOnLevel}{" "}
        {plural(studentsOnLevel, "студент", "студента", "студентов")} на уровне
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-gojo-ink/10 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Слово</TableHead>
              <TableHead>Чтение</TableHead>
              <TableHead>Значение</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {levelUnits.map((unit) => (
              <Fragment key={unit.id}>
                <TableRow
                  onClick={() => onOpenUnit(unit)}
                  className="cursor-pointer bg-gojo-paper-2/60 hover:bg-gojo-paper-2"
                >
                  <TableCell colSpan={3} className="py-2 text-[13px] font-bold">
                    Юнит {unit.position} · {unit.title}
                    {unit.sourceBook ? (
                      <span className="ml-2 font-normal text-gojo-ink-muted">
                        {unit.sourceBook}
                        {unit.sourceChapter ? ` · ${unit.sourceChapter}` : ""}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2 text-right text-[13px] font-bold text-gojo-ink-muted">
                    {(byUnit.get(unit.id) ?? []).length}
                  </TableCell>
                </TableRow>
                {(byUnit.get(unit.id) ?? []).map(wordRow)}
              </Fragment>
            ))}
            {unassigned.length > 0 ? (
              <>
                <TableRow className="bg-gojo-orange-soft/70 hover:bg-gojo-orange-soft">
                  <TableCell colSpan={3} className="py-2 text-[13px] font-bold text-gojo-orange">
                    Без юнита
                  </TableCell>
                  <TableCell className="py-2 text-right text-[13px] font-bold text-gojo-orange">
                    {unassigned.length}
                  </TableCell>
                </TableRow>
                {unassigned.map(wordRow)}
              </>
            ) : null}
            {vocab.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-gojo-ink-muted">
                  На уровне пока нет слов.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <form action={addAction} className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="levelId" value={level} />
        <Input name="word" placeholder="слово" required className="g-jp w-36" />
        <Input name="reading" placeholder="чтение" required className="w-36" />
        <Input name="meaning" placeholder="значение" required className="min-w-36 flex-1" />
        <NativeSelect name="unitId" defaultValue="" className="w-48">
          <option value="">— без юнита —</option>
          {levelUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>
              Юнит {unit.position} · {unit.title}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" disabled={addPending}>
          {addPending ? "Добавляем…" : "Добавить"}
        </Button>
      </form>
      {addState.error ? (
        <p className="mt-2 text-sm font-bold text-gojo-error">{addState.error}</p>
      ) : null}
    </div>
  );
}

function NewUnitPanel({ levelId, onSuccess }: { levelId: number; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    createUnitAction,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Юнит создан");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  return (
    <form action={formAction} className="space-y-5">
      <Input type="hidden" name="levelId" value={levelId} />
      <Field>
        <FieldLabel htmlFor="new-unit-title">Название</FieldLabel>
        <Input id="new-unit-title" name="title" required placeholder="Каждый день · распорядок" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="new-unit-book">Учебник</FieldLabel>
          <Input id="new-unit-book" name="sourceBook" placeholder="Genki I" />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-unit-chapter">Глава</FieldLabel>
          <Input id="new-unit-chapter" name="sourceChapter" placeholder="Глава 3" />
        </Field>
      </div>
      {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
        {pending ? "Создаём…" : "Создать юнит"}
      </Button>
    </form>
  );
}

function UnitPanel({ unit, onSuccess }: { unit: TeacherUnit; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    updateUnitAction,
    {},
  );
  const router = useRouter();
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Юнит сохранён");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  return (
    <div>
      <form action={formAction} className="space-y-5">
        <Input type="hidden" name="unitId" value={unit.id} />
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Field>
            <FieldLabel htmlFor={`unit-pos-${unit.id}`}>№</FieldLabel>
            <Input
              id={`unit-pos-${unit.id}`}
              name="position"
              type="number"
              min="1"
              defaultValue={unit.position}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`unit-title-${unit.id}`}>Название</FieldLabel>
            <Input id={`unit-title-${unit.id}`} name="title" defaultValue={unit.title} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor={`unit-book-${unit.id}`}>Учебник</FieldLabel>
            <Input
              id={`unit-book-${unit.id}`}
              name="sourceBook"
              defaultValue={unit.sourceBook ?? ""}
              placeholder="Genki I"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`unit-chapter-${unit.id}`}>Глава</FieldLabel>
            <Input
              id={`unit-chapter-${unit.id}`}
              name="sourceChapter"
              defaultValue={unit.sourceChapter ?? ""}
              placeholder="Глава 3"
            />
          </Field>
        </div>
        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
        <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
          {pending ? "Сохраняем…" : "Сохранить юнит"}
        </Button>
      </form>

      <div className="mt-7 border-t border-gojo-ink/10 pt-5">
        <p className="text-[12px] text-gojo-ink-muted">
          Слов в деке: {unit.vocabCount} · уроков привязано: {unit.lessonCount}. Удаление оставит
          слова на уровне без юнита; выданные карточки у студентов не пропадут.
        </p>
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          className="mt-3 w-full"
          onClick={() =>
            startDelete(async () => {
              const formData = new FormData();
              formData.set("unitId", unit.id);
              await deleteUnitAction(formData);
              toast.success("Юнит удалён");
              router.refresh();
              onSuccess();
            })
          }
        >
          {deleting ? "Удаляем…" : "Удалить юнит"}
        </Button>
      </div>
    </div>
  );
}

function VocabPanel({
  vocab,
  units,
  onSuccess,
}: {
  vocab: LevelVocabDto;
  units: TeacherUnit[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    updateVocabAction,
    {},
  );
  const router = useRouter();
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Слово сохранено");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  return (
    <div>
      <form action={formAction} className="space-y-5">
        <Input type="hidden" name="vocabId" value={vocab.id} />
        <Field>
          <FieldLabel htmlFor={`vocab-word-${vocab.id}`}>Слово</FieldLabel>
          <Input
            id={`vocab-word-${vocab.id}`}
            name="word"
            defaultValue={vocab.word}
            required
            className="g-jp"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`vocab-reading-${vocab.id}`}>Чтение</FieldLabel>
          <Input
            id={`vocab-reading-${vocab.id}`}
            name="reading"
            defaultValue={vocab.reading}
            required
            className="g-jp"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`vocab-meaning-${vocab.id}`}>Значение</FieldLabel>
          <Input
            id={`vocab-meaning-${vocab.id}`}
            name="meaning"
            defaultValue={vocab.meaning}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`vocab-unit-${vocab.id}`}>Юнит</FieldLabel>
          <NativeSelect
            id={`vocab-unit-${vocab.id}`}
            name="unitId"
            defaultValue={vocab.unitId ?? ""}
          >
            <option value="">— без юнита —</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                Юнит {unit.position} · {unit.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
        <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
          {pending ? "Сохраняем…" : "Сохранить слово"}
        </Button>
      </form>

      <div className="mt-7 border-t border-gojo-ink/10 pt-5">
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          className="w-full"
          onClick={() =>
            startDelete(async () => {
              const formData = new FormData();
              formData.set("vocabId", vocab.id);
              await deleteVocabAction(formData);
              toast.success("Слово удалено");
              router.refresh();
              onSuccess();
            })
          }
        >
          {deleting ? "Удаляем…" : "Удалить слово"}
        </Button>
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function ResendInviteButton({
  studentId,
  lastSentAt,
  lastLoginAt,
}: {
  studentId: string;
  lastSentAt: string | null;
  lastLoginAt: string | null;
}) {
  const [state, formAction, pending] = useActionState<ResendInviteState, FormData>(
    resendStudentInviteAction,
    {},
  );
  const [cooldown, setCooldown] = useState(0);
  const [sentNow, setSentNow] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!state.ok) return;
    const channels = [state.sentEmail ? "email" : null, state.sentTelegram ? "Telegram" : null]
      .filter(Boolean)
      .join(" и ");
    toast.success(`Приглашение отправлено: ${channels}`);
    setSentNow(true);
    setCooldown(60);
  }, [state]);

  const alreadySent = sentNow || Boolean(lastSentAt);

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="studentId" value={studentId} />
      <Button
        type="submit"
        variant="outline"
        disabled={pending || cooldown > 0}
        className="w-full rounded-xl"
      >
        {pending
          ? "Отправляем..."
          : cooldown > 0
            ? `Отправлено · повторно через 0:${String(cooldown).padStart(2, "0")}`
            : alreadySent
              ? "Отправить приглашение ещё раз"
              : "Отправить приглашение для входа"}
      </Button>
      <p className="mt-1.5 text-center text-[12px] text-gojo-ink-muted">
        {sentNow ? (
          "Приглашение отправлено только что"
        ) : lastSentAt ? (
          <>
            Последнее приглашение:{" "}
            <LocalTime
              iso={lastSentAt}
              options={{ day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }}
            />
          </>
        ) : (
          "Приглашение ещё не отправлялось"
        )}
        {" · "}
        {lastLoginAt ? (
          <>
            входил <LocalTime iso={lastLoginAt} options={{ day: "numeric", month: "long" }} />
          </>
        ) : (
          <span className="font-semibold text-gojo-orange">на платформу ещё не входил</span>
        )}
      </p>
      {state.error ? <p className="mt-2 text-sm font-bold text-gojo-error">{state.error}</p> : null}
    </form>
  );
}

function NewAdminPanel({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    createAdminAction,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Администратор создан, приглашение отправлено");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  return (
    <form action={formAction} className="space-y-5">
      <Field>
        <FieldLabel htmlFor="new-admin-name">Имя</FieldLabel>
        <Input id="new-admin-name" name="name" required placeholder="Имя Фамилия" />
      </Field>
      <Field>
        <FieldLabel htmlFor="new-admin-nickname">Отображаемое имя</FieldLabel>
        <Input id="new-admin-nickname" name="nickname" placeholder="Как показывать в интерфейсе" />
      </Field>
      <Field>
        <FieldLabel htmlFor="new-admin-email">Email</FieldLabel>
        <Input
          id="new-admin-email"
          name="email"
          type="email"
          required
          placeholder="teacher@gojolearn.ru"
        />
      </Field>
      {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl">
        {pending ? "Отправляем..." : "Отправить приглашение"}
      </Button>
    </form>
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
      <p className="mt-3 text-center text-[12px] text-gojo-ink-muted">
        {student.inviteLastSentAt ? (
          <>
            Приглашение отправлено{" "}
            <LocalTime iso={student.inviteLastSentAt} options={{ day: "numeric", month: "long" }} />
          </>
        ) : (
          "Приглашение не отправлялось"
        )}
        {" · "}
        {student.lastLoginAt ? (
          <>
            входил{" "}
            <LocalTime iso={student.lastLoginAt} options={{ day: "numeric", month: "long" }} />
          </>
        ) : (
          <span className="font-semibold text-gojo-orange">ещё не входил</span>
        )}
      </p>

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
              if (planId === "recorded-30" && !accessEndDate) {
                const defaultEnd = new Date();
                defaultEnd.setDate(defaultEnd.getDate() + 30);
                setAccessEndDate(formatDateInput(defaultEnd));
              }
              if (
                (planId === "individual-8" || planId === "group-8") &&
                Number(lessonCredits) < 1
              ) {
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
        {assignedPlanId === "recorded-30" ? (
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
        ) : assignedPlanId === "individual-8" || assignedPlanId === "group-8" ? (
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

// The lead drawer is state-driven: one primary action per lifecycle state,
// expanding inline (progressive disclosure) instead of opening another layer.
// Status is machine-driven; the only manual override is reject. The CRM
// overlay (contacts, follow-up, notes) is always editable underneath.
type LeadSubAction = "trial" | "trialDone" | "sendLink" | "reject";

function LeadPanel({
  lead,
  linkedStudent,
  trialLesson,
  onOpenLesson,
  onSuccess,
}: {
  lead: TeacherLeadDto;
  linkedStudent: StudentDirectoryEntry | null;
  trialLesson: TeacherLessonDto | null;
  onOpenLesson: (lesson: TeacherLessonDto) => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    updateLeadAction,
    {},
  );
  const router = useRouter();
  const [action, setAction] = useState<LeadSubAction | null>(null);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Заявка сохранена");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  // No reset-on-transition effect needed: each state only reads its own
  // sub-action value, so a stale `action` from the previous state is inert.
  const rejectable = ["new", "contacted", "trial_booked", "trial_done"].includes(lead.status);

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
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline">{lead.kind}</Badge>
            {lead.assessedLevel ? <Badge variant="outline">{lead.assessedLevel}</Badge> : null}
          </div>
        </div>
        {lead.goal || lead.level ? (
          <p className="mt-4 border-t border-gojo-ink/10 pt-3 text-sm text-gojo-ink-muted">
            {[lead.level, lead.goal].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      {trialLesson ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => onOpenLesson(trialLesson)}
        >
          Пробный урок{lead.assessedLevel ? " · пройден" : ""} <ArrowUpRight />
        </Button>
      ) : null}

      <LeadStateAction
        lead={lead}
        action={action}
        setAction={setAction}
        linkedStudent={linkedStudent}
      />

      {rejectable ? (
        action === "reject" ? (
          <LeadRejectConfirm lead={lead} onCancel={() => setAction(null)} />
        ) : (
          <button
            type="button"
            onClick={() => setAction("reject")}
            className="w-full text-center text-sm font-bold text-gojo-error hover:underline"
          >
            Отклонить лид
          </button>
        )
      ) : null}

      <form action={formAction} className="space-y-5 border-t border-gojo-ink/10 pt-6">
        <Input type="hidden" name="leadId" value={lead.id} />
        <Field>
          <FieldLabel htmlFor={`lead-name-${lead.id}`}>Имя</FieldLabel>
          <Input id={`lead-name-${lead.id}`} name="name" defaultValue={lead.name} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor={`lead-email-${lead.id}`}>Email</FieldLabel>
            <Input
              id={`lead-email-${lead.id}`}
              name="email"
              type="email"
              defaultValue={lead.email ?? ""}
              placeholder="—"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`lead-phone-${lead.id}`}>Телефон</FieldLabel>
            <Input
              id={`lead-phone-${lead.id}`}
              name="phone"
              defaultValue={lead.phone ?? ""}
              placeholder="—"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`lead-telegram-${lead.id}`}>Telegram (ник)</FieldLabel>
          <Input
            id={`lead-telegram-${lead.id}`}
            name="telegram"
            defaultValue={lead.telegram ?? ""}
            placeholder="@username"
          />
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
    </div>
  );
}

// One primary action per state; anything else simply does not exist in that
// state. The action expands in place and collapses once the transition lands.
function LeadStateAction({
  lead,
  action,
  setAction,
  linkedStudent,
}: {
  lead: TeacherLeadDto;
  action: LeadSubAction | null;
  setAction: (action: LeadSubAction | null) => void;
  linkedStudent: StudentDirectoryEntry | null;
}) {
  switch (lead.status) {
    case "new":
    case "contacted":
      if (lead.trialLessonId) return null;
      return action === "trial" ? (
        <LeadTrialForm lead={lead} onCancel={() => setAction(null)} />
      ) : (
        <Button type="button" className="w-full" onClick={() => setAction("trial")}>
          Назначить пробный урок
        </Button>
      );
    case "trial_booked":
      return action === "trialDone" ? (
        <LeadTrialDoneForm lead={lead} onCancel={() => setAction(null)} />
      ) : (
        <div className="space-y-2">
          <Button type="button" className="w-full" onClick={() => setAction("trialDone")}>
            Пробный пройден
          </Button>
          <p className="text-center text-xs text-gojo-ink-muted">
            После урока отметьте результат — уровень выставляется тем же действием.
          </p>
        </div>
      );
    case "trial_done":
      return action === "sendLink" ? (
        <LeadSendLinkConfirm lead={lead} onCancel={() => setAction(null)} />
      ) : lead.email || lead.telegramId ? (
        <Button type="button" className="w-full" onClick={() => setAction("sendLink")}>
          Отправить ссылку для входа
        </Button>
      ) : (
        <div className="rounded-xl border border-gojo-ink/10 bg-gojo-paper-2 p-3.5 text-sm text-gojo-ink-muted">
          Ссылку некуда отправить — добавьте email в форме ниже. Telegram-ник без нажатия «Start» в
          боте не работает как канал.
        </div>
      );
    case "link_sent":
    case "converted":
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-gojo-ink/10 bg-gojo-paper-2 p-3.5 text-sm text-gojo-ink-muted">
            {lead.status === "link_sent"
              ? "Ссылка отправлена, аккаунт создан. Заявка станет «Конвертирована», когда клиент впервые войдёт."
              : "Аккаунт создан, клиент уже входил."}
          </div>
          {lead.studentId ? (
            <Link
              href={`/teacher/students/${lead.studentId}`}
              className={buttonVariants({ variant: "secondary", className: "w-full" })}
            >
              Открыть студента <ArrowUpRight />
            </Link>
          ) : null}
          {lead.studentId && linkedStudent ? (
            <ResendInviteButton
              studentId={lead.studentId}
              lastSentAt={linkedStudent.inviteLastSentAt}
              lastLoginAt={linkedStudent.lastLoginAt}
            />
          ) : null}
        </div>
      );
    default:
      return null;
  }
}

function LeadTrialForm({ lead, onCancel }: { lead: TeacherLeadDto; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    createTrialLessonAction,
    {},
  );
  const router = useRouter();
  const [title, setTitle] = useState(`Пробный урок · ${lead.name}`);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState("50");
  const [today, setToday] = useState("");

  useEffect(() => {
    const now = new Date();
    setToday(formatDateInput(now));
    setDate(formatDateInput(new Date(now.getTime() + 86_400_000)));
  }, []);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Пробный урок создан и привязан к заявке");
    router.refresh();
  }, [router, state.ok]);

  const startsAt = localDateTimeIso(date, time);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-gojo-orange/40 p-4">
      <Input type="hidden" name="leadId" value={lead.id} />
      <Input type="hidden" name="startsAt" value={startsAt} />
      <h3 className="font-bold">Пробный урок</h3>
      <Input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <TimeZoneNote />
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="date"
          type="date"
          min={today}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
        <Input
          name="time"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          required
        />
      </div>
      <NativeSelect
        name="duration"
        value={duration}
        onChange={(event) => setDuration(event.target.value)}
      >
        <option value="30">30 минут</option>
        <option value="50">50 минут</option>
        <option value="60">60 минут</option>
      </NativeSelect>
      <Field>
        <FieldLabel htmlFor={`trial-meeting-url-${lead.id}`}>Ссылка на встречу</FieldLabel>
        <Input
          id={`trial-meeting-url-${lead.id}`}
          name="meetingUrl"
          type="url"
          placeholder="https://meet.google.com/..."
        />
      </Field>
      {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending || !startsAt}>
          {pending ? "Создаём..." : "Создать урок"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

function LeadTrialDoneForm({ lead, onCancel }: { lead: TeacherLeadDto; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    markTrialDoneAction,
    {},
  );
  const router = useRouter();
  const [level, setLevel] = useState(lead.assessedLevel ?? "");

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Пробный отмечен — можно отправлять ссылку для входа");
    router.refresh();
  }, [router, state.ok]);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-gojo-orange/40 p-4">
      <Input type="hidden" name="leadId" value={lead.id} />
      <div>
        <h3 className="font-bold">Итог пробного урока</h3>
        <p className="mt-1 text-sm text-gojo-ink-muted">
          Уровень обязателен: он уйдёт в аккаунт студента вместе со ссылкой для входа.
        </p>
      </div>
      <Field>
        <FieldLabel htmlFor={`trial-level-${lead.id}`}>JLPT по итогам урока</FieldLabel>
        <NativeSelect
          id={`trial-level-${lead.id}`}
          name="jlptLevel"
          required
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        >
          <option value="" disabled>
            Выбери уровень
          </option>
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
          <option value="N2">N2</option>
        </NativeSelect>
      </Field>
      {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending || !level}>
          {pending ? "Сохраняем..." : "Пробный пройден"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

// Send-link is a confirm, not a form: the channel is derived from the lead's
// data, previewed before the irreversible outbound send.
function LeadSendLinkConfirm({ lead, onCancel }: { lead: TeacherLeadDto; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState<SendLeadLinkState, FormData>(
    sendLeadLinkAction,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    const channels = [state.sentEmail ? "email" : null, state.sentTelegram ? "Telegram" : null]
      .filter(Boolean)
      .join(" и ");
    toast.success(channels ? `Ссылка отправлена: ${channels}` : "Ссылка отправлена");
    router.refresh();
  }, [router, state]);

  const channelPreview = [
    lead.email ? `magic-link на ${lead.email}` : null,
    lead.telegramId ? "кнопка от бота в Telegram" : null,
  ]
    .filter(Boolean)
    .join(" и ");

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-gojo-orange/40 p-4">
      <Input type="hidden" name="leadId" value={lead.id} />
      <div>
        <h3 className="font-bold">Отправить ссылку для входа</h3>
        <p className="mt-1 text-sm text-gojo-ink-muted">
          Создаст аккаунт с уровнем {lead.assessedLevel ?? "—"} и отправит {channelPreview}. Оплата
          и доступ к контенту — отдельно, после входа.
        </p>
      </div>
      {state.matches?.length ? (
        <div className="space-y-2">
          <p className="text-sm font-bold">
            Студент с таким контактом уже существует — привяжи заявку:
          </p>
          {state.matches.map((match) => (
            <Button
              key={match.id}
              type="submit"
              name="existingStudentId"
              value={match.id}
              variant="outline"
              className="h-auto w-full justify-start py-2.5 text-left"
              disabled={pending}
            >
              <span>
                <span className="block font-bold">{match.name}</span>
                <span className="block text-xs font-normal text-gojo-ink-muted">
                  {[
                    match.email.endsWith("@telegram.gojo.local") ? null : match.email,
                    match.telegramUsername ? `@${match.telegramUsername}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </Button>
          ))}
        </div>
      ) : null}
      {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
      <div className="flex gap-2">
        {state.matches?.length ? null : (
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Отправляем..." : "Отправить"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Отмена
        </Button>
      </div>
    </form>
  );
}

function LeadRejectConfirm({ lead, onCancel }: { lead: TeacherLeadDto; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(
    rejectLeadAction,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Заявка отклонена");
    router.refresh();
  }, [router, state.ok]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-gojo-error/30 bg-gojo-error-soft/40 p-4"
    >
      <Input type="hidden" name="leadId" value={lead.id} />
      <p className="text-sm">Заявка уйдёт в «Отклонена» — это терминальное состояние.</p>
      {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" className="flex-1" disabled={pending}>
          {pending ? "Отклоняем..." : "Отклонить"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Отмена
        </Button>
      </div>
    </form>
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
