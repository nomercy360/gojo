import { fetchMyPayments } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { HeaderClient } from "./header-client";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const studentAccessActive =
    user && !isTeacherUser(user)
      ? await fetchMyPayments()
          .then((account) => account.access.isActive)
          .catch(() => null)
      : null;

  return <HeaderClient user={user} studentAccessActive={studentAccessActive} />;
}
