"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { PaymentPlanDto } from "@gojo/shared";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { type CreateStudentState, createStudentAction } from "./actions";

const initial: CreateStudentState = {};

export function CreateStudentForm({ plans }: { plans: PaymentPlanDto[] }) {
  const [state, formAction, pending] = useActionState(createStudentAction, initial);

  useEffect(() => {
    if (state.ok) toast.success("Приглашение отправлено");
  }, [state.ok]);

  return (
    <Card className="p-6">
      <h2 className="font-serif text-[22px] font-bold">Новый студент</h2>
      <p className="mt-1 text-[13px] text-gojo-ink-muted">
        Создаёт аккаунт и отправляет студенту письмо со ссылкой для установки пароля.
      </p>
      <form action={formAction} className="mt-5 space-y-4">
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
        <Field>
          <FieldLabel htmlFor="planId">Тариф</FieldLabel>
          <NativeSelect id="planId" name="planId" required defaultValue="">
            <option value="" disabled>
              Выбери тариф
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} — {Number(plan.amountValue).toLocaleString("ru-RU")} ₽
              </option>
            ))}
          </NativeSelect>
        </Field>

        {state.error ? (
          <Alert variant="destructive" className="bg-gojo-error-soft">
            <AlertDescription className="font-bold text-gojo-error">{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Создаём..." : "Создать аккаунт"}
        </Button>
      </form>
    </Card>
  );
}
