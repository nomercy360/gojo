export type KanaScript = "hiragana" | "katakana";

export interface Kana {
  kana: string;
  romaji: string;
  type: KanaScript;
}

export const HIRAGANA: Kana[] = [
  { kana: "あ", romaji: "a", type: "hiragana" },
  { kana: "い", romaji: "i", type: "hiragana" },
  { kana: "う", romaji: "u", type: "hiragana" },
  { kana: "え", romaji: "e", type: "hiragana" },
  { kana: "お", romaji: "o", type: "hiragana" },
  { kana: "か", romaji: "ka", type: "hiragana" },
  { kana: "き", romaji: "ki", type: "hiragana" },
  { kana: "く", romaji: "ku", type: "hiragana" },
  { kana: "け", romaji: "ke", type: "hiragana" },
  { kana: "こ", romaji: "ko", type: "hiragana" },
  { kana: "さ", romaji: "sa", type: "hiragana" },
  { kana: "し", romaji: "shi", type: "hiragana" },
  { kana: "す", romaji: "su", type: "hiragana" },
  { kana: "せ", romaji: "se", type: "hiragana" },
  { kana: "そ", romaji: "so", type: "hiragana" },
  { kana: "た", romaji: "ta", type: "hiragana" },
  { kana: "ち", romaji: "chi", type: "hiragana" },
  { kana: "つ", romaji: "tsu", type: "hiragana" },
  { kana: "て", romaji: "te", type: "hiragana" },
  { kana: "と", romaji: "to", type: "hiragana" },
  { kana: "な", romaji: "na", type: "hiragana" },
  { kana: "に", romaji: "ni", type: "hiragana" },
  { kana: "ぬ", romaji: "nu", type: "hiragana" },
  { kana: "ね", romaji: "ne", type: "hiragana" },
  { kana: "の", romaji: "no", type: "hiragana" },
  { kana: "は", romaji: "ha", type: "hiragana" },
  { kana: "ひ", romaji: "hi", type: "hiragana" },
  { kana: "ふ", romaji: "fu", type: "hiragana" },
  { kana: "へ", romaji: "he", type: "hiragana" },
  { kana: "ほ", romaji: "ho", type: "hiragana" },
  { kana: "ま", romaji: "ma", type: "hiragana" },
  { kana: "み", romaji: "mi", type: "hiragana" },
  { kana: "む", romaji: "mu", type: "hiragana" },
  { kana: "め", romaji: "me", type: "hiragana" },
  { kana: "も", romaji: "mo", type: "hiragana" },
  { kana: "や", romaji: "ya", type: "hiragana" },
  { kana: "ゆ", romaji: "yu", type: "hiragana" },
  { kana: "よ", romaji: "yo", type: "hiragana" },
  { kana: "ら", romaji: "ra", type: "hiragana" },
  { kana: "り", romaji: "ri", type: "hiragana" },
  { kana: "る", romaji: "ru", type: "hiragana" },
  { kana: "れ", romaji: "re", type: "hiragana" },
  { kana: "ろ", romaji: "ro", type: "hiragana" },
  { kana: "わ", romaji: "wa", type: "hiragana" },
  { kana: "を", romaji: "wo", type: "hiragana" },
  { kana: "ん", romaji: "n", type: "hiragana" },
];

export const KATAKANA: Kana[] = [
  { kana: "ア", romaji: "a", type: "katakana" },
  { kana: "イ", romaji: "i", type: "katakana" },
  { kana: "ウ", romaji: "u", type: "katakana" },
  { kana: "エ", romaji: "e", type: "katakana" },
  { kana: "オ", romaji: "o", type: "katakana" },
  { kana: "カ", romaji: "ka", type: "katakana" },
  { kana: "キ", romaji: "ki", type: "katakana" },
  { kana: "ク", romaji: "ku", type: "katakana" },
  { kana: "ケ", romaji: "ke", type: "katakana" },
  { kana: "コ", romaji: "ko", type: "katakana" },
  { kana: "サ", romaji: "sa", type: "katakana" },
  { kana: "シ", romaji: "shi", type: "katakana" },
  { kana: "ス", romaji: "su", type: "katakana" },
  { kana: "セ", romaji: "se", type: "katakana" },
  { kana: "ソ", romaji: "so", type: "katakana" },
  { kana: "タ", romaji: "ta", type: "katakana" },
  { kana: "チ", romaji: "chi", type: "katakana" },
  { kana: "ツ", romaji: "tsu", type: "katakana" },
  { kana: "テ", romaji: "te", type: "katakana" },
  { kana: "ト", romaji: "to", type: "katakana" },
  { kana: "ナ", romaji: "na", type: "katakana" },
  { kana: "ニ", romaji: "ni", type: "katakana" },
  { kana: "ヌ", romaji: "nu", type: "katakana" },
  { kana: "ネ", romaji: "ne", type: "katakana" },
  { kana: "ノ", romaji: "no", type: "katakana" },
  { kana: "ハ", romaji: "ha", type: "katakana" },
  { kana: "ヒ", romaji: "hi", type: "katakana" },
  { kana: "フ", romaji: "fu", type: "katakana" },
  { kana: "ヘ", romaji: "he", type: "katakana" },
  { kana: "ホ", romaji: "ho", type: "katakana" },
  { kana: "マ", romaji: "ma", type: "katakana" },
  { kana: "ミ", romaji: "mi", type: "katakana" },
  { kana: "ム", romaji: "mu", type: "katakana" },
  { kana: "メ", romaji: "me", type: "katakana" },
  { kana: "モ", romaji: "mo", type: "katakana" },
  { kana: "ヤ", romaji: "ya", type: "katakana" },
  { kana: "ユ", romaji: "yu", type: "katakana" },
  { kana: "ヨ", romaji: "yo", type: "katakana" },
  { kana: "ラ", romaji: "ra", type: "katakana" },
  { kana: "リ", romaji: "ri", type: "katakana" },
  { kana: "ル", romaji: "ru", type: "katakana" },
  { kana: "レ", romaji: "re", type: "katakana" },
  { kana: "ロ", romaji: "ro", type: "katakana" },
  { kana: "ワ", romaji: "wa", type: "katakana" },
  { kana: "ヲ", romaji: "wo", type: "katakana" },
  { kana: "ン", romaji: "n", type: "katakana" },
];

export const ALL_KANA = [...HIRAGANA, ...KATAKANA];

// Gojūon rows — the curriculum unit. A row is small enough to teach and
// drill in ~2 minutes, which keeps the success rate high for newcomers.
const ROW_BOUNDS: Array<[number, number]> = [
  [0, 5],
  [5, 10],
  [10, 15],
  [15, 20],
  [20, 25],
  [25, 30],
  [30, 35],
  [35, 38],
  [38, 43],
  [43, 46],
];

export const ROW_NAMES = ["А", "КА", "СА", "ТА", "НА", "ХА", "МА", "Я", "РА", "ВА"];

export function scriptKana(script: KanaScript): Kana[] {
  return script === "hiragana" ? HIRAGANA : KATAKANA;
}

export function scriptRows(script: KanaScript): Kana[][] {
  const set = scriptKana(script);
  return ROW_BOUNDS.map(([from, to]) => set.slice(from, to));
}

export interface KanaWord {
  word: string;
  romaji: string; // dot-separated by kana: "su·shi"
  meaning: string; // russian
  emoji: string;
}

// Reward words, in unlock order. A word unlocks once every character in it
// has been learned; one word is shown per finished row, so every row ends
// with an "I can actually read this" moment. Plain gojūon only — no
// dakuten/small kana, those aren't in the trainer yet.
export const HIRAGANA_WORDS: KanaWord[] = [
  { word: "あい", romaji: "a·i", meaning: "любовь", emoji: "❤️" },
  { word: "かお", romaji: "ka·o", meaning: "лицо", emoji: "🙂" },
  { word: "すし", romaji: "su·shi", meaning: "суши", emoji: "🍣" },
  { word: "たこ", romaji: "ta·ko", meaning: "осьминог", emoji: "🐙" },
  { word: "ねこ", romaji: "ne·ko", meaning: "кот", emoji: "🐱" },
  { word: "はな", romaji: "ha·na", meaning: "цветок", emoji: "🌺" },
  { word: "みみ", romaji: "mi·mi", meaning: "уши", emoji: "👂" },
  { word: "ゆき", romaji: "yu·ki", meaning: "снег", emoji: "❄️" },
  { word: "さくら", romaji: "sa·ku·ra", meaning: "сакура", emoji: "🌸" },
  { word: "にほん", romaji: "ni·ho·n", meaning: "Япония", emoji: "🇯🇵" },
];

export const KATAKANA_WORDS: KanaWord[] = [
  { word: "アイス", romaji: "a·i·su", meaning: "мороженое", emoji: "🍦" },
  { word: "ナイフ", romaji: "na·i·fu", meaning: "нож", emoji: "🔪" },
  { word: "アニメ", romaji: "a·ni·me", meaning: "аниме", emoji: "🎌" },
  { word: "トマト", romaji: "to·ma·to", meaning: "помидор", emoji: "🍅" },
  { word: "カメラ", romaji: "ka·me·ra", meaning: "камера", emoji: "📷" },
  { word: "アメリカ", romaji: "a·me·ri·ka", meaning: "Америка", emoji: "🗽" },
  { word: "ホテル", romaji: "ho·te·ru", meaning: "отель", emoji: "🏨" },
  { word: "ワイン", romaji: "wa·i·n", meaning: "вино", emoji: "🍷" },
];

export function scriptWords(script: KanaScript): KanaWord[] {
  return script === "hiragana" ? HIRAGANA_WORDS : KATAKANA_WORDS;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// De-dupes by romaji so "a" never appears twice among the choices (possible
// when the pool mixes hiragana and katakana).
export function pickDistractors(correct: Kana, pool: Kana[], count = 3): Kana[] {
  const seen = new Set([correct.romaji]);
  const out: Kana[] = [];
  for (const k of shuffle(pool)) {
    if (seen.has(k.romaji)) continue;
    seen.add(k.romaji);
    out.push(k);
    if (out.length === count) break;
  }
  return out;
}
