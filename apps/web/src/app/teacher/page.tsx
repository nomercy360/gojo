import {
  type AdminDirectoryEntry,
  ApiError,
  type StudentDirectoryEntry,
  type TeacherLeadDto,
  type TeacherLessonDto,
  type TeacherStudentDto,
  type TeacherUnit,
  fetchAdminDirectory,
  fetchLevelDetail,
  fetchLevelSummaries,
  fetchPaymentPlans,
  fetchStudentDirectory,
  fetchTeacherLeads,
  fetchTeacherLessons,
  fetchTeacherStudents,
  fetchTeacherUnits,
} from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import type { LevelDetailDto, PaymentPlanDto } from "@gojo/shared";
import { redirect } from "next/navigation";
import { AdminWorkspace, type CurriculumData, type DashboardStudent } from "./admin-workspace";

export const dynamic = "force-dynamic";

export default async function TeacherPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; panel?: string; level?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isTeacherUser(user)) redirect("/dashboard");
  const params = await searchParams;

  const [
    lessonsResult,
    directoryResult,
    statsResult,
    plansResult,
    leadsResult,
    adminsResult,
    unitsResult,
  ] = await Promise.allSettled([
    fetchTeacherLessons(),
    fetchStudentDirectory(),
    fetchTeacherStudents(),
    fetchPaymentPlans(),
    fetchTeacherLeads(),
    fetchAdminDirectory(),
    fetchTeacherUnits(),
  ]);

  const lessons: TeacherLessonDto[] = valueOr(lessonsResult, []);
  const directory: StudentDirectoryEntry[] = valueOr(directoryResult, []);
  const stats: TeacherStudentDto[] = valueOr(statsResult, []);
  const plans: PaymentPlanDto[] = valueOr(plansResult, []);
  const leads: TeacherLeadDto[] = valueOr(leadsResult, []);
  const admins: AdminDirectoryEntry[] = valueOr(adminsResult, []);
  const units: TeacherUnit[] = valueOr(unitsResult, []);
  const errors = [
    lessonsResult,
    directoryResult,
    statsResult,
    plansResult,
    leadsResult,
    adminsResult,
  ]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) =>
      result.reason instanceof ApiError
        ? `API ${result.reason.status}: ${result.reason.message}`
        : "Не удалось загрузить часть данных",
    );

  const statsById = new Map(stats.map((student) => [student.studentId, student]));
  const students: DashboardStudent[] = directory.map((entry) => {
    const student = statsById.get(entry.id);
    return {
      ...entry,
      lessonCount: student?.lessonCount ?? 0,
      attendedCount: student?.attendedCount ?? 0,
      lastLessonAt: student?.lastLessonAt ?? null,
      activeUntil: student?.activeUntil ?? entry.activeUntil,
      lessonCredits: student?.lessonCredits ?? entry.lessonCredits,
      isActive: student?.isActive ?? entry.isActive,
    };
  });

  // Curriculum data is loaded only when the collection is open — level chips
  // navigate via searchParams, so each level switch is a fresh server render.
  const curriculumLevel = Math.min(30, Math.max(1, Number(params.level ?? 1) || 1));
  let curriculum: CurriculumData | null = null;
  if (params.collection === "curriculum") {
    const [summariesResult, detailResult] = await Promise.allSettled([
      fetchLevelSummaries(),
      fetchLevelDetail(curriculumLevel),
    ]);
    curriculum = {
      level: curriculumLevel,
      summaries: valueOr(summariesResult, []),
      detail: valueOr<LevelDetailDto | null>(detailResult, null),
    };
  }

  const initialCollection =
    params.collection === "students"
      ? "students"
      : params.collection === "lessons"
        ? "lessons"
        : params.collection === "leads"
          ? "leads"
          : params.collection === "admins"
            ? "admins"
            : params.collection === "curriculum"
              ? "curriculum"
              : "home";
  const initialPanel =
    params.panel === "new-student" || params.panel === "new-lesson" ? params.panel : undefined;

  return (
    <AdminWorkspace
      students={students}
      lessons={lessons}
      leads={leads}
      admins={admins}
      directory={directory}
      units={units}
      curriculum={curriculum}
      plans={plans}
      error={errors[0] ?? null}
      currentUser={{
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      }}
      initialCollection={initialCollection}
      initialPanel={initialPanel}
    />
  );
}

function valueOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}
