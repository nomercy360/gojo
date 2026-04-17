import { getCurrentUser } from "@/lib/session";
import { HeaderClient } from "./header-client";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return <HeaderClient user={user} />;
}
