"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UserDto } from "@gojo/shared";
import { useTransition } from "react";
import { toast } from "sonner";
import { linkTelegramAction, unlinkTelegramAction } from "./actions";

export function TelegramConnect({ user }: { user: UserDto }) {
  const linked = user.telegramId != null;
  const [pending, startTransition] = useTransition();

  function connect() {
    startTransition(async () => {
      const res = await linkTelegramAction();
      if (res.error || !res.url) {
        toast.error(res.error ?? "Не удалось создать ссылку");
        return;
      }
      // Opens the bot with a one-time ?start= token; pressing Start links the
      // account. The user returns here and refreshes to see the linked state.
      window.open(res.url, "_blank", "noopener,noreferrer");
      toast.info("Откройте бота и нажмите «Start», затем обновите страницу.");
    });
  }

  function disconnect() {
    startTransition(async () => {
      const res = await unlinkTelegramAction();
      if (res.error) toast.error(res.error);
      else toast.success("Telegram отвязан");
    });
  }

  return (
    <Card className="mt-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-serif text-lg font-bold">Telegram</p>
          <p className="mt-1 text-sm text-gojo-ink-muted">
            {linked
              ? "Подключён — вход по кнопке и напоминания об уроках работают."
              : "Подключите, чтобы входить в один тап и получать напоминания об уроках."}
          </p>
        </div>
        {linked ? (
          <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-[12px] font-bold text-green-700">
            ✓ Подключён
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        {linked ? (
          <>
            <Button type="button" variant="outline" onClick={connect} disabled={pending}>
              Переподключить
            </Button>
            <Button type="button" variant="ghost" onClick={disconnect} disabled={pending}>
              Отвязать
            </Button>
          </>
        ) : (
          <Button type="button" onClick={connect} disabled={pending}>
            {pending ? "Готовим ссылку..." : "Подключить Telegram"}
          </Button>
        )}
      </div>
    </Card>
  );
}
