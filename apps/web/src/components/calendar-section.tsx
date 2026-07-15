"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LessonDto } from "@gojo/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Session {
  key: string;
  day: string;
  date: string;
  time: string;
  duration: string;
  topic: string;
}

function formatLesson(lesson: LessonDto): Session {
  const start = new Date(lesson.startsAt);
  const end = new Date(lesson.endsAt);
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);

  return {
    key: `lesson:${lesson.id}`,
    day: days[start.getDay()],
    date: start.getDate().toString(),
    time: start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    duration: `${minutes} мин`,
    topic: lesson.title,
  };
}

function getWeekStart(offset: number) {
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  return monday;
}

function buildWeek(monday: Date, isoDates: string[]) {
  const today = new Date();
  const lessonDates = new Set(
    isoDates.map((iso) => {
      const date = new Date(iso);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }),
  );
  const labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return {
      label: labels[index],
      date: date.getDate(),
      key,
      hasLesson: lessonDates.has(key),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

export function CalendarSection() {
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const from = getWeekStart(weekOffset);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    setLoading(true);

    fetch(
      `${API_URL}/lessons/my-calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      { credentials: "include" },
    )
      .then(async (response) => {
        if (!response.ok) return [];
        const payload: unknown = await response.json();
        return Array.isArray(payload) ? payload : [];
      })
      .then((payload: LessonDto[]) => setLessons(payload))
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, [weekOffset]);

  const monday = getWeekStart(weekOffset);
  const week = buildWeek(
    monday,
    lessons.map((lesson) => lesson.startsAt),
  );
  const visibleLessons = selectedDate
    ? lessons.filter((lesson) => {
        const date = new Date(lesson.startsAt);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === selectedDate;
      })
    : lessons;
  const sessions = visibleLessons.map(formatLesson);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekLabel = `${monday.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${sunday.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;

  const moveWeek = (offset: number) => {
    setSelectedDate(null);
    setWeekOffset((current) => current + offset);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    moveWeek(deltaX < 0 ? 1 : -1);
  };

  return (
    <Card
      id="calendar"
      className="scroll-mt-20 gap-0 p-7"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="g-mono text-[11px] font-bold uppercase tracking-[0.16em] text-gojo-orange">
          Расписание · {weekOffset === 0 ? "эта неделя" : weekLabel}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Предыдущая неделя"
            onClick={() => moveWeek(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDate(null);
              setWeekOffset(0);
            }}
          >
            Сегодня
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Следующая неделя"
            onClick={() => moveWeek(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-2">
        {week.map((day) => {
          const selected = selectedDate === day.key;
          return (
            <Button
              variant="unstyled"
              key={day.key}
              type="button"
              aria-label={`${day.label}, ${day.date}`}
              aria-pressed={selected}
              onClick={() => setSelectedDate((current) => (current === day.key ? null : day.key))}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors hover:bg-gojo-paper"
            >
              <span className="g-mono text-[9px] font-bold uppercase tracking-wider text-gojo-ink-ghost sm:text-[10px]">
                {day.label}
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] text-[13px] font-bold transition-colors sm:h-9 sm:w-9 ${
                  selected
                    ? "bg-gojo-ink text-white"
                    : day.hasLesson
                      ? "bg-gojo-orange text-white"
                      : day.isToday
                        ? "bg-gojo-orange-soft text-gojo-orange ring-1 ring-gojo-orange"
                        : "text-gojo-ink"
                }`}
              >
                {day.date}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-2" aria-label="Загрузка расписания">
            {[1, 2].map((item) => (
              <div key={item} className="h-[68px] animate-pulse rounded-xl bg-gojo-paper" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl bg-gojo-paper px-5 py-6 text-center">
            <p className="g-body text-[13px] text-gojo-ink-muted">
              {selectedDate
                ? "На выбранный день занятий нет."
                : "На этой неделе занятий нет. Следующее появится после согласования с преподавателем."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.key}
                className="flex items-center gap-3 rounded-xl bg-gojo-paper px-4 py-3.5 sm:gap-4"
              >
                <div className="g-mono w-9 shrink-0 text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gojo-ink-ghost">
                    {session.day}
                  </div>
                  <div className="text-[20px] font-extrabold leading-none text-gojo-ink">
                    {session.date}
                  </div>
                </div>
                <div className="h-9 w-px shrink-0 bg-gojo-orange/25" />
                <div className="min-w-0 flex-1">
                  <div className="g-body truncate text-[14px] font-bold text-gojo-ink sm:text-[15px]">
                    {session.topic}
                  </div>
                  <div className="g-mono mt-0.5 text-[10px] text-gojo-ink-muted sm:text-[11px]">
                    {session.time} · {session.duration}
                  </div>
                </div>
                <span className="g-mono hidden shrink-0 rounded-lg bg-gojo-orange-soft px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gojo-orange sm:inline">
                  Урок
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
