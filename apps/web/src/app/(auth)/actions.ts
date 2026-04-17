"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, devLogin } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim() || undefined;
  const role = String(formData.get("role") ?? "student");

  if (!email) return { error: "Email обязателен" };

  try {
    const session = await devLogin({ email, nickname, role });
    const store = await cookies();
    store.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
  } catch (e) {
    if (e instanceof ApiError) return { error: `API ${e.status}: ${e.message}` };
    return { error: "Не удалось войти" };
  }

  redirect("/lessons");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/");
}
