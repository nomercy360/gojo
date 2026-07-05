"use client";

import type { LessonDto, PersonalEventDto } from "@gojo/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Session {
  day: string;
  date: string;
  time: string;
  duration: string;
  topic: string;
  source: "internal" | "personal";
  id?: string;
}

function formatLesson(l: LessonDto): Session {
  const start = new Date(l.startsAt);
  const end = new Date(l.endsAt);
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return {
    day: days[start.getDay()],
    date: start.getDate().toString(),
    time: start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    duration: h > 0 ? `${h}ч${m ? ` ${m}м` : ""}` : `${mins} мин`,
    topic: l.title,
    source: "internal",
  };
}

function formatPersonalEvent(e: PersonalEventDto): Session {
  const start = new Date(e.startsAt);
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const h = Math.floor(e.durationMinutes / 60);
  const m = e.durationMinutes % 60;
  return {
    day: days[start.getDay()],
    date: start.getDate().toString(),
    time: start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    duration: h > 0 ? `${h}ч${m ? ` ${m}м` : ""}` : `${e.durationMinutes} мин`,
    topic: e.title,
    source: "personal",
    id: e.id,
  };
}

function buildWeekFromDates(isoDates: string[]) {
  const today = new Date();
  const dateKeys = new Set(
    isoDates.map((iso) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: labels[i],
      date: d.getDate(),
      hasSession: dateKeys.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

export function CalendarSection() {
  const [bookedLessons, setBookedLessons] = useState<LessonDto[]>([]);
  const [personalEvents, setPersonalEvents] = useState<PersonalEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addWhen, setAddWhen] = useState("");
  const [addDuration, setAddDuration] = useState(30);
  const [adding, setAdding] = useState(false);

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
    fetch(`${API_URL}/lessons`, { credentials: "include" })
      .then((r) => r.json())
      .then((all: LessonDto[]) => setBookedLessons(all.filter((l) => l.booked)))
      .catch(() => setBookedLessons([]))
      .finally(() => setLoading(false));
  }, []);

  const loadPersonalEvents = () => {
    fetch(`${API_URL}/personal-events`, { credentials: "include" })
      .then((r) => r.json())
      .then((rows: PersonalEventDto[]) => setPersonalEvents(rows))
      .catch(() => setPersonalEvents([]));
  };

  useEffect(loadPersonalEvents, []);

  const handleAddTraining = async () => {
    if (!addTitle.trim() || !addWhen) {
      toast.error("Укажи название и дату/время");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/personal-events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim(),
          startsAt: new Date(addWhen).toISOString(),
          durationMinutes: addDuration,
        }),
      });
      if (!res.ok) throw new Error();
      setAddTitle("");
      setAddWhen("");
      setAddDuration(30);
      setAddOpen(false);
      loadPersonalEvents();
    } catch {
      toast.error("Не удалось добавить тренировку");
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePersonal = async (id: string) => {
    try {
      await fetch(`${API_URL}/personal-events/${id}`, { method: "DELETE", credentials: "include" });
      loadPersonalEvents();
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  const internalItems = [
    ...bookedLessons.map((l) => ({ startsAt: l.startsAt, session: formatLesson(l) })),
    ...personalEvents.map((e) => ({ startsAt: e.startsAt, session: formatPersonalEvent(e) })),
  ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const sessions: Session[] = internalItems.slice(0, 5).map((i) => i.session);
  const week = buildWeekFromDates(internalItems.map((i) => i.startsAt));

  if (hidden) {
    return (
      <div
        className="lg:col-span-2 rounded-2xl bg-white"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center justify-between px-5 py-3">
          <span
            className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "#a0a0a0" }}
          >
            Расписание скрыто
          </span>
          <button
            type="button"
            onClick={showCalendar}
            className="g-body rounded-lg px-4 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#e8420a" }}
          >
            Показать расписание
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="lg:col-span-2 overflow-hidden rounded-2xl bg-white"
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
        <button
          type="button"
          onClick={hideCalendar}
          className="g-mono text-[10px] uppercase tracking-wider transition-colors hover:opacity-60"
          style={{ color: "#a0a0a0" }}
        >
          Скрыть
        </button>
      </div>

      <div className="p-7">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <div
            className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "#e8420a" }}
          >
            Расписание занятий
          </div>
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="g-body flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#e8420a" }}
          >
            + Добавить свою тренировку
          </button>
        </div>
        <p className="mb-5 text-[12px]" style={{ color: "#a0a0a0" }}>
          Своя тренировка — личная практика, которую ты сам планируешь (например, повторение слов
          или каны). Появится в расписании ниже, и Telegram напомнит о ней за 15 минут.
        </p>

        {/* Add own training */}
        {addOpen && (
          <div
            className="mb-5 rounded-xl p-4"
            style={{ background: "#f8f4ec", border: "1px dashed rgba(232,66,10,0.25)" }}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Название (напр. Повторить кандзи)"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                className="g-body flex-1 rounded-lg border px-3 py-2 text-[13px]"
                style={{ borderColor: "rgba(0,0,0,0.12)", minWidth: 180 }}
              />
              <input
                type="datetime-local"
                value={addWhen}
                onChange={(e) => setAddWhen(e.target.value)}
                className="g-body rounded-lg border px-3 py-2 text-[13px]"
                style={{ borderColor: "rgba(0,0,0,0.12)" }}
              />
              <select
                value={addDuration}
                onChange={(e) => setAddDuration(Number(e.target.value))}
                className="g-body rounded-lg border px-3 py-2 text-[13px]"
                style={{ borderColor: "rgba(0,0,0,0.12)" }}
              >
                <option value={15}>15 мин</option>
                <option value={30}>30 мин</option>
                <option value={60}>60 мин</option>
                <option value={90}>90 мин</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddTraining}
              disabled={adding}
              className="g-body rounded-lg px-4 py-2 text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#e8420a" }}
            >
              {adding ? "Добавляю..." : "Добавить в расписание"}
            </button>
          </div>
        )}

        {/* Week strip */}
        <div className="mb-5 grid grid-cols-7 gap-1.5">
          {week.map((d) => (
            <div key={d.label} className="flex flex-col items-center gap-1">
              <div
                className="g-mono text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#a0a0a0" }}
              >
                {d.label}
              </div>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-bold"
                style={{
                  background: d.hasSession ? "#e8420a" : d.isToday ? "#f8f4ec" : "transparent",
                  color: d.hasSession ? "white" : d.isToday ? "#e8420a" : "#252525",
                  outline: d.isToday ? "2px solid #e8420a" : "none",
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
            </div>
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
              Нет предстоящих занятий
            </p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div
                key={i}
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
                {s.source === "personal" ? (
                  <div
                    className="g-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(107,127,191,0.12)", color: "#6B7FBF" }}
                  >
                    Своё
                  </div>
                ) : (
                  <div
                    className="g-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(232,66,10,0.1)", color: "#e8420a" }}
                  >
                    Инд.
                  </div>
                )}
                {s.source === "personal" && s.id && (
                  <button
                    type="button"
                    onClick={() => handleDeletePersonal(s.id!)}
                    aria-label="Удалить тренировку"
                    className="g-mono shrink-0 text-[14px] transition-colors hover:opacity-60"
                    style={{ color: "#a0a0a0" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
