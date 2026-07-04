import type {
  AddLessonCardInput,
  FlashcardDto,
  HomeworkStatus,
  JlptLevel,
  KanjiBreakdownEntry,
  KanjiDto,
  LessonCardDto,
  LessonDto,
  LessonMaterialDto,
  LivekitTokenResponse,
  QuizQuestionDto,
  QuizResultDto,
  QuizSubmitInput,
  ReviewQueueDto,
  StudentStatsDto,
  SubmitReviewInput,
  TrackTrainingInput,
  TrainingTotalsDto,
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

export function fetchReviewQueue() {
  return apiFetch<ReviewQueueDto>("/review/queue");
}

export function submitCardReview(id: string, body: SubmitReviewInput) {
  return apiFetch<FlashcardDto>(`/review/cards/${id}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function promoteCard(id: string) {
  return apiFetch<FlashcardDto>(`/review/cards/${id}/promote`, { method: "POST" });
}

export function fetchKanjiBreakdown(word: string) {
  return apiFetch<KanjiBreakdownEntry[]>(`/kanji/breakdown?word=${encodeURIComponent(word)}`);
}

export function fetchKanji(char: string) {
  return apiFetch<KanjiDto>(`/kanji/${encodeURIComponent(char)}`);
}

export function fetchKanjiList(difficulty: "easy" | "medium" | "hard" | "all", limit: number) {
  return apiFetch<KanjiDto[]>(`/kanji/list?difficulty=${difficulty}&limit=${limit}`);
}

export function fetchLessonCards(lessonId: string) {
  return apiFetch<LessonCardDto[]>(`/teacher/lessons/${lessonId}/cards`);
}

export function addLessonCard(lessonId: string, body: AddLessonCardInput) {
  return apiFetch<LessonCardDto>(`/teacher/lessons/${lessonId}/cards`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteLessonCard(lessonId: string, cardId: string) {
  return apiFetch<{ ok: boolean }>(`/teacher/lessons/${lessonId}/cards/${cardId}`, {
    method: "DELETE",
  });
}

export function fetchQuizQuestions() {
  return apiFetch<QuizQuestionDto[]>("/onboarding/quiz/questions");
}

export function submitQuiz(body: QuizSubmitInput) {
  return apiFetch<QuizResultDto>("/onboarding/quiz", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type LessonStudentDto = {
  bookingId: string;
  studentId: string;
  nickname: string | null;
  email: string;
  avatarUrl: string | null;
  bookedAt: string;
  homeworkStatus: HomeworkStatus;
  homeworkMarkedAt: string | null;
  jlptLevel: string | null;
  quizLevel: string | null;
};

export function fetchLessonStudents(lessonId: string): Promise<LessonStudentDto[]> {
  return apiFetch(`/teacher/lessons/${lessonId}/students`);
}

export function setHomeworkStatus(lessonId: string, studentId: string, status: HomeworkStatus) {
  return apiFetch<{ studentId: string; status: HomeworkStatus; markedAt: string | null }>(
    `/teacher/lessons/${lessonId}/homework/${studentId}`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export function setStudentLevel(lessonId: string, studentId: string, jlptLevel: JlptLevel) {
  return apiFetch<{ studentId: string; jlptLevel: string | null }>(
    `/teacher/lessons/${lessonId}/students/${studentId}/level`,
    { method: "PATCH", body: JSON.stringify({ jlptLevel }) },
  );
}

export function trackTraining(body: TrackTrainingInput) {
  return apiFetch<{ ok: boolean }>("/training/track", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchTrainingTotals() {
  return apiFetch<TrainingTotalsDto>("/training/me");
}
