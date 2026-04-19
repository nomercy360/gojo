import { JOIN_WINDOW_MIN, type LessonJoinState } from "@gojo/shared";

export const JOIN_WINDOW_MS = JOIN_WINDOW_MIN * 60 * 1000;
/** How long after endsAt we still consider the room joinable (late arrivals). */
export const END_GRACE_MS = 0;
/** After this many ms past endsAt, auto-mark the lesson completed. */
export const AUTO_COMPLETE_AFTER_END_MS = 15 * 60 * 1000;

type LessonShape = {
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  startsAt: Date;
  endsAt: Date;
  maxStudents: number;
};

/**
 * Pure per-viewer state machine. Caller supplies whether the viewer is a
 * participant (booked student OR owning teacher) and the current seat count.
 */
export function computeJoinState(params: {
  now: Date;
  lesson: LessonShape;
  isParticipant: boolean;
  studentCount: number;
}): LessonJoinState {
  const { now, lesson, isParticipant, studentCount } = params;

  if (lesson.status === "cancelled") return "cancelled";
  if (now.getTime() >= lesson.endsAt.getTime() + END_GRACE_MS) return "ended";
  if (lesson.status === "completed") return "ended";

  const joinOpensAt = lesson.startsAt.getTime() - JOIN_WINDOW_MS;
  const inJoinWindow = now.getTime() >= joinOpensAt;

  if (isParticipant) {
    return inJoinWindow ? "joinable" : "waiting";
  }

  if (studentCount >= lesson.maxStudents) return "full";
  return "bookable";
}

export function joinOpensAt(lesson: { startsAt: Date }): Date {
  return new Date(lesson.startsAt.getTime() - JOIN_WINDOW_MS);
}
