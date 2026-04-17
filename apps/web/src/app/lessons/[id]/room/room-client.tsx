"use client";

import "@livekit/components-styles";
import {
  Chat,
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function RoomClient({
  token,
  serverUrl,
  roomName,
}: {
  token: string;
  serverUrl: string;
  roomName: string;
}) {
  const router = useRouter();
  const [sidePanel, setSidePanel] = useState<"chat" | "participants" | null>("participants");

  const handleDisconnected = useCallback(() => {
    router.push("/lessons");
  }, [router]);

  const wsUrl = serverUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      data-lk-theme="default"
      onDisconnected={handleDisconnected}
      connect={true}
      audio={true}
      video={true}
      style={{ height: "100%" }}
    >
      <div className="flex h-full overflow-hidden">
        {/* Main video area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex-1 overflow-hidden">
            <VideoGrid />
          </div>
          {/* Controls */}
          <div className="flex items-center justify-between border-t-2 border-white/10 bg-[#111] px-4">
            <ControlBar variation="minimal" />
            <div className="flex gap-1">
              <PanelButton
                active={sidePanel === "participants"}
                onClick={() =>
                  setSidePanel((p) => (p === "participants" ? null : "participants"))
                }
                label="Участники"
              />
              <PanelButton
                active={sidePanel === "chat"}
                onClick={() => setSidePanel((p) => (p === "chat" ? null : "chat"))}
                label="Чат"
              />
            </div>
          </div>
        </div>

        {/* Side panel */}
        {sidePanel ? (
          <div className="flex w-80 shrink-0 flex-col border-l-2 border-white/10 bg-[#161413]">
            <div className="flex shrink-0 border-b border-white/10">
              <button
                type="button"
                onClick={() => setSidePanel("participants")}
                className={`flex-1 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider ${
                  sidePanel === "participants" ? "bg-white/10 text-white" : "text-white/50"
                }`}
              >
                Участники
              </button>
              <button
                type="button"
                onClick={() => setSidePanel("chat")}
                className={`flex-1 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider ${
                  sidePanel === "chat" ? "bg-white/10 text-white" : "text-white/50"
                }`}
              >
                Чат
              </button>
            </div>
            <div className="relative flex-1 overflow-hidden">
              {sidePanel === "participants" ? (
                <div className="absolute inset-0 overflow-y-auto">
                  <ParticipantsList />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col overflow-hidden [&_.lk-chat]:!flex [&_.lk-chat]:!w-full [&_.lk-chat]:!max-w-none [&_.lk-chat]:!min-w-0 [&_.lk-chat]:flex-1 [&_.lk-chat]:flex-col [&_.lk-chat]:overflow-hidden [&_.lk-chat-messages]:flex-1 [&_.lk-chat-messages]:overflow-y-auto [&_.lk-chat-form]:shrink-0 [&_.lk-chat-form-input]:!w-full [&_.lk-chat-form]:!w-full [&_.lk-chat-header]:!hidden">
                  <Chat />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout
      tracks={tracks}
      style={{ height: "100%" }}
    >
      <ParticipantTile />
    </GridLayout>
  );
}

function ParticipantsList() {
  const participants = useParticipants();

  return (
    <ul className="p-3 space-y-2">
      {participants.map((p) => (
        <li
          key={p.identity}
          className="flex items-center gap-3 rounded-md bg-white/5 px-3 py-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gojo-orange bg-gojo-orange text-[11px] font-bold text-white">
            {(p.name ?? p.identity).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">
              {p.name ?? p.identity}
            </p>
            <p className="text-[10px] text-white/40">
              {p.isSpeaking
                ? "🎙 говорит"
                : p.isMicrophoneEnabled
                  ? "микро вкл"
                  : "микро выкл"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PanelButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-[11px] font-bold transition ${
        active
          ? "bg-gojo-orange text-white"
          : "bg-white/10 text-white/60 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
