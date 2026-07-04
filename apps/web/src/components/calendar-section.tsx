"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface GCalEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface Session {
  day: string;
  date: string;
  time: string;
  duration: string;
  topic: string;
  source: "google" | "static";
}

const STATIC_SESSIONS: Session[] = [
  { day: "Пн", date: "30", time: "18:00", duration: "60 мин", topic: "Хирагана · Урок 3", source: "static" },
  { day: "Ср", date: "2",  time: "18:00", duration: "60 мин", topic: "Числа и счёт",       source: "static" },
  { day: "Пт", date: "4",  time: "19:00", duration: "60 мин", topic: "Приветствия на японском", source: "static" },
];

function formatEvent(e: GCalEvent): Session {
  const start = new Date(e.start.dateTime ?? e.start.date ?? "");
  const end   = new Date(e.end.dateTime   ?? e.end.date   ?? "");
  const days  = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const mins  = Math.round((end.getTime() - start.getTime()) / 60_000);
  const h = Math.floor(mins / 60), m = mins % 60;
  return {
    day:      days[start.getDay()],
    date:     start.getDate().toString(),
    time:     start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    duration: h > 0 ? `${h}ч${m ? ` ${m}м` : ""}` : `${mins} мин`,
    topic:    e.summary ?? "Занятие",
    source:   "google",
  };
}

function buildWeek(events: GCalEvent[]) {
  const today = new Date();
  const eventKeys = new Set(
    events.map((e) => {
      const d = new Date(e.start.dateTime ?? e.start.date ?? "");
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
      label:      labels[i],
      date:       d.getDate(),
      hasSession: eventKeys.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`),
      isToday:    d.toDateString() === today.toDateString(),
    };
  });
}

const STATIC_WEEK = [
  { label: "Пн", date: 28, hasSession: false, isToday: true  },
  { label: "Вт", date: 29, hasSession: false, isToday: false },
  { label: "Ср", date: 30, hasSession: true,  isToday: false },
  { label: "Чт", date: 1,  hasSession: false, isToday: false },
  { label: "Пт", date: 2,  hasSession: true,  isToday: false },
  { label: "Сб", date: 3,  hasSession: false, isToday: false },
  { label: "Вс", date: 4,  hasSession: false, isToday: false },
];

export function CalendarSection() {
  const [status, setStatus]       = useState<"loading" | "connected" | "disconnected">("loading");
  const [events, setEvents]       = useState<GCalEvent[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(true);
  const [hidden, setHidden] = useState(false);

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
    fetch(`${API_URL}/calendar/status`, { credentials: "include" })
      .then((r) => r.json())
      .then(async (d: { connected: boolean; googleEnabled: boolean }) => {
        setGoogleEnabled(d.googleEnabled);
        if (d.connected) {
          setStatus("connected");
          const ev = await fetch(`${API_URL}/calendar/events`, { credentials: "include" }).then((r) => r.json()) as { events: GCalEvent[] };
          setEvents(ev.events ?? []);
        } else {
          setStatus("disconnected");
        }
      })
      .catch(() => setStatus("disconnected"));
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
  };

  const handleDisconnect = async () => {
    await fetch(`${API_URL}/calendar/disconnect`, { method: "DELETE", credentials: "include" });
    setStatus("disconnected");
    setEvents([]);
  };

  const sessions: Session[] = status === "connected" ? events.slice(0, 5).map(formatEvent) : STATIC_SESSIONS;
  const week = status === "connected" ? buildWeek(events) : STATIC_WEEK;

  if (hidden) {
    return (
      <div
        className="lg:col-span-2 flex items-center justify-between rounded-2xl bg-white p-4"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#a0a0a0" }}>
          Расписание скрыто
        </div>
        <button
          type="button"
          onClick={showCalendar}
          className="g-body rounded-lg px-4 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "#e8420a" }}
        >
          Показать расписание
        </button>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 rounded-2xl bg-white p-7" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="g-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#e8420a" }}>
          Расписание занятий
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={hideCalendar}
            className="g-mono text-[10px] uppercase tracking-wider transition-colors hover:opacity-60"
            style={{ color: "#a0a0a0" }}
          >
            Скрыть
          </button>
          {status === "connected" && (
            <button
              onClick={handleDisconnect}
              className="g-mono text-[10px] uppercase tracking-wider transition-colors hover:opacity-60"
              style={{ color: "#a0a0a0" }}
            >
              Отключить Google
            </button>
          )}
          <a
            href="https://t.me/gojoedu"
            target="_blank"
            rel="noopener noreferrer"
            className="g-body rounded-lg px-4 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#e8420a" }}
          >
            Перенести
          </a>
        </div>
      </div>

      {/* Connect banner */}
      {status === "disconnected" && (
        <div className="mb-5 rounded-xl p-4" style={{ background: "#f8f4ec", border: "1px dashed rgba(232,66,10,0.25)" }}>
          <div className="g-display mb-1 text-[13px] font-bold" style={{ color: "#252525" }}>
            Подключи свой календарь
          </div>
          <p className="g-body mb-3 text-[12px]" style={{ color: "#6b6b6b" }}>
            Видь все занятия и события прямо здесь
          </p>
          <div className="flex flex-wrap gap-2">
            {googleEnabled && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="g-body flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "#252525" }}
              >
                <GoogleIcon />
                {connecting ? "Подключение..." : "Google Calendar"}
              </button>
            )}
            <button
              disabled
              className="g-body flex items-center gap-2 rounded-lg border px-4 py-2 text-[12px] font-bold opacity-35 cursor-not-allowed"
              style={{ color: "#252525", borderColor: "rgba(0,0,0,0.15)" }}
            >
              <YandexIcon />
              Яндекс.Календарь
              <span className="g-mono ml-1 text-[9px] uppercase tracking-wider" style={{ color: "#a0a0a0" }}>Скоро</span>
            </button>
          </div>
        </div>
      )}

      {/* Week strip */}
      <div className="mb-5 grid grid-cols-7 gap-1.5">
        {week.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-1">
            <div className="g-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: "#a0a0a0" }}>
              {d.label}
            </div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-bold"
              style={{
                background:  d.hasSession ? "#e8420a" : d.isToday ? "#f8f4ec" : "transparent",
                color:       d.hasSession ? "white" : d.isToday ? "#e8420a" : "#252525",
                outline:     d.isToday ? "2px solid #e8420a" : "none",
                outlineOffset: 2,
              }}
            >
              {d.date}
            </div>
            {d.hasSession && (
              <div className="h-1 w-1 rounded-full" style={{ background: "#e8420a", opacity: 0.5 }} />
            )}
          </div>
        ))}
      </div>

      {/* Session list */}
      {status === "loading" && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl" style={{ background: "#f8f4ec" }} />
          ))}
        </div>
      )}

      {status !== "loading" && sessions.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="g-jp mb-2 text-[40px]" style={{ color: "#d0d0d0" }}>予</div>
          <p className="g-body text-[13px]" style={{ color: "#a0a0a0" }}>Нет предстоящих занятий</p>
        </div>
      )}

      {status !== "loading" && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ background: "#f8f4ec" }}>
              <div className="g-mono w-8 shrink-0 text-center">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "#a0a0a0" }}>{s.day}</div>
                <div className="text-[20px] font-extrabold leading-none" style={{ color: "#252525" }}>{s.date}</div>
              </div>
              <div className="h-8 w-px shrink-0" style={{ background: "#e8420a", opacity: 0.25 }} />
              <div className="min-w-0 flex-1">
                <div className="g-display truncate text-[14px] font-bold" style={{ color: "#252525" }}>{s.topic}</div>
                <div className="g-mono mt-0.5 text-[11px]" style={{ color: "#6b6b6b" }}>{s.time} · {s.duration}</div>
              </div>
              {s.source === "google" ? (
                <div className="g-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(66,133,244,0.1)", color: "#4285F4" }}>
                  Google
                </div>
              ) : (
                <div className="g-mono shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(232,66,10,0.1)", color: "#e8420a" }}>
                  Инд.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908C16.658 14.252 17.64 11.945 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function YandexIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z" fill="#FC3F1D"/>
      <path d="M13.32 7.4h-.82c-1.18 0-1.8.57-1.8 1.5 0 1.04.47 1.57 1.43 2.22l.8.54-2.28 3.34H9.1l2.1-3.06c-1.2-.87-1.88-1.72-1.88-3.04 0-1.73 1.2-2.9 3.24-2.9H14.7V17h-1.38V7.4z" fill="white"/>
    </svg>
  );
}
