import {
  type AdminDirectoryEntry,
  ApiError,
  type StudentDirectoryEntry,
  type TeacherLeadDto,
  type TeacherLessonDto,
  type TeacherStudentDto,
  fetchAdminDirectory,
  fetchPaymentPlans,
  fetchStudentDirectory,
  fetchTeacherLeads,
  fetchTeacherLessons,
  fetchTeacherStudents,
} from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import type { PaymentPlanDto } from "@gojo/shared";
import { redirect } from "next/navigation";
import { AdminWorkspace, type DashboardStudent } from "./admin-workspace";

export const dynamic = "force-dynamic";

export default async function TeacherPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; panel?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  const [lessonsResult, directoryResult, statsResult, plansResult, leadsResult, adminsResult] =
    await Promise.allSettled([
      fetchTeacherLessons(),
      fetchStudentDirectory(),
      fetchTeacherStudents(),
      fetchPaymentPlans(),
      fetchTeacherLeads(),
      fetchAdminDirectory(),
    ]);

  const lessons: TeacherLessonDto[] = valueOr(lessonsResult, []);
  const directory: StudentDirectoryEntry[] = valueOr(directoryResult, []);
  const stats: TeacherStudentDto[] = valueOr(statsResult, []);
  const plans: PaymentPlanDto[] = valueOr(plansResult, []);
  const leads: TeacherLeadDto[] = valueOr(leadsResult, []);
  const admins: AdminDirectoryEntry[] = valueOr(adminsResult, []);
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
      activeUntil: student?.activeUntil ?? null,
      lessonCredits: student?.lessonCredits ?? 0,
      isActive: student?.isActive ?? false,
    };
  });

  const params = await searchParams;
  const initialCollection =
    params.collection === "lessons"
      ? "lessons"
      : params.collection === "leads"
        ? "leads"
        : params.collection === "admins"
          ? "admins"
          : "students";
  const initialPanel =
    params.panel === "new-student" || params.panel === "new-lesson" ? params.panel : undefined;

  return (
    <AdminWorkspace
      students={students}
      lessons={lessons}
      leads={leads}
      admins={admins}
      directory={directory}
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
