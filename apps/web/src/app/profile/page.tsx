import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Профиль
        </div>
        <h1 className="mt-2 font-serif text-[28px] font-bold">
          {user.nickname ?? user.email}
        </h1>
        <p className="mt-1 text-sm text-gojo-ink-muted">
          {user.email} · {user.role}
        </p>

        <div className="mt-12">
          <ProfileForm user={user} />
        </div>
      </div>
    </main>
  );
}
