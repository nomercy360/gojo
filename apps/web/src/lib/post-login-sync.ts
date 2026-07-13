const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PENDING_LEAD_KEY = "gojo:pending-lead-email";
const PENDING_CONSENT_KEY = "gojo:pending-personal-data-consent";

// After any login (Telegram OIDC or magic link — both redirect away from the
// login page, so this can't run inline there any more), link a guest booking
// lead to the fresh account and migrate anonymous trainer progress. Both are
// idempotent: they clear their localStorage key on success, so re-running on
// later page loads is a no-op.

export async function linkPendingBookingLead(): Promise<number> {
  if (!localStorage.getItem(PENDING_LEAD_KEY)) return 0;
  try {
    const res = await fetch(`${API_URL}/leads/link-current`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { linked?: number };
    localStorage.removeItem(PENDING_LEAD_KEY);
    return data.linked ?? 0;
  } catch {
    return 0;
  }
}

export async function savePendingPersonalDataConsent(): Promise<boolean> {
  const version = localStorage.getItem(PENDING_CONSENT_KEY);
  if (!version) return false;
  try {
    const res = await fetch(`${API_URL}/users/me/personal-data-consent`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    if (!res.ok) return false;
    localStorage.removeItem(PENDING_CONSENT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function migrateGuestTrainerProgress(userId: string): boolean {
  try {
    const guestKey = "gojo:guest-trainer-progress";
    const raw = localStorage.getItem(guestKey);
    if (!raw) return false;

    const accountKey = `gojo:trainer-progress:${userId}`;
    const existing = JSON.parse(localStorage.getItem(accountKey) ?? "[]") as unknown[];
    const guest = JSON.parse(raw) as unknown[];
    localStorage.setItem(accountKey, JSON.stringify([...existing, ...guest]));
    localStorage.removeItem(guestKey);
    return guest.length > 0;
  } catch {
    return false;
  }
}
