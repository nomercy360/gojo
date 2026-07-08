type RoleLike = { role?: string | null };

export function isTeacherUser(user: RoleLike | null | undefined): boolean {
  return user?.role === "admin";
}

export function homePathForUser(user: RoleLike): string {
  return isTeacherUser(user) ? "/teacher" : "/dashboard";
}
