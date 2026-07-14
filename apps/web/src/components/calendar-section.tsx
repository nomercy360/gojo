"use client";

import { Button } from "@/components/ui/button";
import type { LessonDto } from "@gojo/shared";
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

function formatLesson(l: LessonDto): Session {
  const start = new Date(l.startsAt);
  const end = new Date(l.endsAt);
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return {
    key: `lesson:${l.id}`,
    day: days[start.getDay()],
    date: start.getDate().toString(),
    time: start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    duration: h > 0 ? `${h}ч${m ? ` ${m}м` : ""}` : `${mins} мин`,
    topic: l.title,
  };
}

function getWeekStart(offset: number) {
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  return monday;
}

function buildWeekFromDates(monday: Date, isoDates: string[]) {
  const today = new Date();
  const dateKeys = new Set(
    isoDates.map((iso) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  const labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: labels[i],
      date: d.getDate(),
      dateKey: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      hasSession: dateKeys.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

export function CalendarSection() {
  const [bookedLessons, setBookedLessons] = useState<LessonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setHidden(localStorage.getItem("gojo:calendar-hidden") === "1");
  }, []);

  const hideCalendar = () => {
    setHidden(true);
    localStorage.setItem("gojo:calendar-hidden", "1");
  };
  const showCalendar = () => {
    setHidden(false);
    localStorage.removeItem("gojo:calendar-hidden");
  };

  useEffect(() => {
    const from = getWeekStart(weekOffset);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    setLoading(true);
    fetch(
      `${API_URL}/lessons/my-calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) return [];
        const all: unknown = await r.json();
        return Array.isArray(all) ? all : [];
      })
      .then((all: LessonDto[]) => setBookedLessons(all))
      .catch(() => setBookedLessons([]))
      .finally(() => setLoading(false));
  }, [weekOffset]);

  const monday = getWeekStart(weekOffset);
  const visibleLessons = selectedDate
    ? bookedLessons.filter((lesson) => {
        const date = new Date(lesson.startsAt);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === selectedDate;
      })
    : bookedLessons;
  const sessions = visibleLessons.map(formatLesson);
  const week = buildWeekFromDates(
    monday,
    bookedLessons.map((lesson) => lesson.startsAt),
  );
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
    event.preventDefault();
    moveWeek(deltaX < 0 ? 1 : -1);
  };

  if (hidden) {
    return (
      <div
        id="calendar"
        className="lg:col-span-2 scroll-mt-20 rounded-2xl bg-white"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center justify-between px-5 py-3">
          <span
            className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "#a0a0a0" }}
          >
            Расписание скрыто
          </span>
          <Button
            variant="unstyled"
            type="button"
            onClick={showCalendar}
            className="g-body rounded-lg px-4 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#e8420a" }}
          >
            Показать расписание
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="calendar"
      className="lg:col-span-2 scroll-mt-20 overflow-hidden rounded-2xl bg-white"
      style={{ border: "1px solid rgba(0,0,0,0.06)" }}
    >
      {/* Top edge bar — just the hide toggle, kept separate from the content below */}
      <div
        className="flex items-center justify-between px-5 py-2"
        style={{ background: "#fafafa", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <span className="g-mono text-[10px] uppercase tracking-wider" style={{ color: "#c0c0c0" }}>
          Расписание
        </span>
        <Button
          variant="unstyled"
          type="button"
          onClick={hideCalendar}
          className="g-mono text-[10px] uppercase tracking-wider transition-colors hover:opacity-60"
          style={{ color: "#a0a0a0" }}
        >
          Скрыть
        </Button>
      </div>

      <div
        className="p-7"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div
            className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "#e8420a" }}
          >
            Расписание занятий
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="unstyled"
              type="button"
              aria-label="Предыдущая неделя"
              onClick={() => moveWeek(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-[16px] text-gojo-ink-muted transition-colors hover:border-gojo-orange hover:text-gojo-orange"
            >
              ←
            </Button>
            <Button
              variant="unstyled"
              type="button"
              onClick={() => {
                setSelectedDate(null);
                setWeekOffset(0);
              }}
              className="g-body min-w-36 rounded-lg px-3 py-1.5 text-[12px] font-bold text-gojo-ink-muted transition-colors hover:text-gojo-orange"
            >
              {weekOffset === 0 ? "Эта неделя" : weekLabel}
            </Button>
            <Button
              variant="unstyled"
              type="button"
              aria-label="Следующая неделя"
              onClick={() => moveWeek(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-[16px] text-gojo-ink-muted transition-colors hover:border-gojo-orange hover:text-gojo-orange"
            >
              →
            </Button>
          </div>
        </div>

        {/* Week strip */}
        <div className="mb-5 grid grid-cols-7 gap-1.5">
          {week.map((d) => (
            <Button
              variant="unstyled"
              key={d.dateKey}
              type="button"
              aria-label={`${d.label}, ${d.date}`}
              aria-pressed={selectedDate === d.dateKey}
              onClick={() =>
                setSelectedDate((current) => (current === d.dateKey ? null : d.dateKey))
              }
              className="flex flex-col items-center gap-1 rounded-xl py-1 transition-colors hover:bg-gojo-paper"
            >
              <div
                className="g-mono text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#a0a0a0" }}
              >
                {d.label}
              </div>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-bold"
                style={{
                  background:
                    selectedDate === d.dateKey
                      ? "#252525"
                      : d.hasSession
                        ? "#e8420a"
                        : d.isToday
                          ? "#f8f4ec"
                          : "transparent",
                  color:
                    selectedDate === d.dateKey || d.hasSession
                      ? "white"
                      : d.isToday
                        ? "#e8420a"
                        : "#252525",
                  outline: d.isToday && selectedDate !== d.dateKey ? "2px solid #e8420a" : "none",
                  outlineOffset: 2,
                }}
              >
                {d.date}
              </div>
              {d.hasSession && (
                <div
                  className="h-1 w-1 rounded-full"
                  style={{ background: "#e8420a", opacity: 0.5 }}
                />
              )}
            </Button>
          ))}
        </div>

        {/* Session list */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl"
                style={{ background: "#f8f4ec" }}
              />
            ))}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="g-jp mb-2 text-[40px]" style={{ color: "#d0d0d0" }}>
              予
            </div>
            <p className="g-body text-[13px]" style={{ color: "#a0a0a0" }}>
              {selectedDate ? "На выбранный день занятий нет" : "На этой неделе занятий нет"}
            </p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ background: "#f8f4ec" }}
              >
                <div className="g-mono w-8 shrink-0 text-center">
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: "#a0a0a0" }}
                  >
                    {s.day}
                  </div>
                  <div
                    className="text-[20px] font-extrabold leading-none"
                    style={{ color: "#252525" }}
                  >
                    {s.date}
                  </div>
                </div>
                <div
                  className="h-8 w-px shrink-0"
                  style={{ background: "#e8420a", opacity: 0.25 }}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="g-display truncate text-[14px] font-bold"
                    style={{ color: "#252525" }}
                  >
                    {s.topic}
                  </div>
                  <div className="g-mono mt-0.5 text-[11px]" style={{ color: "#6b6b6b" }}>
                    {s.time} · {s.duration}
                  </div>
                </div>
                <div
                  className="g-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(232,66,10,0.1)", color: "#e8420a" }}
                >
                  Урок
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
