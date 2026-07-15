"use client";

import { Avatar, PRESET_CONFIGS } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AVATAR_PRESET_PREFIX, PRESET_AVATARS, type UserDto } from "@gojo/shared";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { type ProfileState, updateProfileAction, uploadAvatarAction } from "./actions";

const initial: ProfileState = {};

export function ProfileForm({ user }: { user: UserDto }) {
  const [selected, setSelected] = useState<string | null>(user.avatarUrl);
  const [avatarTab, setAvatarTab] = useState<"preset" | "upload">("preset");
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [nameParts] = useState(() => {
    const [firstName = "", ...rest] = user.name.trim().split(/\s+/);
    return { firstName, lastName: rest.join(" ") };
  });
  const [firstName, setFirstName] = useState(nameParts.firstName);
  const [lastName, setLastName] = useState(nameParts.lastName);
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    initial,
  );
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadAvatarAction, initial);

  useEffect(() => {
    setSelected(user.avatarUrl);
  }, [user.avatarUrl]);

  useEffect(() => {
    // Success is signalled by a redirect to /dashboard?saved=1 (see updateProfileAction),
    // so only the error branch fires here.
    if (profileState?.error) toast.error(profileState.error);
  }, [profileState]);

  useEffect(() => {
    if (uploadState?.ok) {
      toast.success("Аватар загружен");
      setAvatarTab("preset");
    }
    if (uploadState?.error) toast.error(uploadState.error);
  }, [uploadState]);

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center gap-5 border-b border-black/10 pb-6">
        <Avatar value={selected} size={72} fallback={nickname || user.email} />
        <div>
          <p className="font-serif text-xl font-bold">{nickname || user.email}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gojo-ink-muted">{user.email}</span>
            <Badge variant="secondary">{user.role}</Badge>
          </div>
        </div>
      </div>

      {/* Single form for name + nickname + preset avatar */}
      <form action={profileAction} className="mt-6 space-y-6">
        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="firstName">Имя</FieldLabel>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Имя"
              maxLength={100}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Фамилия</FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Фамилия"
              maxLength={100}
            />
          </Field>
        </div>

        {/* Nickname */}
        <Field>
          <FieldLabel htmlFor="nickname">Никнейм</FieldLabel>
          <Input
            id="nickname"
            name="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Как к тебе обращаться?"
            maxLength={40}
          />
        </Field>

        {/* Avatar section */}
        <div>
          <p className="mb-3 text-[12px] font-bold text-gojo-ink-soft">Аватар</p>

          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-md border border-black/10 bg-gojo-paper p-1">
            <Button
              type="button"
              onClick={() => setAvatarTab("preset")}
              variant={avatarTab === "preset" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
            >
              Маскоты
            </Button>
            <Button
              type="button"
              onClick={() => setAvatarTab("upload")}
              variant={avatarTab === "upload" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
            >
              Загрузить свой
            </Button>
          </div>

          {avatarTab === "preset" ? (
            <>
              <Input unstyled type="hidden" name="avatarUrl" value={selected ?? ""} />
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {PRESET_AVATARS.map((id) => {
                  const value = `${AVATAR_PRESET_PREFIX}${id}`;
                  const isActive = selected === value;
                  return (
                    <Button
                      type="button"
                      key={id}
                      onClick={() => setSelected(value)}
                      variant="outline"
                      className={`h-auto flex-col gap-2 rounded-lg p-3 ${
                        isActive
                          ? "border-gojo-orange bg-gojo-orange-soft"
                          : "border-black/10 bg-gojo-surface hover:border-black/20"
                      }`}
                    >
                      <Avatar value={value} size={44} />
                      <span className="text-[10px] font-bold text-gojo-ink-soft">
                        {PRESET_CONFIGS[id].label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {avatarTab === "preset" ? (
          <Button type="submit" disabled={profilePending} className="w-full">
            {profilePending ? "Сохраняем..." : "Сохранить изменения"}
          </Button>
        ) : null}
      </form>

      {/* Upload form (separate because multipart) */}
      {avatarTab === "upload" ? (
        <form action={uploadAction} className="mt-4 space-y-4">
          <p className="text-sm text-gojo-ink-muted">PNG / JPEG / WebP / GIF, до 2 МБ.</p>
          <label
            htmlFor="avatar-upload"
            className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-black/15 bg-gojo-paper-2 px-6 py-8 text-center transition hover:border-gojo-orange"
          >
            <div>
              <p className="text-sm font-bold text-gojo-ink-soft">
                Перетащи файл или нажми для выбора
              </p>
              <p className="mt-1 text-[11px] text-gojo-ink-muted">Максимум 2 МБ</p>
            </div>
            <Input
              unstyled
              id="avatar-upload"
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              required
            />
          </label>
          <Button type="submit" disabled={uploadPending} className="w-full">
            {uploadPending ? "Загружаем..." : "Загрузить аватар"}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
