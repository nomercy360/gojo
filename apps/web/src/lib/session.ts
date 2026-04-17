import { cookies } from "next/headers";
import type { UserDto } from "@gojo/shared";

export const SESSION_COOKIE = "gojo_session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<UserDto | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as UserDto;
  } catch {
    return null;
  }
}
