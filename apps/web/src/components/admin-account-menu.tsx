"use client";

import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type AdminAccount = {
  email: string;
  nickname?: string | null;
  avatarUrl?: string | null;
};

export function AdminAccountMenu({
  user,
  placement = "bottom",
  dark = false,
}: {
  user: AdminAccount;
  placement?: "top" | "bottom";
  dark?: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) return;
      router.replace("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <Button
        type="button"
        variant="unstyled"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full min-w-0 items-center justify-start gap-2 rounded-lg px-2.5 text-sm font-semibold",
          dark
            ? "text-white/75 hover:bg-white/10 hover:text-white"
            : "text-gojo-ink hover:bg-gojo-paper-2",
        )}
      >
        <Avatar value={user.avatarUrl ?? null} size={25} fallback={user.nickname ?? user.email} />
        <span className="min-w-0 flex-1 truncate text-left">{user.email}</span>
        <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
      </Button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-50 w-72 overflow-hidden rounded-xl border border-gojo-ink/15 bg-gojo-ink p-2 text-white shadow-2xl",
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <Link
            href="/teacher?collection=admins"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <ShieldCheck className="size-5" />
            Управлять администраторами
          </Link>
          <div className="my-1 border-t border-white/10" />
          <Button
            type="button"
            role="menuitem"
            variant="unstyled"
            disabled={loggingOut}
            onClick={logout}
            className="flex h-auto w-full items-center justify-start gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-red-400 hover:bg-white/10 hover:text-red-300"
          >
            <LogOut className="size-5" />
            {loggingOut ? "Выходим..." : "Выйти"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
