import type { Lesson, User } from "@gojo/db";
import type { LessonDto, UserDto } from "@gojo/shared";

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
