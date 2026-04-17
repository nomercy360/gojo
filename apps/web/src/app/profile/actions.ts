"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateProfileInput } from "@gojo/shared";
import { ApiError, updateProfile, uploadAvatar } from "@/lib/api";

export type ProfileState = { error?: string; ok?: boolean };

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = updateProfileInput.safeParse({
    nickname: String(formData.get("nickname") ?? "").trim() || undefined,
    avatarUrl: formData.get("avatarUrl") ? String(formData.get("avatarUrl")) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateProfile(parsed.data);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/login");
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось сохранить" };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
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
