import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiError, fetchLesson, fetchLivekitToken } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import { RoomClient } from "./room-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function RoomPage({ params }: Props) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) redirect("/login");

  let lesson;
  try {
    lesson = await fetchLesson(id);
  } catch {
    return <ErrorView message="Урок не найден." />;
  }

  let lk;
  try {
    lk = await fetchLivekitToken(id, token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    if (e instanceof ApiError && e.status === 403) {
      return <ErrorView message="Ты не записан на этот урок. Вернись и нажми «Записаться»." />;
    }
    return <ErrorView message={e instanceof Error ? e.message : "Ошибка подключения."} />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Compact header */}
      <div className="flex shrink-0 items-center justify-between border-b-2 border-white/10 bg-[#111] px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/lessons"
            className="rounded px-2 py-1 text-[11px] font-bold text-white/50 hover:text-white"
          >
            ← Назад
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-bold text-white/90">{lesson.title}</h1>
          <span className="text-[11px] text-white/40">
            {lesson.teacherNickname} ·{" "}
            {new Date(lesson.startsAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gojo-error" />
          <span className="text-[10px] font-bold uppercase text-white/40">LIVE</span>
        </div>
      </div>

      {/* Room */}
      <div className="min-h-0 flex-1">
        <RoomClient token={lk.token} serverUrl={lk.url} roomName={lk.room} />
      </div>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="card-pop rounded-lg border-2 border-gojo-ink bg-gojo-surface px-6 py-8">
          <p className="text-sm font-bold text-gojo-error">{message}</p>
          <Link
            href="/lessons"
            className="mt-4 inline-block text-sm font-bold text-gojo-orange hover:underline"
          >
            ← К урокам
          </Link>
        </div>
      </div>
    </main>
  );
}
