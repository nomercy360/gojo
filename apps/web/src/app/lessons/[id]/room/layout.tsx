import type { ReactNode } from "react";

/**
 * Room layout — no SiteHeader, no scroll, full viewport.
 * Overrides the root layout's body content area.
 */
export default function RoomLayout({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-hidden bg-[#1a1815]">{children}</div>;
}
