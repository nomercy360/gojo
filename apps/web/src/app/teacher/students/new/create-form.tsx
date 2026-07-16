"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { TeacherLeadDto } from "@/lib/api";
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
  sourceLead,
}: {
  plans: PaymentPlanDto[];
  presentation?: "card" | "plain";
  onSuccess?: () => void;
  sourceLead?: TeacherLeadDto;
}) {
  const [state, formAction, pending] = useActionState(createStudentAction, initial);
  const router = useRouter();
  const [planId, setPlanId] = useState("");
  const [jlptLevel, setJlptLevel] = useState("");
  const [accessEndDate, setAccessEndDate] = useState("");
  const [lessonCredits, setLessonCredits] = useState("8");
  const converting = Boolean(sourceLead);

  useEffect(() => {
    if (!state.ok) return;
    toast.success(
      state.converted
        ? "Заявка конвертирована — пробный урок привязан"
        : "Студент создан — приглашение отправлено",
    );
    router.refresh();
    onSuccess?.();
  }, [onSuccess, router, state.converted, state.ok]);

  const form = (
    <>
      {presentation === "card" ? (
        <>
          <h2 className="font-serif text-[22px] font-bold">
            {converting ? "Конвертация заявки" : "Новый студент"}
          </h2>
          <p className="mt-1 text-[13px] text-gojo-ink-muted">
            {converting
              ? "Создаёт аккаунт без оплаты и сохраняет историю пробного урока."
              : "Создаёт аккаунт и отправляет студенту письмо со ссылкой для входа."}
          </p>
        </>
      ) : null}
      <form
        action={formAction}
        className={presentation === "card" ? "mt-5 space-y-4" : "space-y-5"}
      >
        {sourceLead ? <Input type="hidden" name="leadId" value={sourceLead.id} /> : null}
        <Field>
          <FieldLabel htmlFor="name">Имя</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            defaultValue={sourceLead?.name ?? ""}
            placeholder="Как зовут студента?"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">
            Email{" "}
            {converting ? (
              <span className="font-normal opacity-60">
                (необязательно при наличии Telegram ID)
              </span>
            ) : null}
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required={!converting}
            defaultValue={sourceLead?.email ?? ""}
            placeholder="student@example.com"
          />
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
            <Input
              id="telegramUsername"
              name="telegramUsername"
              defaultValue={sourceLead?.telegram ? `@${sourceLead.telegram}` : ""}
              placeholder="@username"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="telegramId">Telegram ID</FieldLabel>
            <Input
              id="telegramId"
              name="telegramId"
              type="number"
              min="1"
              defaultValue={sourceLead?.telegramId?.toString() ?? ""}
              placeholder="123456789"
            />
          </Field>
        </div>
        <p className="text-xs leading-relaxed text-gojo-ink-muted">
          Для доставки кода нужен Telegram ID. Один @username не позволяет боту отправить сообщение.
        </p>
        {converting ? (
          <>
            <Field>
              <FieldLabel htmlFor="jlptLevel">JLPT по итогам пробного урока</FieldLabel>
              <NativeSelect
                id="jlptLevel"
                name="jlptLevel"
                required
                value={jlptLevel}
                onChange={(event) => setJlptLevel(event.target.value)}
              >
                <option value="" disabled>
                  Выбери уровень
                </option>
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
              </NativeSelect>
            </Field>
            {sourceLead?.level ? (
              <Field>
                <FieldLabel htmlFor="source-lead-level">Ориентир из заявки / квиза</FieldLabel>
                <Input id="source-lead-level" value={sourceLead.level} readOnly />
              </Field>
            ) : null}
            {sourceLead?.goal ? (
              <div className="rounded-xl border border-gojo-ink/10 bg-gojo-paper-2 p-3.5">
                <div className="text-xs font-bold text-gojo-ink-muted">Цель студента</div>
                <p className="mt-1 text-sm">{sourceLead.goal}</p>
                <p className="mt-2 text-xs text-gojo-ink-muted">
                  Будет сохранена в заметке студента.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
        <Field>
          <FieldLabel htmlFor="planId">{converting ? "Тариф" : "Тариф и доступ"}</FieldLabel>
          <NativeSelect
            id="planId"
            name="planId"
            required={!converting}
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
            <option value="" disabled={!converting}>
              {converting ? "Без тарифа — назначить позже" : "Выбери тариф"}
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} — {Number(plan.amountValue).toLocaleString("ru-RU")} ₽
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs leading-relaxed text-gojo-ink-muted">
            {converting
              ? "Тариф только назначается для будущей оплаты. Доступ и оплаченный статус не выдаются."
              : "Аккаунт сразу получит доступ без отдельной оплаты."}
          </p>
        </Field>
        {!converting && planId === "monthly-standard" ? (
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
        ) : !converting && planId === "bundle-8" ? (
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

        {state.matches?.length ? (
          <Alert className="border-gojo-orange/25 bg-gojo-orange-soft/60">
            <AlertDescription>
              <div className="font-bold">Студент с таким контактом уже существует</div>
              <p className="mt-1 text-sm text-gojo-ink-muted">
                Привяжи заявку к существующему аккаунту — новый создан не будет.
              </p>
              <div className="mt-3 space-y-2">
                {state.matches.map((match) => (
                  <Button
                    key={match.id}
                    type="submit"
                    name="existingStudentId"
                    value={match.id}
                    variant="outline"
                    className="h-auto w-full justify-start py-2.5 text-left"
                    disabled={pending}
                  >
                    <span>
                      <span className="block font-bold">{match.name}</span>
                      <span className="block text-xs font-normal text-gojo-ink-muted">
                        {displayMatchContact(match)}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? converting
              ? "Конвертируем..."
              : "Создаём..."
            : converting
              ? "Конвертировать в студента"
              : "Создать аккаунт"}
        </Button>
      </form>
    </>
  );

  return presentation === "card" ? <Card className="p-6">{form}</Card> : form;
}

function displayMatchContact(match: {
  email: string;
  telegramUsername: string | null;
  telegramId: number | null;
}) {
  const email = match.email.endsWith("@telegram.gojo.local") ? null : match.email;
  return [email, match.telegramUsername ? `@${match.telegramUsername}` : null, match.telegramId]
    .filter(Boolean)
    .join(" · ");
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
