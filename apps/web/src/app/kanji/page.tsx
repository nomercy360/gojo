import { KanjiGame } from "@/components/kanji-game";
import { getCurrentUser } from "@/lib/session";

export const metadata = {
  title: "Кандзи · Gojo",
  description: "Тренажёр японских иероглифов",
};

export default async function KanjiPage() {
  const user = await getCurrentUser();
  return <KanjiGame isLoggedIn={!!user} />;
}
