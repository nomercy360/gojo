import { cookies, headers } from "next/headers";
import type { UserDto } from "@gojo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Fetches the current session from better-auth via /auth/get-session.
 * Forwards the browser's Cookie header so the better-auth session is preserved.
 */
export async function getCurrentUser(): Promise<UserDto | null> {
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_URL}/auth/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: RawUser } | null;
    if (!data?.user) return null;
    return toUserDto(data.user);
  } catch {
    return null;
  }
}

/**
 * For forwarding to the API in server components/actions.
 * Call `cookies` inside the caller to get the raw cookie header.
 */
export async function getCookieHeader(): Promise<string> {
  return (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function forwardHeaders(): Promise<Headers> {
  const h = await headers();
  const forwarded = new Headers();
  const cookie = await getCookieHeader();
  if (cookie) forwarded.set("Cookie", cookie);
  const auth = h.get("authorization");
  if (auth) forwarded.set("Authorization", auth);
  return forwarded;
}

type RawUser = {
  id: string;
  email: string;
  name?: string;
  nickname?: string | null;
  image?: string | null;
  role?: string;
  jlptLevel?: string | null;
  createdAt?: string | Date;
};

function toUserDto(u: RawUser): UserDto {
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname ?? u.name ?? null,
    avatarUrl: u.image ?? null,
    role: (u.role as UserDto["role"]) ?? "student",
    jlptLevel: u.jlptLevel ?? null,
    createdAt:
      typeof u.createdAt === "string"
        ? u.createdAt
        : (u.createdAt ?? new Date()).toString(),
  };
}
