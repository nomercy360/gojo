"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useActionState } from "react";
import { type TeacherActionState, updateMeetingUrlAction } from "../../actions";

const initial: TeacherActionState = {};

export function MeetingLinkForm({
  lessonId,
  meetingUrl,
}: {
  lessonId: string;
  meetingUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateMeetingUrlAction, initial);

  return (
    <div className="mt-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <Input type="hidden" name="lessonId" value={lessonId} />
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="meetingUrl">Ссылка на встречу (Zoom / Meet)</FieldLabel>
          <Input
            id="meetingUrl"
            name="meetingUrl"
            type="url"
            defaultValue={meetingUrl ?? ""}
            placeholder="https://zoom.us/j/..."
          />
        </Field>
        <Button type="submit" disabled={pending} variant="outline" className="shrink-0">
          {pending ? "Сохраняем..." : "Сохранить"}
        </Button>
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants(), "shrink-0")}
          >
            Войти ▸
          </a>
        ) : null}
      </form>
      {state.error ? <p className="mt-2 text-sm font-bold text-gojo-error">{state.error}</p> : null}
      {state.ok ? (
        <p className="mt-2 text-sm font-bold text-gojo-success">Ссылка сохранена</p>
      ) : null}
    </div>
  );
}
