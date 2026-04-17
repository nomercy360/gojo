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

  // Clear all better-auth cookies (they start with "better-auth")
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith("better-auth") || c.name === "gojo_session") {
      cookieStore.delete(c.name);
    }
  }

  redirect("/");
}
