"use client";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view") ?? "list";

  const set = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("view", v);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex gap-1 rounded-md border border-black/10 bg-gojo-paper p-1">
      <Button
        type="button"
        onClick={() => set("list")}
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
      >
        Список
      </Button>
      <Button
        type="button"
        onClick={() => set("calendar")}
        variant={view === "calendar" ? "secondary" : "ghost"}
        size="sm"
      >
        Календарь
      </Button>
    </div>
  );
}
