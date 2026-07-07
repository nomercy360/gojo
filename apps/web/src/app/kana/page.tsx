import { KanaGame } from "@/components/kana-game";
import { getCurrentUser } from "@/lib/session";

export const metadata = {
  title: "Хирагана и Катакана · Gojo",
  description: "Тренажёр японских символов",
};

export default async function KanaPage() {
  const user = await getCurrentUser();
  return <KanaGame isLoggedIn={!!user} />;
}
