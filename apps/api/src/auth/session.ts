import { DEFAULT_TIME_ZONE } from "@gojo/shared";
import { makeSignature } from "better-auth/crypto";
import { auth } from "../auth.ts";

// Passwordless account + session helpers. better-auth no longer exposes
// signUpEmail/signInEmail (email+password is gone), so admin-provisioned and
// dev accounts are created and signed in directly through better-auth's
// internal adapter, and we mint the session cookie ourselves.

type NewUser = {
  email: string;
  name: string;
  role?: "student" | "admin";
  nickname?: string;
  timeZone?: string;
};

/** Find a user by email, or create one (passwordless). Returns the user id. */
export async function findOrCreateUserByEmail(input: NewUser): Promise<string> {
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(input.email.toLowerCase());
  if (existing?.user) return existing.user.id;
  const created = await ctx.internalAdapter.createUser({
    email: input.email,
    name: input.name,
    emailVerified: false,
    role: input.role ?? "student",
    timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
    ...(input.nickname ? { nickname: input.nickname } : {}),
  });
  return created.id;
}

/**
 * Mint a better-auth session for a user and return the signed Set-Cookie header
 * value. The cookie is the session token signed with the auth secret in the
 * exact format better-call/better-auth expect, so `auth.api.getSession` accepts
 * it (verified by round-trip), but usable from a plain Hono handler.
 */
export async function createSessionCookie(userId: string): Promise<string> {
  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(userId, false);
  if (!session) throw new Error("failed_to_create_session");
  const { name, attributes } = ctx.authCookies.sessionToken;
  const value = encodeURIComponent(
    `${session.token}.${await makeSignature(session.token, ctx.secret)}`,
  );
  return serializeSessionCookie(name, value, attributes);
}

type CookieAttributes = {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string | boolean;
};

function serializeSessionCookie(name: string, value: string, attrs: CookieAttributes): string {
  const parts = [`${name}=${value}`];
  if (attrs.maxAge != null) parts.push(`Max-Age=${attrs.maxAge}`);
  if (attrs.path) parts.push(`Path=${attrs.path}`);
  if (attrs.httpOnly) parts.push("HttpOnly");
  if (attrs.secure) parts.push("Secure");
  if (typeof attrs.sameSite === "string") {
    parts.push(`SameSite=${attrs.sameSite.charAt(0).toUpperCase()}${attrs.sameSite.slice(1)}`);
  }
  return parts.join("; ");
}
