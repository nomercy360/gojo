"use client";

import { TimeZoneNote } from "@/components/local-time";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { StudentDirectoryEntry } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { type TeacherActionState, createLessonAction } from "./actions";

const initial: TeacherActionState = {};

export function CreateLessonForm({
  students,
  presentation = "card",
  onSuccess,
}: {
  students: StudentDirectoryEntry[];
  presentation?: "card" | "plain";
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createLessonAction, initial);
  const router = useRouter();
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState("50");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [today, setToday] = useState("");
  const [formRevision, setFormRevision] = useState(0);

  useEffect(() => {
    const now = new Date();
    setToday(formatDateInput(now));
    setDate(formatDateInput(new Date(now.getTime() + 86_400_000)));
  }, []);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Урок создан");
    router.refresh();
    onSuccess?.();
  }, [onSuccess, router, state.ok]);

  // React server actions reset the native form after submission. Remount it
  // from our controlled state after an error so checkboxes/selects are restored too.
  useEffect(() => {
    if (state.error) setFormRevision((current) => current + 1);
  }, [state]);

  const startsAt = localDateTimeIso(date, time);

  const form = (
    <>
      {presentation === "card" ? (
        <h2 className="font-serif text-[22px] font-bold">Новый урок</h2>
      ) : null}
      <form
        key={formRevision}
        action={formAction}
        onReset={(event) => event.preventDefault()}
        className={presentation === "card" ? "mt-5 space-y-4" : "space-y-5"}
      >
        <Input type="hidden" name="startsAt" value={startsAt} />
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
                    checked={studentIds.includes(s.id)}
                    onChange={(event) =>
                      setStudentIds((current) =>
                        event.target.checked
                          ? [...current, s.id]
                          : current.filter((id) => id !== s.id),
                      )
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-bold">{s.nickname ?? s.name}</span>
                    <span className="block text-xs text-gojo-ink-muted">{s.email}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </FieldSet>
        <Field>
          <FieldLabel htmlFor="title">Название</FieldLabel>
          <Input
            id="title"
            name="title"
            required
            placeholder="Грамматика ～ばかり"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <TimeZoneNote />
        <div className="grid grid-cols-3 gap-3">
          <Field>
            <FieldLabel htmlFor="date">Дата</FieldLabel>
            <Input
              id="date"
              name="date"
              type="date"
              required
              min={today}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="time">Время</FieldLabel>
            <Input
              id="time"
              name="time"
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="duration">Мин</FieldLabel>
            <NativeSelect
              id="duration"
              name="duration"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            >
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
          <Input
            id="meetingUrl"
            name="meetingUrl"
            type="url"
            placeholder="https://zoom.us/j/..."
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.target.value)}
          />
        </Field>

        {state.error ? <p className="text-sm font-bold text-gojo-error">{state.error}</p> : null}

        <Button type="submit" disabled={pending || !startsAt} className="w-full">
          {pending ? "Создаём..." : "Создать урок"}
        </Button>
      </form>
    </>
  );

  return presentation === "card" ? <Card className="p-6">{form}</Card> : form;
}

function localDateTimeIso(date: string, time: string) {
  if (!date || !time) return "";
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
