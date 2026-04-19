import type { Flashcard, Kanji, Lesson, LessonCard, User } from "@gojo/db";
import type { FlashcardDto, KanjiDto, LessonCardDto, LessonDto, UserDto } from "@gojo/shared";

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname ?? null,
    avatarUrl: u.image ?? null,
    role: u.role,
    jlptLevel: u.jlptLevel ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toLessonCardDto(c: LessonCard): LessonCardDto {
  return {
    id: c.id,
    lessonId: c.lessonId,
    word: c.word,
    reading: c.reading,
    meaning: c.meaning,
    notes: c.notes ?? null,
    position: c.position,
    createdAt: c.createdAt.toISOString(),
  };
}

export function toFlashcardDto(f: Flashcard): FlashcardDto {
  return {
    id: f.id,
    word: f.word,
    reading: f.reading,
    meaning: f.meaning,
    stage: f.stage,
    modifier: Number(f.modifier),
    streak: f.streak,
    lapses: f.lapses,
    due: f.due.toISOString(),
    lastReview: f.lastReview ? f.lastReview.toISOString() : null,
    lessonCardId: f.lessonCardId ?? null,
  };
}

export function toKanjiDto(k: Kanji): KanjiDto {
  return {
    character: k.character,
    strokeCount: k.strokeCount,
    meaning: k.meaning,
    grade: k.grade ?? null,
    kunyomiJa: k.kunyomiJa ?? null,
    kunyomi: k.kunyomi ?? null,
    onyomiJa: k.onyomiJa ?? null,
    onyomi: k.onyomi ?? null,
    examples: k.examples ?? null,
    radical: k.radical ?? null,
    radNameJa: k.radNameJa ?? null,
    radName: k.radName ?? null,
    radMeaning: k.radMeaning ?? null,
  };
}

export function toLessonDto(
  lesson: Lesson,
  teacherNickname: string | null,
  opts?: { booked?: boolean; studentCount?: number },
): LessonDto {
  return {
    id: lesson.id,
    teacherId: lesson.teacherId,
    teacherNickname,
    title: lesson.title,
    status: lesson.status,
    startsAt: lesson.startsAt.toISOString(),
    endsAt: lesson.endsAt.toISOString(),
    maxStudents: lesson.maxStudents,
    jlptLevel: lesson.jlptLevel,
    recordingUrl: lesson.recordingUrl,
    ...(opts?.booked !== undefined ? { booked: opts.booked } : {}),
    ...(opts?.studentCount !== undefined ? { studentCount: opts.studentCount } : {}),
  };
}
