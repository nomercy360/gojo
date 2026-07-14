"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import { type MaterialUploadState, uploadMaterialAction } from "./actions";

const initial: MaterialUploadState = {};

export function MaterialUploadForm({ lessonId }: { lessonId: string }) {
  const [state, formAction, pending] = useActionState(uploadMaterialAction, initial);

  return (
    <Card asChild className="mt-5 p-4">
      <form action={formAction}>
        <Input type="hidden" name="lessonId" value={lessonId} />
        <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
          <Field>
            <FieldLabel htmlFor="title">Название</FieldLabel>
            <Input id="title" name="title" placeholder="Домашнее задание" />
          </Field>
          <Field>
            <FieldLabel htmlFor="file">Файл</FieldLabel>
            <Input id="file" name="file" type="file" required />
          </Field>
        </div>

        {state.error ? (
          <p className="mt-3 text-sm font-bold text-gojo-error">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="mt-3 text-sm font-bold text-gojo-success">Материал загружен</p>
        ) : null}

        <Button type="submit" disabled={pending} className="mt-3" size="sm">
          {pending ? "Загружаем..." : "+ Загрузить материал"}
        </Button>
      </form>
    </Card>
  );
}
