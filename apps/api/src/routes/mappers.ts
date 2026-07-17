import type { Flashcard, HomeworkSubmission, Kanji, Lesson, LessonCard, User } from "@gojo/db";
import type {
  FlashcardDto,
  HomeworkAiReview,
  HomeworkSubmissionDto,
  KanjiDto,
  LessonCardDto,
  LessonDto,
  LessonJoinState,
  UserDto,
} from "@gojo/shared";
import { computeJoinState, joinOpensAt } from "../lib/lesson-state.ts";

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    nickname: u.nickname ?? null,
    avatarUrl: u.image ?? null,
    role: u.role,
    jlptLevel: u.jlptLevel ?? null,
    quizLevel: u.quizLevel ?? null,
    telegramId: u.telegramId ?? null,
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
  opts?: {
    booked?: boolean;
    studentCount?: number;
    isParticipant?: boolean;
    now?: Date;
    /** When false, recordingUrl is withheld (viewer lacks access). Defaults to true. */
    includeRecording?: boolean;
    /** When false, meetingUrl is withheld (viewer lacks access). Defaults to false. */
    includeMeetingUrl?: boolean;
  },
): LessonDto {
  let joinState: LessonJoinState | undefined;
  let joinOpensAtStr: string | undefined;
  if (opts?.now && opts.studentCount !== undefined && opts.isParticipant !== undefined) {
    joinState = computeJoinState({
      now: opts.now,
      lesson,
      isParticipant: opts.isParticipant,
      studentCount: opts.studentCount,
    });
    if (joinState === "waiting") {
      joinOpensAtStr = joinOpensAt(lesson).toISOString();
    }
  }

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
    unitId: lesson.unitId ?? null,
    recordingUrl: opts?.includeRecording === false ? null : lesson.recordingUrl,
    meetingUrl: opts?.includeMeetingUrl ? lesson.meetingUrl : null,
    ...(opts?.booked !== undefined ? { booked: opts.booked } : {}),
    ...(opts?.studentCount !== undefined ? { studentCount: opts.studentCount } : {}),
    ...(joinState ? { joinState } : {}),
    ...(joinOpensAtStr ? { joinOpensAt: joinOpensAtStr } : {}),
  };
}

export function toSubmissionDto(s: HomeworkSubmission): HomeworkSubmissionDto {
  return {
    id: s.id,
    lessonId: s.lessonId,
    studentId: s.studentId,
    content: s.content,
    status: s.status,
    aiReview: (s.aiReview as HomeworkAiReview | null) ?? null,
    aiReviewError: s.aiReviewError ?? null,
    teacherComment: s.teacherComment ?? null,
    reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
  };
}
