import { fetchQuizQuestions } from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { QuizClient } from "./quiz-client";

// Public lead-magnet: works for guests and logged-in students alike, and can
// be revisited/retaken any time — it's a suggestion, not a signup gate.
export default async function OnboardingQuizPage() {
  const user = await getCurrentUser();
  if (isTeacherUser(user)) redirect("/teacher");

  const questions = await fetchQuizQuestions();
  return <QuizClient questions={questions} isLoggedIn={!!user} />;
}
