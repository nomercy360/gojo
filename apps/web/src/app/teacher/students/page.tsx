import { redirect } from "next/navigation";

export default function TeacherStudentsPage() {
  redirect("/teacher?collection=students");
}
