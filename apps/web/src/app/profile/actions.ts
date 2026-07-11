"use server";

import { ApiError, updateProfile, uploadAvatar } from "@/lib/api";
import { updateProfileInput } from "@gojo/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProfileState = { error?: string; ok?: boolean };

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const telegramIdRaw = String(formData.get("telegramId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const name = [firstName, lastName].filter(Boolean).join(" ") || undefined;
  const parsed = updateProfileInput.safeParse({
    name,
    nickname: String(formData.get("nickname") ?? "").trim() || undefined,
    avatarUrl: formData.get("avatarUrl") ? String(formData.get("avatarUrl")) : undefined,
    telegramId: telegramIdRaw === "" ? null : Number(telegramIdRaw),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateProfile(parsed.data);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/login");
      if (e.status === 409 && e.message.includes("telegram_id_taken")) {
        return { error: "Этот Telegram ID уже привязан к другому аккаунту" };
      }
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось сохранить" };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  redirect("/dashboard?saved=1");
}

export async function uploadAvatarAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Выбери файл" };
  }

  try {
    await uploadAvatar(file);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/login");
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось загрузить" };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}
