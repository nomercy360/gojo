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

function back(levelId: number | string): never {
  revalidatePath("/teacher/curriculum");
  redirect(`/teacher/curriculum?level=${levelId}`);
}

export async function createUnitAction(formData: FormData) {
  const levelId = Number(formData.get("levelId") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const sourceBook = String(formData.get("sourceBook") ?? "").trim() || null;
  const sourceChapter = String(formData.get("sourceChapter") ?? "").trim() || null;
  if (!levelId || !title) return;

  try {
    await createTeacherUnit({ levelId, title, sourceBook, sourceChapter });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
    throw e;
  }
  back(levelId);
}

export async function updateUnitAction(formData: FormData) {
  const unitId = String(formData.get("unitId") ?? "");
  const levelId = String(formData.get("levelId") ?? "1");
  const title = String(formData.get("title") ?? "").trim();
  const positionRaw = String(formData.get("position") ?? "").trim();
  const sourceBook = String(formData.get("sourceBook") ?? "").trim() || null;
  const sourceChapter = String(formData.get("sourceChapter") ?? "").trim() || null;
  if (!unitId || !title) return;

  try {
    await updateTeacherUnit(unitId, {
      title,
      ...(positionRaw ? { position: Number(positionRaw) } : {}),
      sourceBook,
      sourceChapter,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
    throw e;
  }
  back(levelId);
}

export async function deleteUnitAction(formData: FormData) {
  const unitId = String(formData.get("unitId") ?? "");
  const levelId = String(formData.get("levelId") ?? "1");
  if (!unitId) return;

  try {
    await deleteTeacherUnit(unitId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
    throw e;
  }
  back(levelId);
}

export async function addVocabAction(formData: FormData) {
  const levelId = Number(formData.get("levelId") ?? 0);
  const word = String(formData.get("word") ?? "").trim();
  const reading = String(formData.get("reading") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();
  const unitId = String(formData.get("unitId") ?? "") || null;
  if (!levelId || !word || !reading || !meaning) return;

  try {
    await createLevelVocab({ levelId, word, reading, meaning, unitId });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
    if (e instanceof ApiError && e.status === 400) back(levelId);
    throw e;
  }
  back(levelId);
}

export async function updateVocabAction(formData: FormData) {
  const vocabId = String(formData.get("vocabId") ?? "");
  const levelId = String(formData.get("levelId") ?? "1");
  const word = String(formData.get("word") ?? "").trim();
  const reading = String(formData.get("reading") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();
  const unitId = String(formData.get("unitId") ?? "") || null;
  if (!vocabId || !word || !reading || !meaning) return;

  try {
    await updateLevelVocab(vocabId, { word, reading, meaning, unitId });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
    throw e;
  }
  back(levelId);
}

export async function deleteVocabAction(formData: FormData) {
  const vocabId = String(formData.get("vocabId") ?? "");
  const levelId = String(formData.get("levelId") ?? "1");
  if (!vocabId) return;

  try {
    await deleteLevelVocab(vocabId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
    throw e;
  }
  back(levelId);
}
