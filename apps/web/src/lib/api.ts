import type {
  AddLessonCardInput,
  CheckoutResponseDto,
  FlashcardDto,
  HomeworkStatus,
  HomeworkSubmissionDto,
  JlptLevel,
  KanjiBreakdownEntry,
  KanjiDto,
  LessonCardDto,
  LessonDto,
  LessonMaterialDto,
  LibraryItemDto,
  PaymentAccessDto,
  PaymentDto,
  PaymentPlanDto,
  PaymentsMeDto,
  QuizQuestionDto,
  QuizResultDto,
  QuizSubmitInput,
  ReviewQueueDto,
  ReviewSubmissionInput,
  StudentStatsDto,
  SubmitReviewInput,
  TeacherSubmissionDto,
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

export function updateProfile(body: UpdateProfileInput) {
  return apiFetch<UserDto>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createTelegramLinkToken() {
  return apiFetch<{ url: string }>("/telegram/link-token", { method: "POST" });
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

export type TeacherLessonDto = LessonDto & {
  studentCount: number;
  /** Display names of invited students, comma-joined ("Аня, Макс"). */
  studentNames: string | null;
  /** Bookings still marked attendance_status = scheduled. */
  pendingAttendance: number;
  /** Attended bookings whose homework is still unmarked. */
  pendingHomework: number;
};

export function fetchTeacherLessons() {
  return apiFetch<TeacherLessonDto[]>("/teacher/lessons");
}

export function createLesson(body: {
  title: string;
  startsAt: string;
  endsAt: string;
  studentIds?: string[];
  unitId?: string | null;
  meetingUrl?: string;
}) {
  return apiFetch<LessonDto>("/teacher/lessons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type StudentDirectoryEntry = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  telegramId: number | null;
  telegramUsername: string | null;
  jlptLevel: string | null;
  quizLevel: string | null;
  currentLevel: number;
  inviteLastSentAt: string | null;
  lastLoginAt: string | null;
  assignedPlanId: string | null;
  activeUntil: string | null;
  lessonCredits: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function fetchStudentDirectory(): Promise<StudentDirectoryEntry[]> {
  return apiFetch("/teacher/student-directory");
}

export type AdminDirectoryEntry = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  telegramId: number | null;
  createdAt: string;
  updatedAt: string;
};

export function fetchAdminDirectory(): Promise<AdminDirectoryEntry[]> {
  return apiFetch("/teacher/admins");
}

export function updateAdmin(
  adminId: string,
  body: {
    name: string;
    nickname: string | null;
    email: string;
    avatarUrl: string | null;
    telegramId: number | null;
  },
) {
  return apiFetch<AdminDirectoryEntry>(`/teacher/admins/${adminId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateStudent(
  studentId: string,
  body: {
    name: string;
    nickname: string | null;
    email: string;
    avatarUrl: string | null;
    telegramId: number | null;
    telegramUsername: string | null;
    jlptLevel: string | null;
    quizLevel: string | null;
    currentLevel: number;
    assignedPlanId: string | null;
    activeUntil: string | null;
    lessonCredits: number;
  },
) {
  return apiFetch<{ ok: boolean }>(`/teacher/students/${studentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateLesson(
  lessonId: string,
  body: {
    title?: string;
    startsAt?: string;
    endsAt?: string;
    unitId?: string | null;
    meetingUrl?: string | null;
  },
) {
  return apiFetch<LessonDto>(`/teacher/lessons/${lessonId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateLessonMeetingUrl(lessonId: string, meetingUrl: string | null) {
  return updateLesson(lessonId, { meetingUrl });
}

export function cancelLesson(lessonId: string) {
  return apiFetch<{ ok: boolean }>(`/teacher/lessons/${lessonId}`, { method: "DELETE" });
}

export type HomeworkDueEntry = {
  lessonId: string;
  title: string;
  startsAt: string;
  state: "todo" | "needs_revision" | "in_review";
};

export function fetchHomeworkDue(): Promise<HomeworkDueEntry[]> {
  return apiFetch("/homework/due");
}

export function resendStudentInvite(studentId: string) {
  return apiFetch<{ ok: boolean; sentEmail: boolean; sentTelegram: boolean }>(
    `/teacher/students/${studentId}/resend-invite`,
    { method: "POST" },
  );
}

export function createAdmin(body: {
  name: string;
  nickname: string | null;
  email: string;
  telegramId: number | null;
}) {
  return apiFetch<{ ok: boolean; userId: string }>("/teacher/admins", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchLevelDetail(levelId: number) {
  return apiFetch<import("@gojo/shared").LevelDetailDto>(`/levels/${levelId}`);
}

export function fetchLevelSummaries() {
  return apiFetch<import("@gojo/shared").LevelSummaryDto[]>("/levels");
}

export type TeacherUnit = {
  id: string;
  levelId: number;
  position: number;
  title: string;
  sourceBook: string | null;
  sourceChapter: string | null;
  vocabCount: number;
  lessonCount: number;
};

export function fetchTeacherUnits(): Promise<TeacherUnit[]> {
  return apiFetch("/teacher/units");
}

export function createTeacherUnit(body: {
  levelId: number;
  title: string;
  sourceBook?: string | null;
  sourceChapter?: string | null;
}) {
  return apiFetch<{ ok: boolean; unitId: string }>("/teacher/units", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTeacherUnit(
  unitId: string,
  body: {
    title?: string;
    position?: number;
    sourceBook?: string | null;
    sourceChapter?: string | null;
  },
) {
  return apiFetch<{ ok: boolean }>(`/teacher/units/${unitId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTeacherUnit(unitId: string) {
  return apiFetch<{ ok: boolean }>(`/teacher/units/${unitId}`, { method: "DELETE" });
}

export function createLevelVocab(body: {
  levelId: number;
  word: string;
  reading: string;
  meaning: string;
  unitId?: string | null;
}) {
  return apiFetch<{ ok: boolean; vocabId: string }>("/teacher/level-vocab", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateLevelVocab(
  vocabId: string,
  body: { word?: string; reading?: string; meaning?: string; unitId?: string | null },
) {
  return apiFetch<{ ok: boolean }>(`/teacher/level-vocab/${vocabId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteLevelVocab(vocabId: string) {
  return apiFetch<{ ok: boolean }>(`/teacher/level-vocab/${vocabId}`, { method: "DELETE" });
}

export function deleteLessonMaterial(lessonId: string, materialId: string) {
  return apiFetch<{ ok: boolean }>(`/teacher/lessons/${lessonId}/materials/${materialId}`, {
    method: "DELETE",
  });
}

export function addLessonStudent(lessonId: string, studentId: string) {
  return apiFetch<{ ok: boolean; added: boolean }>(`/teacher/lessons/${lessonId}/students`, {
    method: "POST",
    body: JSON.stringify({ studentId }),
  });
}

export function removeLessonStudent(lessonId: string, studentId: string) {
  return apiFetch<{ ok: boolean }>(`/teacher/lessons/${lessonId}/students/${studentId}`, {
    method: "DELETE",
  });
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
  studentId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  trialLessonId: string | null;
  kind: string;
  status: string;
  name: string;
  telegram: string | null;
  telegramId: number | null;
  email: string | null;
  phone: string | null;
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
    telegram: string | null;
    email: string;
    phone: string | null;
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
  telegramUsername?: string;
  telegramId?: number | null;
  planId: string;
  activeUntil: string | null;
  lessonCredits: number;
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
    name?: string;
    email?: string | null;
    phone?: string | null;
    telegram?: string | null;
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

export type LeadConversionMatch = {
  id: string;
  name: string;
  email: string;
  telegramId: number | null;
  telegramUsername: string | null;
};

export type LeadConversionResult =
  | {
      ok: true;
      userId: string;
      created: boolean;
      alreadyConverted: boolean;
    }
  | { ok: false; requiresLink: true; matches: LeadConversionMatch[] };

export function convertTeacherLead(
  leadId: string,
  body: {
    name: string;
    email: string | null;
    nickname?: string;
    telegramUsername: string | null;
    telegramId: number | null;
    jlptLevel: "N5" | "N4" | "N3" | "N2";
    planId: string | null;
    existingStudentId?: string;
  },
) {
  return apiFetch<LeadConversionResult>(`/teacher/leads/${leadId}/convert`, {
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
