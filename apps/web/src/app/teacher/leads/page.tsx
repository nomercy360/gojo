import { redirect } from "next/navigation";

// Leads now live inside the unified admin dashboard as a collection.
// Keep this route as a redirect so existing links/bookmarks still work.
export default function TeacherLeadsPage() {
  redirect("/teacher?collection=leads");
}
