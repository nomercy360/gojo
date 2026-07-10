import type {
  AddLessonCardInput,
  CheckoutResponseDto,
  FlashcardDto,
  HomeworkStatus,
  HomeworkSubmissionDto,
  ReviewSubmissionInput,
  TeacherSubmissionDto,
  JlptLevel,
  KanjiBreakdownEntry,
  KanjiDto,
  LessonCardDto,
  LessonDto,
  LessonMaterialDto,
  LibraryItemDto,
  LivekitTokenResponse,
  PaymentAccessDto,
  PaymentDto,
  PaymentPlanDto,
  PaymentsMeDto,
  QuizLeadInput,
  QuizLeadResultDto,
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

export function fetchMyRecordings() {
  return apiFetch<LibraryItemDto[]>("/lessons/my-recordings");
}

export function fetchLessonMaterials(lessonId: string) {
  return apiFetch<LessonMaterialDto[]>(`/lessons/${lessonId}/materials`);
}

export async function uploadLessonMaterial(
  lessonId: string,
  formData: FormData,
): Promise<LessonMaterialDto> {
  const cookie = await getCookieHeader();
  const res = await fetch(`${API_URL}/teacher/lessons/${lessonId}/materials`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `api error ${res.status}`);
  }
  return (await res.json()) as LessonMaterialDto;
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

export function submitQuizLead(body: QuizLeadInput) {
  return apiFetch<QuizLeadResultDto>("/onboarding/quiz/lead", {
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
  attendanceStatus: AttendanceStatus;
  postLessonNote: string | null;
  recommendation: string | null;
  homeworkStatus: HomeworkStatus;
  homeworkMarkedAt: string | null;
  jlptLevel: string | null;
  quizLevel: string | null;
};

export type AttendanceStatus =
  | "scheduled"
  | "attended"
  | "no_show"
  | "cancelled_by_student"
  | "cancelled_by_teacher";

export type TeacherLeadDto = {
  id: string;
  userId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  trialLessonId: string | null;
  kind: string;
  status: string;
  name: string;
  email: string | null;
  contact: string | null;
  level: string | null;
  goal: string | null;
  notes: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeacherStudentDto = {
  studentId: string;
  nickname: string | null;
  email: string;
  avatarUrl: string | null;
  jlptLevel: string | null;
  quizLevel: string | null;
  lessonCount: number;
  attendedCount: number;
  lastLessonAt: string | null;
  activeUntil: string | null;
  lessonCredits: number;
  isActive: boolean;
};

export type TeacherStudentProfileDto = {
  student: {
    id: string;
    nickname: string | null;
    email: string;
    avatarUrl: string | null;
    jlptLevel: string | null;
    quizLevel: string | null;
    telegramId: number | null;
    assignedPlanId: string | null;
    createdAt: string;
  };
  access: PaymentAccessDto;
  assignedPlan: PaymentPlanDto | null;
  payments: PaymentDto[];
  progress: { attended: number; noShow: number; total: number };
  lessons: Array<{
    lessonId: string;
    title: string;
    startsAt: string;
    status: string;
    attendanceStatus: AttendanceStatus;
    postLessonNote: string | null;
    recommendation: string | null;
    homeworkStatus: HomeworkStatus;
    homeworkMarkedAt: string | null;
  }>;
  leads: Array<{
    id: string;
    status: string;
    kind: string;
    name: string;
    email: string;
    contact: string | null;
    level: string | null;
    goal: string | null;
    notes: string | null;
    createdAt: string;
  }>;
};

export function fetchTeacherStudents(): Promise<TeacherStudentDto[]> {
  return apiFetch("/teacher/students");
}

export function fetchTeacherStudentProfile(studentId: string): Promise<TeacherStudentProfileDto> {
  return apiFetch(`/teacher/students/${studentId}`);
}

export function createStudent(body: {
  email: string;
  name: string;
  nickname?: string;
  planId: string;
}) {
  return apiFetch<{ ok: boolean; userId: string }>("/teacher/students", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function setStudentPlan(studentId: string, planId: string) {
  return apiFetch<{ studentId: string; assignedPlanId: string }>(
    `/teacher/students/${studentId}/plan`,
    { method: "PATCH", body: JSON.stringify({ planId }) },
  );
}

export function fetchLessonStudents(lessonId: string): Promise<LessonStudentDto[]> {
  return apiFetch(`/teacher/lessons/${lessonId}/students`);
}

export function setHomeworkStatus(lessonId: string, studentId: string, status: HomeworkStatus) {
  return apiFetch<{ studentId: string; status: HomeworkStatus; markedAt: string | null }>(
    `/teacher/lessons/${lessonId}/homework/${studentId}`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export function fetchMySubmissions(lessonId: string) {
  return apiFetch<HomeworkSubmissionDto[]>(`/homework/lessons/${lessonId}`);
}

export function submitHomework(lessonId: string, content: string) {
  return apiFetch<HomeworkSubmissionDto>(`/homework/lessons/${lessonId}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function fetchLessonSubmissions(lessonId: string) {
  return apiFetch<TeacherSubmissionDto[]>(`/teacher/lessons/${lessonId}/submissions`);
}

export function reviewSubmission(submissionId: string, body: ReviewSubmissionInput) {
  return apiFetch<HomeworkSubmissionDto>(`/teacher/submissions/${submissionId}/review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function setStudentLevel(lessonId: string, studentId: string, jlptLevel: JlptLevel) {
  return apiFetch<{ studentId: string; jlptLevel: string | null }>(
    `/teacher/lessons/${lessonId}/students/${studentId}/level`,
    { method: "PATCH", body: JSON.stringify({ jlptLevel }) },
  );
}

export function updatePostLesson(
  lessonId: string,
  studentId: string,
  body: {
    attendanceStatus?: AttendanceStatus;
    postLessonNote?: string | null;
    recommendation?: string | null;
  },
) {
  return apiFetch<{
    studentId: string;
    attendanceStatus: AttendanceStatus;
    postLessonNote: string | null;
    recommendation: string | null;
  }>(`/teacher/lessons/${lessonId}/students/${studentId}/post-lesson`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function fetchTeacherLeads(status?: string): Promise<TeacherLeadDto[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch(`/teacher/leads${q}`);
}

export function updateTeacherLead(
  leadId: string,
  body: {
    status?: string;
    assigneeId?: string | null;
    notes?: string | null;
    nextFollowUpAt?: string | null;
  },
) {
  return apiFetch<{ ok: boolean }>(`/teacher/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createTrialLessonForLead(
  leadId: string,
  body: { title: string; startsAt: string; endsAt: string },
) {
  return apiFetch<LessonDto>(`/teacher/leads/${leadId}/trial-lesson`, {
    method: "POST",
    body: JSON.stringify(body),
  });
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

export function fetchPaymentPlans() {
  return apiFetch<PaymentPlanDto[]>("/payments/plans", { withAuth: false });
}

export function fetchMyPayments() {
  return apiFetch<PaymentsMeDto>("/payments/me");
}

export function createCheckout(planId: string) {
  return apiFetch<CheckoutResponseDto>("/payments/checkout", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
}
