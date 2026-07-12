import { homePathForUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(homePathForUser(user));

  return children;
}
