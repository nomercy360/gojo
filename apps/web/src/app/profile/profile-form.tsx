"use client";

import { AVATAR_PRESET_PREFIX, PRESET_AVATARS, type UserDto } from "@gojo/shared";
import { useActionState, useEffect, useState } from "react";
import { Avatar, PRESET_CONFIGS } from "@/components/avatar";
import { type ProfileState, updateProfileAction, uploadAvatarAction } from "./actions";
import { toast } from "sonner";

const initial: ProfileState = {};

export function ProfileForm({ user }: { user: UserDto }) {
  const [selected, setSelected] = useState<string | null>(user.avatarUrl);
  const [avatarTab, setAvatarTab] = useState<"preset" | "upload">("preset");
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    initial,
  );
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadAvatarAction,
    initial,
  );

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
    <div className="card-pop rounded-lg border-2 border-gojo-ink bg-gojo-surface p-6">
      {/* Header */}
      <div className="flex items-center gap-5 border-b border-gojo-ink/10 pb-6">
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
          <label className="mb-1.5 block text-[12px] font-bold text-gojo-ink-soft" htmlFor="nickname">
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
            className="w-full rounded-md border-2 border-gojo-ink bg-gojo-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-gojo-ink-ghost focus:outline-2 focus:outline-gojo-orange-soft focus:outline-offset-2"
          />
        </div>

        {/* Avatar section */}
        <div>
          <p className="mb-3 text-[12px] font-bold text-gojo-ink-soft">Аватар</p>

          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-md border-2 border-gojo-ink p-1">
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
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition ${
                        isActive
                          ? "border-gojo-orange bg-gojo-orange-soft"
                          : "border-gojo-ink/20 bg-gojo-surface hover:border-gojo-ink"
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
            className="btn-pop w-full rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {profilePending ? "Сохраняем..." : "Сохранить изменения"}
          </button>
        ) : null}
      </form>

      {/* Upload form (separate because multipart) */}
      {avatarTab === "upload" ? (
        <form action={uploadAction} className="mt-4 space-y-4">
          <p className="text-sm text-gojo-ink-muted">PNG / JPEG / WebP / GIF, до 2 МБ.</p>
          <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gojo-ink/30 bg-gojo-surface-2 px-6 py-8 text-center transition hover:border-gojo-orange">
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
            className="btn-pop w-full rounded-md border-2 border-gojo-ink bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {uploadPending ? "Загружаем..." : "Загрузить аватар"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
