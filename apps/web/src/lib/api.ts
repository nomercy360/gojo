import type {
  LessonDto,
  LessonMaterialDto,
  LivekitTokenResponse,
  StudentStatsDto,
  UpdateProfileInput,
  UserDto,
} from "@gojo/shared";
import { getCookieHeader } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type FetchOptions = RequestInit & { withAuth?: boolean };

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { withAuth, headers, ...rest } = opts;
  const hs: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (withAuth !== false) {
    const cookie = await getCookieHeader();
    if (cookie) (hs as Record<string, string>).Cookie = cookie;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    cache: "no-store",
    headers: hs,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `api error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function fetchLessons() {
  return apiFetch<LessonDto[]>("/lessons");
}

export function fetchLesson(id: string) {
  return apiFetch<LessonDto>(`/lessons/${id}`);
}

export function fetchStudentStats() {
  return apiFetch<StudentStatsDto>("/lessons/my-stats");
}

export function fetchLessonMaterials(lessonId: string) {
  return apiFetch<LessonMaterialDto[]>(`/lessons/${lessonId}/materials`);
}

export function fetchLivekitToken(lessonId: string) {
  return apiFetch<LivekitTokenResponse>(`/livekit/token/${lessonId}`, {
    method: "POST",
  });
}

export function bookLesson(lessonId: string) {
  return apiFetch<{ id: string; lessonId: string; studentId: string }>(
    `/lessons/${lessonId}/book`,
    { method: "POST" },
  );
}

export function updateProfile(body: UpdateProfileInput) {
  return apiFetch<UserDto>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function uploadAvatar(file: File): Promise<UserDto> {
  const form = new FormData();
  form.append("file", file);
  const cookie = await getCookieHeader();
  const res = await fetch(`${API_URL}/users/me/avatar`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `api error ${res.status}`);
  }
  return (await res.json()) as UserDto;
}

export type TeacherLessonDto = LessonDto & { studentCount: number };

export function fetchTeacherLessons() {
  return apiFetch<TeacherLessonDto[]>("/teacher/lessons");
}

export function createLesson(body: { title: string; startsAt: string; endsAt: string }) {
  return apiFetch<LessonDto>("/teacher/lessons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function cancelLesson(lessonId: string) {
  return apiFetch<{ ok: boolean }>(`/teacher/lessons/${lessonId}`, { method: "DELETE" });
}

export function fetchLessonStudents(lessonId: string): Promise<
  {
    bookingId: string;
    studentId: string;
    nickname: string | null;
    email: string;
    avatarUrl: string | null;
    bookedAt: string;
  }[]
> {
  return apiFetch(`/teacher/lessons/${lessonId}/students`);
}
