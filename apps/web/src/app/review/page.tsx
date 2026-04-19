import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchReviewQueue } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ReviewClient } from "./review-client";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
            Карточки появятся, когда запишешься на урок — преподаватель добавляет
            слова к уроку, и они автоматически попадают в твой пул для повторения.
          </p>
          <Link
            href="/lessons"
            className="btn-pop mt-6 inline-flex rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white"
          >
            Посмотреть уроки
          </Link>
        </div>
      </main>
    );
  }

  return <ReviewClient initialQueue={queue} />;
}
