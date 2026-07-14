"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { StudentDirectoryEntry } from "@/lib/api";
import { useActionState } from "react";
import { type TeacherActionState, createLessonAction } from "./actions";

const initial: TeacherActionState = {};

export function CreateLessonForm({ students }: { students: StudentDirectoryEntry[] }) {
  const [state, formAction, pending] = useActionState(createLessonAction, initial);

  const today = formatDateInput(new Date());
  const tomorrow = formatDateInput(new Date(Date.now() + 86400000));

  return (
    <Card className="p-6">
      <h2 className="font-serif text-[22px] font-bold">Новый урок</h2>
      <form action={formAction} className="mt-5 space-y-4">
        <FieldSet>
          <FieldLegend variant="label">Студенты (до 8)</FieldLegend>
          {students.length === 0 ? (
            <p className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-sm text-gojo-ink-muted">
              Нет студентов. Сначала создай студента.
            </p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-black/10 bg-gojo-surface p-2">
              {students.map((s) => (
                <label
                  key={s.id}
                  htmlFor={`student-${s.id}`}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-2 text-sm hover:bg-black/[0.03]"
                >
                  <Input
                    unstyled
                    id={`student-${s.id}`}
                    type="checkbox"
                    name="studentIds"
                    value={s.id}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-bold">{s.name}</span>
                    <span className="block text-xs text-gojo-ink-muted">{s.email}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </FieldSet>
        <Field>
          <FieldLabel htmlFor="title">Название</FieldLabel>
          <Input id="title" name="title" required placeholder="Грамматика ～ばかり" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field>
            <FieldLabel htmlFor="date">Дата</FieldLabel>
            <Input id="date" name="date" type="date" required min={today} defaultValue={tomorrow} />
          </Field>
          <Field>
            <FieldLabel htmlFor="time">Время</FieldLabel>
            <Input id="time" name="time" type="time" required defaultValue="19:00" />
          </Field>
          <Field>
            <FieldLabel htmlFor="duration">Мин</FieldLabel>
            <NativeSelect id="duration" name="duration" defaultValue="50">
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="60">60</option>
              <option value="90">90</option>
            </NativeSelect>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="meetingUrl">
            Ссылка на встречу (Zoom / Meet, можно добавить позже)
          </FieldLabel>
          <Input id="meetingUrl" name="meetingUrl" type="url" placeholder="https://zoom.us/j/..." />
        </Field>

        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}
        {state.ok ? <p className="text-sm font-bold text-gojo-success">Урок создан!</p> : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Создаём..." : "Создать урок"}
        </Button>
      </form>
    </Card>
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
