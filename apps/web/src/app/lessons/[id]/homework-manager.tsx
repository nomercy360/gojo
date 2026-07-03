"use client";

import type { HomeworkStatus } from "@gojo/shared";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { LessonStudentDto } from "@/lib/api";
import { setHomeworkStatusAction } from "./homework-actions";

const STATUS_LABEL: Record<HomeworkStatus, string> = {
  pending: "Не отмечено",
  done: "Сдано",
  missed: "Не сдано",
};

const STATUS_CLASS: Record<HomeworkStatus, string> = {
  pending: "border-gojo-ink/20 text-gojo-ink-muted",
  done: "border-gojo-ink bg-gojo-orange text-white",
  missed: "border-gojo-error bg-gojo-error-soft text-gojo-error",
};

export function HomeworkManager({
  lessonId,
  initialStudents,
}: {
  lessonId: string;
  initialStudents: LessonStudentDto[];
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось");
      }
    });
  }

  if (students.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-[22px] font-bold">Домашнее задание</h2>
      <p className="mt-1 text-[13px] text-gojo-ink-muted">
        Отметь, кто сдал домашку по этому уроку.
      </p>

      <ul className="mt-4 space-y-2">
        {students.map((s) => (
          <li
            key={s.studentId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-gojo-ink bg-gojo-surface p-3"
          >
            <div className="min-w-0">
              <div className="truncate font-bold">{s.nickname ?? s.email}</div>
              <div className="text-[11px] text-gojo-ink-muted">
                {STATUS_LABEL[s.homeworkStatus]}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {(["missed", "done"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus(s.studentId, status)}
                  className={`rounded-md border-2 px-3 py-1.5 text-[11px] font-bold disabled:opacity-50 ${
                    s.homeworkStatus === status
                      ? STATUS_CLASS[status]
                      : "border-gojo-ink/20 text-gojo-ink-muted hover:border-gojo-ink"
                  }`}
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
