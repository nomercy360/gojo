import type {
  LessonDto,
  LessonMaterialDto,
  SessionResponse,
  StudentStatsDto,
  UpdateProfileInput,
  UserDto,
} from "@gojo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type FetchOptions = RequestInit & { token?: string | null };

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
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

import type { LivekitTokenResponse } from "@gojo/shared";

export function fetchLessons(token?: string | null) {
  return apiFetch<LessonDto[]>("/lessons", { token });
}

export function fetchLesson(id: string) {
  return apiFetch<LessonDto>(`/lessons/${id}`);
}

export function fetchStudentStats(token: string) {
  return apiFetch<StudentStatsDto>("/lessons/my-stats", { token });
}

export function fetchLessonMaterials(lessonId: string) {
  return apiFetch<LessonMaterialDto[]>(`/lessons/${lessonId}/materials`);
}

export function fetchLivekitToken(lessonId: string, token: string) {
  return apiFetch<LivekitTokenResponse>(`/livekit/token/${lessonId}`, {
    method: "POST",
    token,
  });
}

export function devLogin(body: { email: string; nickname?: string; role?: string }) {
  return apiFetch<SessionResponse>("/auth/dev-login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function bookLesson(lessonId: string, token: string) {
  return apiFetch<{ id: string; lessonId: string; studentId: string }>(
    `/lessons/${lessonId}/book`,
    { method: "POST", token },
  );
}

export function updateProfile(body: UpdateProfileInput, token: string) {
  return apiFetch<UserDto>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export type TeacherLessonDto = LessonDto & { studentCount: number };

export function fetchTeacherLessons(token: string) {
  return apiFetch<TeacherLessonDto[]>("/teacher/lessons", { token });
}

export function createLesson(
  body: { title: string; startsAt: string; endsAt: string },
  token: string,
) {
  return apiFetch<LessonDto>("/teacher/lessons", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function cancelLesson(lessonId: string, token: string) {
  return apiFetch<{ ok: boolean }>(`/teacher/lessons/${lessonId}`, {
    method: "DELETE",
    token,
  });
}

export function fetchLessonStudents(
  lessonId: string,
  token: string,
): Promise<
  {
    bookingId: string;
    studentId: string;
    nickname: string | null;
    email: string;
    avatarUrl: string | null;
    bookedAt: string;
  }[]
> {
  return apiFetch(`/teacher/lessons/${lessonId}/students`, { token });
}

export async function uploadAvatar(file: File, token: string): Promise<UserDto> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/users/me/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `api error ${res.status}`);
  }
  return (await res.json()) as UserDto;
}
