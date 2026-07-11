"use client";

import type { TeacherStudentProfileDto } from "@/lib/api";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { type StudentFormState, updateStudentAction } from "./actions";

const initial: StudentFormState = {};

const JLPT_LEVELS = ["N5", "N4", "N3", "N2"] as const;

export function StudentIdentityForm({
  student,
}: {
  student: TeacherStudentProfileDto["student"];
}) {
  const [state, formAction, pending] = useActionState(updateStudentAction, initial);

  useEffect(() => {
    if (state.ok) toast.success("Сохранено");
  }, [state.ok]);

  return (
    <form
      key={`${student.name}-${student.nickname}-${student.email}-${student.jlptLevel}-${student.quizLevel}`}
      action={formAction}
      className="mt-5 grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="studentId" value={student.id} />
      <Field label="Имя" name="name" defaultValue={student.name} />
      <Field label="Никнейм" name="nickname" defaultValue={student.nickname ?? ""} />
      <Field label="Email" name="email" type="email" defaultValue={student.email} />
      <div>
        <label
          className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
          htmlFor="jlptLevel"
        >
          JLPT
        </label>
        <select
          id="jlptLevel"
          name="jlptLevel"
          defaultValue={student.jlptLevel ?? ""}
          className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
        >
          <option value="">не выставлен</option>
          {JLPT_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      </div>
      <Field label="Квиз-уровень" name="quizLevel" defaultValue={student.quizLevel ?? ""} />

      {state.error ? (
        <p className="text-sm font-bold text-gojo-error sm:col-span-2">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="g-btn-secondary text-sm sm:col-span-2 sm:w-fit"
      >
        {pending ? "Сохраняем..." : "Сохранить профиль"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
      />
    </div>
  );
}
