"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { PaymentPlanDto } from "@gojo/shared";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { type CreateStudentState, createStudentAction } from "./actions";

const initial: CreateStudentState = {};

export function CreateStudentForm({
  plans,
  presentation = "card",
  onSuccess,
}: {
  plans: PaymentPlanDto[];
  presentation?: "card" | "plain";
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createStudentAction, initial);
  const router = useRouter();
  const [planId, setPlanId] = useState("");
  const [accessEndDate, setAccessEndDate] = useState("");
  const [lessonCredits, setLessonCredits] = useState("8");

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Студент создан — приглашение отправлено");
    router.refresh();
    onSuccess?.();
  }, [onSuccess, router, state.ok]);

  const form = (
    <>
      {presentation === "card" ? (
        <>
          <h2 className="font-serif text-[22px] font-bold">Новый студент</h2>
          <p className="mt-1 text-[13px] text-gojo-ink-muted">
            Создаёт аккаунт и отправляет студенту письмо со ссылкой для входа.
          </p>
        </>
      ) : null}
      <form
        action={formAction}
        className={presentation === "card" ? "mt-5 space-y-4" : "space-y-5"}
      >
        <Field>
          <FieldLabel htmlFor="name">Имя</FieldLabel>
          <Input id="name" name="name" required placeholder="Как зовут студента?" />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" required placeholder="student@example.com" />
        </Field>
        <Field>
          <FieldLabel htmlFor="nickname">
            Никнейм <span className="font-normal opacity-60">(необязательно)</span>
          </FieldLabel>
          <Input id="nickname" name="nickname" placeholder="Как будет отображаться в ЛК" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="telegramUsername">Telegram</FieldLabel>
            <Input id="telegramUsername" name="telegramUsername" placeholder="@username" />
          </Field>
          <Field>
            <FieldLabel htmlFor="telegramId">Telegram ID</FieldLabel>
            <Input
              id="telegramId"
              name="telegramId"
              type="number"
              min="1"
              placeholder="123456789"
            />
          </Field>
        </div>
        <p className="text-xs leading-relaxed text-gojo-ink-muted">
          Оба поля нужны, чтобы студент мог получать код для входа через Telegram.
        </p>
        <Field>
          <FieldLabel htmlFor="planId">Тариф и доступ</FieldLabel>
          <NativeSelect
            id="planId"
            name="planId"
            required
            value={planId}
            onChange={(event) => {
              const nextPlanId = event.target.value;
              setPlanId(nextPlanId);
              if (nextPlanId === "monthly-standard" && !accessEndDate) {
                const defaultEnd = new Date();
                defaultEnd.setDate(defaultEnd.getDate() + 30);
                setAccessEndDate(formatDateInput(defaultEnd));
              }
              if (nextPlanId === "bundle-8" && Number(lessonCredits) < 1) {
                setLessonCredits("8");
              }
            }}
          >
            <option value="" disabled>
              Выбери тариф
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} — {Number(plan.amountValue).toLocaleString("ru-RU")} ₽
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs leading-relaxed text-gojo-ink-muted">
            Аккаунт сразу получит доступ без отдельной оплаты.
          </p>
        </Field>
        {planId === "monthly-standard" ? (
          <Field>
            <FieldLabel htmlFor="new-student-access-end">Доступ до (включительно)</FieldLabel>
            <Input
              id="new-student-access-end"
              type="date"
              min={formatDateInput(new Date())}
              value={accessEndDate}
              onChange={(event) => setAccessEndDate(event.target.value)}
              required
            />
            <Input
              type="hidden"
              name="activeUntil"
              value={localDateTimeIso(accessEndDate, "23:59")}
            />
            <Input type="hidden" name="lessonCredits" value="0" />
          </Field>
        ) : planId === "bundle-8" ? (
          <Field>
            <FieldLabel htmlFor="new-student-lesson-credits">Количество уроков</FieldLabel>
            <Input
              id="new-student-lesson-credits"
              name="lessonCredits"
              type="number"
              min="1"
              max="1000"
              step="1"
              value={lessonCredits}
              onChange={(event) => setLessonCredits(event.target.value)}
              required
            />
            <Input type="hidden" name="activeUntil" value="" />
          </Field>
        ) : (
          <>
            <Input type="hidden" name="activeUntil" value="" />
            <Input type="hidden" name="lessonCredits" value="0" />
          </>
        )}

        {state.error ? (
          <Alert variant="destructive" className="bg-gojo-error-soft">
            <AlertDescription className="font-bold text-gojo-error">{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Создаём..." : "Создать аккаунт"}
        </Button>
      </form>
    </>
  );

  return presentation === "card" ? <Card className="p-6">{form}</Card> : form;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateTimeIso(date: string, time: string) {
  if (!date || !time) return "";
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}
