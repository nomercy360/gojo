import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb, account } from "@gojo/db";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { env } from "../env.ts";

const db = createDb(env.DATABASE_URL);

async function refreshGoogleToken(token: string) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export const calendarRoute = new Hono<AuthContext>();

// GET /calendar/status — is Google Calendar connected?
calendarRoute.get("/status", requireAuth, async (c) => {
  const user = c.get("user")!;
  const [ga] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "google")));
  return c.json({ connected: !!ga, googleEnabled: !!env.GOOGLE_CLIENT_ID });
});

// GET /calendar/events — upcoming events from Google Calendar (next 14 days)
calendarRoute.get("/events", requireAuth, async (c) => {
  const user = c.get("user")!;
  const [ga] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "google")));

  if (!ga?.accessToken) return c.json({ connected: false, events: [] });

  let token = ga.accessToken;

  if (ga.accessTokenExpiresAt && ga.accessTokenExpiresAt < new Date()) {
    if (!ga.refreshToken) return c.json({ connected: false, events: [] });
    const refreshed = await refreshGoogleToken(ga.refreshToken);
    if (!refreshed) return c.json({ connected: false, events: [] });
    token = refreshed.accessToken;
    await db
      .update(account)
      .set({ accessToken: token, accessTokenExpiresAt: refreshed.expiresAt })
      .where(eq(account.id, ga.id));
  }

  const now = new Date().toISOString();
  const twoWeeks = new Date(Date.now() + 14 * 86_400_000).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(twoWeeks)}` +
      `&singleEvents=true&orderBy=startTime&maxResults=20`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) return c.json({ connected: true, events: [], error: "fetch_failed" });

  const data = await res.json() as { items?: unknown[] };
  return c.json({ connected: true, events: data.items ?? [] });
});

// DELETE /calendar/disconnect
calendarRoute.delete("/disconnect", requireAuth, async (c) => {
  const user = c.get("user")!;
  await db
    .delete(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "google")));
  return c.json({ ok: true });
});
