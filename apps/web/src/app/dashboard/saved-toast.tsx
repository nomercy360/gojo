"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Fires a one-shot success toast when the dashboard is reached with ?saved=1
 * (set by the profile save action, which redirects here). Kept as a tiny client
 * island so the dashboard page itself stays a server component.
 */
export function SavedToast() {
  const saved = useSearchParams().get("saved");
  const shown = useRef(false);

  useEffect(() => {
    if (saved === "1" && !shown.current) {
      shown.current = true;
      toast.success("Профиль сохранён");
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [saved]);

  return null;
}
