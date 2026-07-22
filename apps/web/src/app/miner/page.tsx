import { MinerClient } from "./miner-client";

export const metadata = {
  title: "Личный словарь-майнер: слова запоминаются сами · Gojo",
  description:
    "Бесплатный гайд: Anki + Yomitan + asbplayer. Настройка за 30 минут — и любое видео или статья на японском превращается в карточки с контекстом, аудио и переводом.",
};

// Public lead magnet for learners who already consume Japanese content — the
// segment the kana trainer and the level quiz both hand off but never serve.
export default function MinerPage() {
  return <MinerClient />;
}
