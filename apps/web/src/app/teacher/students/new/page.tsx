import { fetchPaymentPlans } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateStudentForm } from "./create-form";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  const plans = await fetchPaymentPlans();

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link
          href="/teacher/students"
          className="text-sm font-bold text-gojo-orange hover:underline"
        >
          ← К студентам
        </Link>
        <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Панель учителя
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Новый студент</h1>
        <div className="mt-6">
          <CreateStudentForm plans={plans} />
        </div>
      </div>
    </main>
  );
}
