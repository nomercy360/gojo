"use client";

import { Button } from "@/components/ui/button";
import type { LessonStudentDto } from "@/lib/api";
import { useActionState } from "react";
import {
  type TeacherActionState,
  addLessonStudentAction,
  removeLessonStudentAction,
} from "../../actions";

const initial: TeacherActionState = {};

export type RosterCandidate = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
};

export function RosterManager({
  lessonId,
  students,
  candidates,
}: {
  lessonId: string;
  students: LessonStudentDto[];
  candidates: RosterCandidate[];
}) {
  const [addState, addAction, addPending] = useActionState(addLessonStudentAction, initial);
  const [removeState, removeAction, removePending] = useActionState(
    removeLessonStudentAction,
    initial,
  );
  const onLesson = new Set(students.map((s) => s.studentId));
  const available = candidates.filter((c) => !onLesson.has(c.id));

  return (
    <div className="mt-3 rounded-md border border-black/10 bg-gojo-surface p-4">
      {students.length > 0 ? (
        <ul className="space-y-2">
          {students.map((s) => (
            <li key={s.studentId} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-bold">{s.nickname ?? s.email}</span>
                <span className="ml-2 text-gojo-ink-muted">{s.email}</span>
              </span>
              {s.attendanceStatus === "attended" ? (
                <span className="shrink-0 text-[11px] text-gojo-ink-muted">был на уроке</span>
              ) : (
                <form action={removeAction} className="shrink-0">
                  <input type="hidden" name="lessonId" value={lessonId} />
                  <input type="hidden" name="studentId" value={s.studentId} />
                  <Button type="submit" size="sm" variant="outline" disabled={removePending}>
                    Убрать
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gojo-ink-muted">На уроке пока нет студентов.</p>
      )}

      {available.length > 0 && students.length < 8 ? (
        <form action={addAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="lessonId" value={lessonId} />
          <select
            name="studentId"
            required
            defaultValue=""
            className="h-9 min-w-0 flex-1 rounded-md border border-black/15 bg-white px-3 text-sm"
          >
            <option value="" disabled>
              Добавить студента…
            </option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nickname ?? c.name} · {c.email}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={addPending}>
            {addPending ? "Добавляем..." : "Добавить"}
          </Button>
        </form>
      ) : null}

      {addState.error ? (
        <p className="mt-2 text-sm font-bold text-gojo-error">{addState.error}</p>
      ) : null}
      {removeState.error ? (
        <p className="mt-2 text-sm font-bold text-gojo-error">{removeState.error}</p>
      ) : null}
    </div>
  );
}
