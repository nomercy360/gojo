"use client";

import { reviewSubmissionAction } from "@/app/lessons/[id]/homework-actions";
import { AiReviewCard } from "@/app/lessons/[id]/homework-submission";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { HomeworkSubmissionStatus, TeacherSubmissionDto } from "@gojo/shared";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const STATUS_LABEL: Record<HomeworkSubmissionStatus, string> = {
  submitted: "Ждёт ассистента",
  ai_reviewed: "Ждёт решения",
  approved: "Принято",
  needs_revision: "На доработке",
};

export function SubmissionsReview({
  initialSubmissions,
}: {
  initialSubmissions: TeacherSubmissionDto[];
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function review(id: string, decision: "approved" | "needs_revision") {
    startTransition(async () => {
      try {
        const updated = await reviewSubmissionAction(id, {
          decision,
          comment: comments[id]?.trim() || null,
        });
        setSubmissions((list) =>
          list.map((s) =>
            s.id === id
              ? { ...s, status: updated.status, teacherComment: updated.teacherComment }
              : s,
          ),
        );
        toast.success(decision === "approved" ? "Домашка принята" : "Отправлено на доработку");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Не получилось");
      }
    });
  }

  if (submissions.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-[22px] font-bold">Присланные домашки</h2>
      <p className="mt-1 text-[13px] text-gojo-ink-muted">
        Ассистент уже разметил работы — подтверди результат или отправь на доработку.
      </p>

      <ul className="mt-4 space-y-3">
        {submissions.map((s) => (
          <li key={s.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold">{s.nickname ?? s.email}</span>
                  <span className="ml-2 text-[11px] text-gojo-ink-muted">
                    {new Date(s.createdAt).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className="rounded-md border border-black/10 bg-gojo-paper-2 px-2.5 py-1 text-[11px] font-bold text-gojo-ink-muted">
                  {STATUS_LABEL[s.status]}
                  {s.aiReview
                    ? ` · ассистент: ${s.aiReview.suggestedDecision === "approve" ? "принять" : "доработать"}`
                    : ""}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-md bg-gojo-paper-2 p-3 text-sm">
                {s.content}
              </p>

              {s.aiReview ? <AiReviewCard review={s.aiReview} /> : null}
              {s.aiReviewError ? (
                <p className="mt-2 text-[13px] text-gojo-error">
                  Авторазбор не удался — проверь текст вручную.
                </p>
              ) : null}

              {s.status === "submitted" || s.status === "ai_reviewed" ? (
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                  <Input
                    value={comments[s.id] ?? ""}
                    onChange={(e) => setComments((m) => ({ ...m, [s.id]: e.target.value }))}
                    placeholder="Комментарий студенту (необязательно)"
                  />
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => review(s.id, "approved")}
                    size="sm"
                  >
                    Принять
                  </Button>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => review(s.id, "needs_revision")}
                    variant="destructive"
                    size="sm"
                  >
                    На доработку
                  </Button>
                </div>
              ) : s.teacherComment ? (
                <p className="mt-3 text-[13px] text-gojo-ink-muted">
                  Твой комментарий: {s.teacherComment}
                </p>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
