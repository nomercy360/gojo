import type { Lesson, User } from "@gojo/db";
import type { LessonDto, UserDto } from "@gojo/shared";

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    role: user.role,
    jlptLevel: user.jlptLevel,
    createdAt: user.createdAt.toISOString(),
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
