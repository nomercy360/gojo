import { redirect } from "next/navigation";
import { fetchQuizQuestions } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { QuizClient } from "./quiz-client";

export default async function OnboardingQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { retake } = await searchParams;
  if (user.jlptLevel && retake !== "1") redirect("/lessons");

  const questions = await fetchQuizQuestions();
  return <QuizClient questions={questions} />;
}
