import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { CreateStudentForm } from "./create-form";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/teacher");

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Admin
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">Провизион аккаунта</h1>
        <div className="mt-6">
          <CreateStudentForm />
        </div>
      </div>
    </main>
  );
}
