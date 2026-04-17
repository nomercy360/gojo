"use client";

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
    <div className="flex gap-1 rounded-md border-2 border-gojo-ink p-1">
      <button
        type="button"
        onClick={() => set("list")}
        className={`rounded px-3 py-1 text-[11px] font-bold ${
          view === "list" ? "bg-gojo-ink text-white" : "text-gojo-ink-muted hover:text-gojo-ink"
        }`}
      >
        Список
      </button>
      <button
        type="button"
        onClick={() => set("calendar")}
        className={`rounded px-3 py-1 text-[11px] font-bold ${
          view === "calendar"
            ? "bg-gojo-ink text-white"
            : "text-gojo-ink-muted hover:text-gojo-ink"
        }`}
      >
        Календарь
      </button>
    </div>
  );
}
