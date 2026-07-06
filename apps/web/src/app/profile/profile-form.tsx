"use client";

import { Avatar, PRESET_CONFIGS } from "@/components/avatar";
import { AVATAR_PRESET_PREFIX, PRESET_AVATARS, type UserDto } from "@gojo/shared";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { type ProfileState, updateProfileAction, uploadAvatarAction } from "./actions";

const initial: ProfileState = {};

export function ProfileForm({ user }: { user: UserDto }) {
  const [selected, setSelected] = useState<string | null>(user.avatarUrl);
  const [avatarTab, setAvatarTab] = useState<"preset" | "upload">("preset");
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [telegramId, setTelegramId] = useState(user.telegramId?.toString() ?? "");
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    initial,
  );
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadAvatarAction, initial);

  useEffect(() => {
    setSelected(user.avatarUrl);
  }, [user.avatarUrl]);

  useEffect(() => {
    if (profileState.ok) toast.success("Профиль сохранён");
    if (profileState.error) toast.error(profileState.error);
  }, [profileState]);

  useEffect(() => {
    if (uploadState.ok) {
      toast.success("Аватар загружен");
      setAvatarTab("preset");
    }
    if (uploadState.error) toast.error(uploadState.error);
  }, [uploadState]);

  return (
    <div className="g-card p-6">
      {/* Header */}
      <div className="flex items-center gap-5 border-b border-black/10 pb-6">
        <Avatar value={selected} size={72} fallback={nickname || user.email} />
        <div>
          <p className="font-serif text-xl font-bold">{nickname || user.email}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gojo-ink-muted">{user.email}</span>
            <span className="rounded-sm bg-gojo-ink px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Single form for nickname + preset avatar */}
      <form action={profileAction} className="mt-6 space-y-6">
        {/* Nickname */}
        <div>
          <label
            className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
            htmlFor="nickname"
          >
            Никнейм
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Как к тебе обращаться?"
            maxLength={40}
            className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>

        {/* Telegram ID — enables Telegram reminders for personal trainings */}
        <div>
          <label
            className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft"
            htmlFor="telegramId"
          >
            Telegram ID (для напоминаний)
          </label>
          <input
            id="telegramId"
            name="telegramId"
            type="text"
            inputMode="numeric"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Например, 412587349"
            className="w-full rounded-md border border-black/10 bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
          <p className="mt-1.5 text-[11px] text-gojo-ink-muted">
            Узнать свой ID — напиши{" "}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gojo-orange hover:underline"
            >
              @userinfobot
            </a>{" "}
            в Telegram, он ответит числом. Вставь его сюда, чтобы получать напоминания о своих
            тренировках.
          </p>
        </div>

        {/* Avatar section */}
        <div>
          <p className="mb-3 text-[12px] font-bold text-gojo-ink-soft">Аватар</p>

          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-md border border-black/10 bg-gojo-paper p-1">
            <button
              type="button"
              onClick={() => setAvatarTab("preset")}
              className={`flex-1 rounded px-3 py-1.5 text-[11px] font-bold ${
                avatarTab === "preset"
                  ? "bg-gojo-ink text-white"
                  : "text-gojo-ink-muted hover:text-gojo-ink"
              }`}
            >
              Маскоты
            </button>
            <button
              type="button"
              onClick={() => setAvatarTab("upload")}
              className={`flex-1 rounded px-3 py-1.5 text-[11px] font-bold ${
                avatarTab === "upload"
                  ? "bg-gojo-ink text-white"
                  : "text-gojo-ink-muted hover:text-gojo-ink"
              }`}
            >
              Загрузить свой
            </button>
          </div>

          {avatarTab === "preset" ? (
            <>
              <input type="hidden" name="avatarUrl" value={selected ?? ""} />
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {PRESET_AVATARS.map((id) => {
                  const value = `${AVATAR_PRESET_PREFIX}${id}`;
                  const isActive = selected === value;
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setSelected(value)}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition ${
                        isActive
                          ? "border-gojo-orange bg-gojo-orange-soft"
                          : "border-black/10 bg-gojo-surface hover:border-black/20"
                      }`}
                    >
                      <Avatar value={value} size={44} />
                      <span className="text-[10px] font-bold text-gojo-ink-soft">
                        {PRESET_CONFIGS[id].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {avatarTab === "preset" ? (
          <button
            type="submit"
            disabled={profilePending}
            className="g-btn-primary w-full text-sm"
          >
            {profilePending ? "Сохраняем..." : "Сохранить изменения"}
          </button>
        ) : null}
      </form>

      {/* Upload form (separate because multipart) */}
      {avatarTab === "upload" ? (
        <form action={uploadAction} className="mt-4 space-y-4">
          <p className="text-sm text-gojo-ink-muted">PNG / JPEG / WebP / GIF, до 2 МБ.</p>
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-black/15 bg-gojo-paper-2 px-6 py-8 text-center transition hover:border-gojo-orange">
            <div>
              <p className="text-sm font-bold text-gojo-ink-soft">
                Перетащи файл или нажми для выбора
              </p>
              <p className="mt-1 text-[11px] text-gojo-ink-muted">Максимум 2 МБ</p>
            </div>
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              required
            />
          </label>
          <button
            type="submit"
            disabled={uploadPending}
            className="g-btn-primary w-full text-sm"
          >
            {uploadPending ? "Загружаем..." : "Загрузить аватар"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
