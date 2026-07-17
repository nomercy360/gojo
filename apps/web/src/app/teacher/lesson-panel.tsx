"use client";

import { LessonCardsManager } from "@/app/lessons/[id]/cards-manager";
import { HomeworkManager } from "@/app/lessons/[id]/homework-manager";
import { TimeZoneNote } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type {
  LessonStudentDto,
  StudentDirectoryEntry,
  TeacherLessonDto,
  TeacherUnit,
} from "@/lib/api";
import type { LessonMaterialDto } from "@gojo/shared";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type LessonWorkData,
  type MaterialUploadState,
  type TeacherActionState,
  cancelLessonAction,
  deleteLessonMaterialAction,
  getLessonWorkAction,
  updateLessonAction,
  updateLessonRosterAction,
  uploadMaterialAction,
} from "./actions";
import { SubmissionsReview } from "./submissions-review";

const LESSON_STATUS: Record<string, string> = {
  scheduled: "Запланирован",
  in_progress: "Идёт сейчас",
  completed: "Завершён",
  cancelled: "Отменён",
};

const MAX_STUDENTS = 8;

/**
 * The whole lesson lives in this panel — schedule/meeting edits, roster,
 * attendance & homework, submissions, SRS cards and materials. The working
 * data is loaded on open; the workspace page only ships the lesson list.
 */
export function LessonPanel({
  lesson,
  units,
  directory,
  onSuccess,
}: {
  lesson: TeacherLessonDto;
  units: TeacherUnit[];
  directory: StudentDirectoryEntry[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [work, setWork] = useState<LessonWorkData | null>(null);
  const [workError, setWorkError] = useState<string | null>(null);

  const reloadWork = useCallback(async () => {
    try {
      setWork(await getLessonWorkAction(lesson.id));
      setWorkError(null);
    } catch {
      setWorkError("Не удалось загрузить данные урока");
    }
  }, [lesson.id]);

  useEffect(() => {
    setWork(null);
    void reloadWork();
  }, [reloadWork]);

  // Attendance/homework edits keep their own optimistic state inside
  // HomeworkManager; remount it only when the roster itself changes.
  const rosterKey = `${lesson.id}:${work?.students.map((s) => s.studentId).join(",") ?? ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-gojo-ink/10 bg-gojo-paper p-4">
        <div>
          <div className="text-xs text-gojo-ink-muted">Статус</div>
          <div className="mt-1">
            <Badge
              variant={
                lesson.status === "cancelled"
                  ? "destructive"
                  : lesson.status === "scheduled"
                    ? "default"
                    : "secondary"
              }
            >
              {LESSON_STATUS[lesson.status] ?? lesson.status}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gojo-ink-muted">Студенты</div>
          <div className="font-serif text-2xl font-bold">
            {work ? work.students.length : lesson.studentCount}
          </div>
        </div>
      </div>

      <LessonEditForm lesson={lesson} units={units} onSuccess={onSuccess} />

      <RosterField
        lessonId={lesson.id}
        cancelled={lesson.status === "cancelled"}
        students={work?.students ?? null}
        directory={directory}
        onChanged={async () => {
          await reloadWork();
          router.refresh();
        }}
      />

      {workError ? (
        <p className="text-sm font-bold text-gojo-error">{workError}</p>
      ) : !work ? (
        <p className="text-sm text-gojo-ink-muted">Загружаем данные урока…</p>
      ) : (
        <>
          <HomeworkManager
            key={`hw-${rosterKey}`}
            lessonId={lesson.id}
            initialStudents={work.students}
            onChanged={() => {
              void reloadWork();
              router.refresh();
            }}
          />
          <SubmissionsReview key={`sub-${lesson.id}`} initialSubmissions={work.submissions} />
          <LessonCardsManager
            key={`cards-${lesson.id}`}
            lessonId={lesson.id}
            initialCards={work.cards}
          />
          <MaterialsSection
            lessonId={lesson.id}
            materials={work.materials}
            onChanged={reloadWork}
          />
        </>
      )}

      {lesson.status === "scheduled" ? (
        <div className="border-t border-gojo-ink/10 pt-6">
          <form action={cancelLessonAction}>
            <Input type="hidden" name="lessonId" value={lesson.id} />
            <Button type="submit" variant="destructive" className="w-full">
              Отменить урок
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function LessonEditForm({
  lesson,
  units,
  onSuccess,
}: {
  lesson: TeacherLessonDto;
  units: TeacherUnit[];
  onSuccess: () => void;
}) {
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
  const [unitId, setUnitId] = useState(lesson.unitId ?? "");

  useEffect(() => {
    const localStart = new Date(lesson.startsAt);
    setTitle(lesson.title);
    setDate(formatDateInput(localStart));
    setTime(formatTimeInput(localStart));
    setDuration(String(durationMinutes(lesson)));
    setMeetingUrl(lesson.meetingUrl ?? "");
    setUnitId(lesson.unitId ?? "");
  }, [lesson]);

  const startsAt = localDateTimeIso(date, time);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Урок сохранён");
    router.refresh();
    onSuccess();
  }, [onSuccess, router, state.ok]);

  return (
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
      {units.length > 0 ? (
        <Field>
          <FieldLabel htmlFor={`unit-${lesson.id}`}>Юнит программы</FieldLabel>
          <NativeSelect
            id={`unit-${lesson.id}`}
            name="unitId"
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
          >
            <option value="">— без юнита —</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                Уровень {unit.levelId} · {unit.position}. {unit.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
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
  );
}

const ATTENDANCE_HINT: Record<string, string> = {
  attended: "был на уроке",
  no_show: "не пришёл",
  cancelled_by_student: "отмена студента",
  cancelled_by_teacher: "отмена учителя",
};

/**
 * Relation field, PocketBase-style: the current roster is shown as rows, and
 * the whole selection is edited through a records picker — a modal with
 * search over every existing student and checkboxes. Applying the selection
 * diffs it against the roster (add/remove) in one action.
 */
function RosterField({
  lessonId,
  cancelled,
  students,
  directory,
  onChanged,
}: {
  lessonId: string;
  cancelled: boolean;
  students: LessonStudentDto[] | null;
  directory: StudentDirectoryEntry[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const roster = students ?? [];
  const currentIds = useMemo(() => new Set(roster.map((s) => s.studentId)), [roster]);
  const attendedIds = useMemo(
    () => new Set(roster.filter((s) => s.attendanceStatus === "attended").map((s) => s.studentId)),
    [roster],
  );

  const openPicker = () => {
    setSelected(new Set(currentIds));
    setQuery("");
    setError(null);
    setOpen(true);
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru");
    if (!term) return directory;
    return directory.filter((s) =>
      [s.name, s.nickname, s.email]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("ru").includes(term)),
    );
  }, [directory, query]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const apply = () => {
    const add = [...selected].filter((id) => !currentIds.has(id));
    const remove = [...currentIds].filter((id) => !selected.has(id));
    if (add.length === 0 && remove.length === 0) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await updateLessonRosterAction(lessonId, add, remove);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Состав урока обновлён");
      await onChanged();
      setOpen(false);
    });
  };

  return (
    <div className="border-t border-gojo-ink/10 pt-5">
      <div className="g-mono text-[10px] font-bold uppercase tracking-[0.16em] text-gojo-ink-ghost">
        Студенты · {roster.length} из {MAX_STUDENTS}
      </div>

      {roster.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {roster.map((s) => (
            <li
              key={s.studentId}
              className="flex items-center justify-between gap-3 rounded-lg border border-gojo-ink/10 bg-gojo-paper px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-bold">{s.nickname ?? s.email}</span>
                <span className="block truncate text-xs text-gojo-ink-muted">{s.email}</span>
              </span>
              {ATTENDANCE_HINT[s.attendanceStatus] ? (
                <span className="shrink-0 text-[11px] text-gojo-ink-muted">
                  {ATTENDANCE_HINT[s.attendanceStatus]}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gojo-ink-muted">На уроке пока нет студентов.</p>
      )}

      {!cancelled ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          disabled={students === null}
          onClick={openPicker}
        >
          Выбрать студентов
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Студенты урока</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gojo-ink-muted" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по имени или email..."
              className="pl-9"
            />
          </div>

          <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border border-gojo-ink/10 bg-gojo-paper p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-gojo-ink-muted">
                Никого не нашлось.
              </p>
            ) : (
              filtered.map((s) => {
                const checked = selected.has(s.id);
                const locked = attendedIds.has(s.id);
                const full = !checked && selected.size >= MAX_STUDENTS;
                return (
                  <label
                    key={s.id}
                    htmlFor={`pick-${lessonId}-${s.id}`}
                    className={
                      locked || full
                        ? "flex cursor-not-allowed items-start gap-2.5 rounded-md px-2 py-2 text-sm opacity-60"
                        : "flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-gojo-ink/5"
                    }
                  >
                    <Input
                      unstyled
                      id={`pick-${lessonId}-${s.id}`}
                      type="checkbox"
                      checked={checked}
                      disabled={locked || full}
                      onChange={(event) => toggle(s.id, event.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{s.nickname ?? s.name}</span>
                      <span className="block truncate text-xs text-gojo-ink-muted">
                        {s.email}
                        {locked ? " · был на уроке — нельзя убрать" : ""}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {error ? <p className="text-sm font-bold text-gojo-error">{error}</p> : null}

          <DialogFooter className="items-center sm:justify-between">
            <span className="text-xs font-bold text-gojo-ink-muted">
              Выбрано: {selected.size} из {MAX_STUDENTS}
            </span>
            <Button type="button" onClick={apply} disabled={pending}>
              {pending ? "Сохраняем..." : "Применить выбор"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaterialsSection({
  lessonId,
  materials,
  onChanged,
}: {
  lessonId: string;
  materials: LessonMaterialDto[];
  onChanged: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState<MaterialUploadState, FormData>(
    uploadMaterialAction,
    {},
  );
  const [deleting, startDelete] = useTransition();
  const [formRevision, setFormRevision] = useState(0);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Материал загружен");
    setFormRevision((current) => current + 1);
    void onChanged();
  }, [onChanged, state]);

  return (
    <section className="border-t border-gojo-ink/10 pt-5">
      <div className="g-mono text-[10px] font-bold uppercase tracking-[0.16em] text-gojo-ink-ghost">
        Материалы · {materials.length}
      </div>

      {materials.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {materials.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gojo-ink/10 bg-gojo-paper px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{m.title}</p>
                <p className="text-[11px] text-gojo-ink-muted">
                  {m.fileType || "file"} · {new Date(m.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={m.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Открыть
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-gojo-error"
                  disabled={deleting}
                  onClick={() =>
                    startDelete(async () => {
                      const formData = new FormData();
                      formData.set("lessonId", lessonId);
                      formData.set("materialId", m.id);
                      await deleteLessonMaterialAction(formData);
                      toast.success("Материал удалён");
                      await onChanged();
                    })
                  }
                >
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gojo-ink-muted">Материалы пока не добавлены.</p>
      )}

      <form key={formRevision} action={formAction} className="mt-3 space-y-3">
        <Input type="hidden" name="lessonId" value={lessonId} />
        <div className="grid grid-cols-[1fr_1.2fr] gap-3">
          <Input name="title" placeholder="Название" />
          <Input name="file" type="file" required />
        </div>
        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
        <Button type="submit" disabled={pending} variant="secondary" size="sm">
          {pending ? "Загружаем..." : "+ Загрузить материал"}
        </Button>
      </form>
    </section>
  );
}

function durationMinutes(lesson: TeacherLessonDto) {
  return Math.round(
    (new Date(lesson.endsAt).getTime() - new Date(lesson.startsAt).getTime()) / 60000,
  );
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
