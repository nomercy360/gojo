import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/avatar";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b-2 border-gojo-ink bg-gojo-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-gojo-ink bg-gojo-ink font-jp-serif text-sm font-bold text-white">
            五
          </span>
          <span className="font-serif text-lg font-bold tracking-tight">
            GOJO <span className="text-gojo-ink-muted">LEARN</span>
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-bold">
          <Link
            href="/lessons"
            className="text-gojo-ink-soft hover:text-gojo-orange"
          >
            Уроки
          </Link>

          {user ? (
            <>
              {user.role === "teacher" || user.role === "admin" ? (
                <Link
                  href="/teacher"
                  className="text-gojo-orange hover:underline"
                >
                  Мои уроки
                </Link>
              ) : null}
              <Link
                href="/profile"
                className="flex items-center gap-2 text-gojo-ink-soft hover:text-gojo-ink"
              >
                <Avatar value={user.avatarUrl} size={28} fallback={user.nickname ?? user.email} />
                <span>{user.nickname ?? user.email}</span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-gojo-ink-muted hover:text-gojo-error"
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="btn-pop rounded-md border-2 border-gojo-ink bg-gojo-orange px-4 py-1.5 text-sm font-bold text-white"
            >
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
