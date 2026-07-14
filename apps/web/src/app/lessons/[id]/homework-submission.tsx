"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  HomeworkAiReview,
  HomeworkSubmissionDto,
  HomeworkSubmissionStatus,
} from "@gojo/shared";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitHomeworkAction } from "./homework-actions";

const STATUS_LABEL: Record<HomeworkSubmissionStatus, string> = {
  submitted: "На проверке",
  ai_reviewed: "Проверено ассистентом, ждёт преподавателя",
  approved: "Принято",
  needs_revision: "Нужна доработка",
};

const STATUS_CLASS: Record<HomeworkSubmissionStatus, string> = {
  submitted: "border-black/10 bg-gojo-paper-2 text-gojo-ink-muted",
  ai_reviewed: "border-black/10 bg-gojo-paper-2 text-gojo-ink-muted",
  approved: "border-transparent bg-gojo-orange text-white",
  needs_revision: "border-gojo-error/40 bg-gojo-error-soft text-gojo-error",
};

export function AiReviewCard({ review }: { review: HomeworkAiReview }) {
  return (
    <div className="mt-3 rounded-md border border-black/10 bg-gojo-paper-2 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Разбор ассистента
        </div>
        <div className="text-[13px] font-bold">{review.score}/5</div>
      </div>
      <p className="mt-2 text-sm">{review.summary}</p>
      {review.errors.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {review.errors.map((e) => (
            <li
              key={`${e.quote}-${e.issue}`}
              className="rounded-md bg-gojo-surface p-3 text-[13px]"
            >
              <div className="font-bold">
                「{e.quote}」 → 「{e.correction}」
              </div>
              <div className="mt-1 text-gojo-ink-muted">
                {e.issue}. {e.explanation}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-gojo-ink-muted">Ошибок не найдено.</p>
      )}
      <p className="mt-3 text-[13px] text-gojo-ink-muted">{review.naturalness}</p>
      {review.targetVocabMissing.length > 0 ? (
        <p className="mt-2 text-[13px] text-gojo-ink-muted">
          Не использована лексика урока: {review.targetVocabMissing.join("、")}
        </p>
      ) : null}
    </div>
  );
}

export function HomeworkSubmission({
  lessonId,
  initialSubmissions,
}: {
  lessonId: string;
  initialSubmissions: HomeworkSubmissionDto[];
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  const latest = submissions[0] ?? null;
  const canSubmit = !latest || latest.status === "needs_revision";

  function submit() {
    const text = content.trim();
    if (text.length < 10) {
      toast.error("Слишком короткий текст — минимум 10 символов");
      return;
    }
    startTransition(async () => {
      try {
        const created = await submitHomeworkAction(lessonId, text);
        setSubmissions((list) => [created, ...list]);
        setContent("");
        toast.success("Домашка отправлена — ассистент проверит её за пару минут");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось отправить");
      }
    });
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif text-[22px] font-bold">Домашнее задание</h2>

      {latest ? (
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`rounded-md border px-3 py-1.5 text-[11px] font-bold ${STATUS_CLASS[latest.status]}`}
            >
              {STATUS_LABEL[latest.status]}
            </span>
            <span className="text-[11px] text-gojo-ink-muted">
              Отправлено{" "}
              {new Date(latest.createdAt).toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm">{latest.content}</p>
          {latest.aiReview ? <AiReviewCard review={latest.aiReview} /> : null}
          {latest.teacherComment ? (
            <div className="mt-3 rounded-md border border-black/10 bg-gojo-paper-2 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
                Комментарий преподавателя
              </div>
              <p className="mt-2 text-sm">{latest.teacherComment}</p>
            </div>
          ) : null}
        </Card>
      ) : (
        <p className="mt-1 text-[13px] text-gojo-ink-muted">
          Напиши задание по теме урока — ассистент разберёт текст, а преподаватель подтвердит
          результат.
        </p>
      )}

      {canSubmit ? (
        <div className="mt-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            maxLength={8000}
            placeholder="Напиши свой текст на японском…"
          />
          <Button type="button" onClick={submit} disabled={pending} className="mt-2">
            {pending ? "Отправляем…" : "Отправить на проверку"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
