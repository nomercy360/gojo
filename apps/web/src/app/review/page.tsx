import { fetchReviewQueue } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ReviewClient } from "./review-client";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isTeacherUser(user)) redirect("/teacher");

  const queue = await fetchReviewQueue();

  if (queue.stats.totalCards === 0) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-xl px-6 py-20">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
            Карточки
          </div>
          <h1 className="mt-2 font-serif text-[28px] font-bold">Пока пусто</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-gojo-ink-soft">
            Карточки появятся, когда запишешься на урок — преподаватель добавляет слова к уроку, и
            они автоматически попадают в твой пул для повторения.
          </p>
        </div>
      </main>
    );
  }

  return <ReviewClient initialQueue={queue} />;
}
