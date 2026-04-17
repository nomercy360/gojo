"use client";

import Link from "next/link";
import type { LessonDto } from "@gojo/shared";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAYS_FULL = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

export function CalendarView({
  lessons,
  authenticated,
}: {
  lessons: LessonDto[];
  authenticated: boolean;
}) {
  const today = new Date();
  const startOfWeek = getMonday(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const byDay = new Map<string, LessonDto[]>();
  for (const l of lessons) {
    const key = new Date(l.startsAt).toDateString();
    const arr = byDay.get(key) ?? [];
    arr.push(l);
    byDay.set(key, arr);
  }

  return (
    <div className="space-y-2">
      {days.map((day, i) => {
        const key = day.toDateString();
        const isToday = key === today.toDateString();
        const dayLessons = byDay.get(key) ?? [];
        const isEmpty = dayLessons.length === 0;

        return (
          <div
            key={i}
            className={`rounded-lg border-2 transition ${
              isToday ? "border-gojo-orange bg-gojo-orange-soft" : "border-gojo-ink/15 bg-gojo-surface"
            } ${isEmpty ? "py-3 px-4" : "p-4"}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`font-serif text-lg font-bold ${isToday ? "text-gojo-orange" : ""}`}>
                  {day.getDate()}
                </span>
                <span className="text-[11px] font-bold text-gojo-ink-muted">
                  {DAYS_FULL[i]}
                </span>
              </div>
              {isToday ? (
                <span className="-rotate-1 rounded-sm bg-gojo-orange px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  Сегодня
                </span>
              ) : null}
              {isEmpty ? (
                <span className="ml-auto text-[11px] text-gojo-ink-ghost">нет уроков</span>
              ) : null}
            </div>

            {dayLessons.length > 0 ? (
              <div className="mt-3 space-y-2">
                {dayLessons.map((l) => {
                  const time = new Date(l.startsAt).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const seats = l.studentCount ?? 0;
                  return (
                    <Link
                      key={l.id}
                      href={`/lessons/${l.id}`}
                      className={`flex items-center justify-between rounded-md border-2 p-3 transition hover:shadow-pop-sm ${
                        l.booked
                          ? "border-gojo-orange bg-gojo-surface"
                          : "border-gojo-ink/20 bg-gojo-surface hover:border-gojo-ink"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13px] font-bold text-gojo-ink-muted">
                          {time}
                        </span>
                        {l.jlptLevel ? (
                          <span className="rounded-sm bg-gojo-ink px-1.5 py-0.5 text-[9px] font-bold text-white">
                            {l.jlptLevel}
                          </span>
                        ) : null}
                        <span className="text-sm font-bold">{l.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gojo-ink-muted">
                          {seats}/{l.maxStudents}
                        </span>
                        {l.booked ? (
                          <span className="rounded-sm bg-gojo-orange px-2 py-0.5 text-[9px] font-bold text-white">
                            ЗАПИСАН
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function getMonday(d: Date) {
  const result = new Date(d);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}
