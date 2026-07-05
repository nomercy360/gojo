"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function logoutAction() {
  const cookieStore = await cookies();
  const cookie = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Call better-auth signout to invalidate session server-side
  try {
    await fetch(`${API_URL}/auth/sign-out`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    });
  } catch {
    // ignore — still clear local cookies below
  }

  // Clear all better-auth cookies. In prod these carry a "__Secure-" (or
  // "__Host-") prefix (e.g. __Secure-better-auth.session_token) because
  // defaultCookieAttributes sets secure:true — a plain startsWith("better-auth")
  // check misses those entirely, so logout silently failed to clear the
  // session cookie in production.
  for (const c of cookieStore.getAll()) {
    if (c.name.includes("better-auth") || c.name === "gojo_session") {
      cookieStore.delete(c.name);
    }
  }

  redirect("/");
}
