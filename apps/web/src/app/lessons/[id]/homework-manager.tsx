"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { AttendanceStatus, LessonStudentDto } from "@/lib/api";
import { quizLevelLabel } from "@/lib/quiz-level";
import type { HomeworkStatus, JlptLevel } from "@gojo/shared";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  setHomeworkStatusAction,
  setStudentLevelAction,
  updatePostLessonAction,
} from "./homework-actions";

const STATUS_LABEL: Record<HomeworkStatus, string> = {
  pending: "Не отмечено",
  done: "Сдано",
  missed: "Не сдано",
};

const STATUS_CLASS: Record<HomeworkStatus, string> = {
  pending: "border-black/10 text-gojo-ink-muted",
  done: "border-transparent bg-gojo-orange text-white",
  missed: "border-gojo-error/40 bg-gojo-error-soft text-gojo-error",
};

const JLPT_LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2"];

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  scheduled: "Не отмечено",
  attended: "Был",
  no_show: "Не пришёл",
  cancelled_by_student: "Отмена студента",
  cancelled_by_teacher: "Отмена учителя",
};

export function HomeworkManager({
  lessonId,
  initialStudents,
  onChanged,
}: {
  lessonId: string;
  initialStudents: LessonStudentDto[];
  onChanged?: () => void;
}) {
  const [students, setStudents] = useState(initialStudents);
  const [pending, startTransition] = useTransition();

  function setStatus(studentId: string, status: HomeworkStatus) {
    startTransition(async () => {
      try {
        const updated = await setHomeworkStatusAction(lessonId, studentId, status);
        setStudents((list) =>
          list.map((s) =>
            s.studentId === studentId
              ? { ...s, homeworkStatus: updated.status, homeworkMarkedAt: updated.markedAt }
              : s,
          ),
        );
        onChanged?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось");
      }
    });
  }

  function setLevel(studentId: string, jlptLevel: JlptLevel) {
    startTransition(async () => {
      try {
        const updated = await setStudentLevelAction(lessonId, studentId, jlptLevel);
        setStudents((list) =>
          list.map((s) => (s.studentId === studentId ? { ...s, jlptLevel: updated.jlptLevel } : s)),
        );
        toast.success("Уровень обновлён");
        onChanged?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось");
      }
    });
  }

  function setAttendance(studentId: string, attendanceStatus: AttendanceStatus) {
    startTransition(async () => {
      try {
        const updated = await updatePostLessonAction(lessonId, studentId, { attendanceStatus });
        setStudents((list) =>
          list.map((s) =>
            s.studentId === studentId ? { ...s, attendanceStatus: updated.attendanceStatus } : s,
          ),
        );
        onChanged?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось");
      }
    });
  }

  function saveNotes(studentId: string, formData: FormData) {
    startTransition(async () => {
      try {
        const updated = await updatePostLessonAction(lessonId, studentId, {
          postLessonNote: String(formData.get("postLessonNote") ?? "") || null,
          recommendation: String(formData.get("recommendation") ?? "") || null,
        });
        setStudents((list) =>
          list.map((s) =>
            s.studentId === studentId
              ? {
                  ...s,
                  postLessonNote: updated.postLessonNote,
                  recommendation: updated.recommendation,
                }
              : s,
          ),
        );
        toast.success("Заметки сохранены");
        onChanged?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось");
      }
    });
  }

  if (students.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-[22px] font-bold">Домашнее задание и уровень</h2>
      <p className="mt-1 text-[13px] text-gojo-ink-muted">
        Отметь, кто сдал домашку, и выставь официальный уровень после консультации.
      </p>

      <ul className="mt-4 space-y-2">
        {students.map((s) => (
          <li key={s.studentId} className="rounded-md border border-black/10 bg-gojo-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{s.nickname ?? s.email}</div>
                <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gojo-ink-muted">
                  <span>{STATUS_LABEL[s.homeworkStatus]}</span>
                  <span>· посещение: {ATTENDANCE_LABEL[s.attendanceStatus]}</span>
                  {s.quizLevel ? (
                    <span>· ориентир по квизу: {quizLevelLabel(s.quizLevel)}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <NativeSelect
                  value={s.jlptLevel ?? ""}
                  size="sm"
                  disabled={pending}
                  onChange={(e) => setLevel(s.studentId, e.target.value as JlptLevel)}
                  className="w-28 text-[11px] font-bold"
                >
                  <option value="" disabled>
                    Уровень
                  </option>
                  {JLPT_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  value={s.attendanceStatus}
                  size="sm"
                  disabled={pending}
                  onChange={(e) => setAttendance(s.studentId, e.target.value as AttendanceStatus)}
                  className="w-44 text-[11px] font-bold"
                >
                  {Object.entries(ATTENDANCE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
                {(["missed", "done"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(s.studentId, status)}
                    size="sm"
                    variant="outline"
                    className={`text-[11px] ${
                      s.homeworkStatus === status
                        ? STATUS_CLASS[status]
                        : "border-black/10 text-gojo-ink-muted hover:border-black/20"
                    }`}
                  >
                    {STATUS_LABEL[status]}
                  </Button>
                ))}
              </div>
            </div>
            <form
              action={(formData) => saveNotes(s.studentId, formData)}
              className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                name="postLessonNote"
                defaultValue={s.postLessonNote ?? ""}
                placeholder="Заметка по уроку"
              />
              <Input
                name="recommendation"
                defaultValue={s.recommendation ?? ""}
                placeholder="Следующий шаг"
              />
              <Button type="submit" disabled={pending} variant="secondary" size="sm">
                Сохранить
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
