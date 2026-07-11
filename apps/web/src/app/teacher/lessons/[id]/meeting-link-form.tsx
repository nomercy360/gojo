"use client";

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
        <input type="hidden" name="lessonId" value={lessonId} />
        <div className="min-w-0 flex-1">
          <label
            className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
            htmlFor="meetingUrl"
          >
            Ссылка на встречу (Zoom / Meet)
          </label>
          <input
            id="meetingUrl"
            name="meetingUrl"
            type="url"
            defaultValue={meetingUrl ?? ""}
            placeholder="https://zoom.us/j/..."
            className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-sm outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>
        <button type="submit" disabled={pending} className="g-btn-secondary shrink-0 text-sm">
          {pending ? "Сохраняем..." : "Сохранить"}
        </button>
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="g-btn-primary shrink-0 text-sm"
          >
            Войти ▸
          </a>
        ) : null}
      </form>
      {state.error ? (
        <p className="mt-2 text-sm font-bold text-gojo-error">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="mt-2 text-sm font-bold text-gojo-success">Ссылка сохранена</p>
      ) : null}
    </div>
  );
}
