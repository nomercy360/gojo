"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { PaymentPlanDto } from "@gojo/shared";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
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

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Создаём..." : "Создать аккаунт"}
        </Button>
      </form>
    </>
  );

  return presentation === "card" ? <Card className="p-6">{form}</Card> : form;
}
