import { redirect } from "next/navigation";

export default function NewStudentPage() {
  redirect("/teacher?collection=leads");
}
