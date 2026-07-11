"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  markPaidAction,
  markUnpaidAction,
  type StudentFormState,
  updateAccessAction,
} from "./actions";

const initial: StudentFormState = {};

export function StudentAccessForm({
  studentId,
  activeUntil,
  lessonCredits,
  assignedPlanId,
}: {
  studentId: string;
  activeUntil: string | null;
  lessonCredits: number;
  assignedPlanId: string | null;
}) {
  const [editState, editAction, editPending] = useActionState(updateAccessAction, initial);
  const [paidState, paidAction, paidPending] = useActionState(markPaidAction, initial);
  const [unpaidState, unpaidAction, unpaidPending] = useActionState(markUnpaidAction, initial);

  useEffect(() => {
    if (editState.ok) toast.success("Статус оплаты сохранён");
  }, [editState.ok]);
  useEffect(() => {
    if (paidState.ok) toast.success("Отмечено как оплачено");
  }, [paidState.ok]);
  useEffect(() => {
    if (unpaidState.ok) toast.success("Отмечено как не оплачено");
  }, [unpaidState.ok]);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-3">
        <form action={paidAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="assignedPlanId" value={assignedPlanId ?? ""} />
          <button type="submit" disabled={paidPending} className="g-btn-primary text-sm">
            {paidPending ? "..." : "Отметить оплаченным"}
          </button>
        </form>
        <form action={unpaidAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <button type="submit" disabled={unpaidPending} className="g-btn-secondary text-sm">
            {unpaidPending ? "..." : "Отметить неоплаченным"}
          </button>
        </form>
      </div>
      {paidState.error ? <p className="text-sm font-bold text-gojo-error">{paidState.error}</p> : null}
      {unpaidState.error ? (
        <p className="text-sm font-bold text-gojo-error">{unpaidState.error}</p>
      ) : null}

      <form
        key={`${activeUntil ?? ""}-${lessonCredits}`}
        action={editAction}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="studentId" value={studentId} />
        <div>
          <label
            className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
            htmlFor="activeUntil"
          >
            Активен до
          </label>
          <input
            id="activeUntil"
            name="activeUntil"
            type="date"
            defaultValue={activeUntil ? activeUntil.slice(0, 10) : ""}
            className="rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
            htmlFor="lessonCredits"
          >
            Кредиты уроков
          </label>
          <input
            id="lessonCredits"
            name="lessonCredits"
            type="number"
            min={0}
            defaultValue={lessonCredits}
            className="w-32 rounded-md border border-black/10 bg-gojo-surface px-3 py-2 text-sm outline-none focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>
        <button type="submit" disabled={editPending} className="g-btn-secondary text-sm">
          {editPending ? "Сохраняем..." : "Сохранить вручную"}
        </button>
      </form>
      {editState.error ? <p className="text-sm font-bold text-gojo-error">{editState.error}</p> : null}
    </div>
  );
}
