"use server";

import {
  ApiError,
  createLevelVocab,
  createTeacherUnit,
  deleteLevelVocab,
  deleteTeacherUnit,
  updateLevelVocab,
  updateTeacherUnit,
} from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TeacherActionState } from "../actions";

export async function createUnitAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const levelId = Number(formData.get("levelId") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const sourceBook = String(formData.get("sourceBook") ?? "").trim() || null;
  const sourceChapter = String(formData.get("sourceChapter") ?? "").trim() || null;
  if (!levelId || !title) return { error: "Укажи название юнита" };

  try {
    await createTeacherUnit({ levelId, title, sourceBook, sourceChapter });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось создать юнит" };
  }
  revalidatePath("/teacher");
  return { ok: true };
}

export async function updateUnitAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const unitId = String(formData.get("unitId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const positionRaw = String(formData.get("position") ?? "").trim();
  const sourceBook = String(formData.get("sourceBook") ?? "").trim() || null;
  const sourceChapter = String(formData.get("sourceChapter") ?? "").trim() || null;
  if (!unitId || !title) return { error: "Укажи название юнита" };

  try {
    await updateTeacherUnit(unitId, {
      title,
      ...(positionRaw ? { position: Number(positionRaw) } : {}),
      sourceBook,
      sourceChapter,
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось сохранить юнит" };
  }
  revalidatePath("/teacher");
  return { ok: true };
}

export async function deleteUnitAction(formData: FormData) {
  const unitId = String(formData.get("unitId") ?? "");
  if (!unitId) return;

  try {
    await deleteTeacherUnit(unitId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
  }
  revalidatePath("/teacher");
}

export async function addVocabAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const levelId = Number(formData.get("levelId") ?? 0);
  const word = String(formData.get("word") ?? "").trim();
  const reading = String(formData.get("reading") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();
  const unitId = String(formData.get("unitId") ?? "") || null;
  if (!levelId || !word || !reading || !meaning)
    return { error: "Заполни слово, чтение и значение" };

  try {
    await createLevelVocab({ levelId, word, reading, meaning, unitId });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      if (e.status === 400 && e.message.includes("word_already_in_level")) {
        return { error: "Это слово уже есть на уровне" };
      }
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось добавить слово" };
  }
  revalidatePath("/teacher");
  return { ok: true };
}

export async function updateVocabAction(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const vocabId = String(formData.get("vocabId") ?? "");
  const word = String(formData.get("word") ?? "").trim();
  const reading = String(formData.get("reading") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();
  const unitId = String(formData.get("unitId") ?? "") || null;
  if (!vocabId || !word || !reading || !meaning)
    return { error: "Заполни слово, чтение и значение" };

  try {
    await updateLevelVocab(vocabId, { word, reading, meaning, unitId });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/admin/login");
      return { error: `API ${e.status}: ${e.message}` };
    }
    return { error: "Не удалось сохранить слово" };
  }
  revalidatePath("/teacher");
  return { ok: true };
}

export async function deleteVocabAction(formData: FormData) {
  const vocabId = String(formData.get("vocabId") ?? "");
  if (!vocabId) return;

  try {
    await deleteLevelVocab(vocabId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
  }
  revalidatePath("/teacher");
}
