export type KanaScript = "hiragana" | "katakana";

export interface Kana {
  kana: string;
  romaji: string;
  type: KanaScript;
  /** Shape→sound association shown on the teach card. Russian, one short sentence. */
  mnemonic: string;
}

export const HIRAGANA: Kana[] = [
  { kana: "あ", romaji: "a", type: "hiragana", mnemonic: "Прописная «а» с антенной на макушке." },
  { kana: "い", romaji: "i", type: "hiragana", mnemonic: "Два ростка рядом — «и-и», двойняшки." },
  {
    kana: "う",
    romaji: "u",
    type: "hiragana",
    mnemonic: "Утёнок в профиль, клюв торчит вверх — «у».",
  },
  { kana: "え", romaji: "e", type: "hiragana", mnemonic: "Экзотическая птица с хохолком — «э»." },
  {
    kana: "お",
    romaji: "o",
    type: "hiragana",
    mnemonic: "Внутри прячется буква «о» — найди петлю.",
  },
  {
    kana: "か",
    romaji: "ka",
    type: "hiragana",
    mnemonic: "«Комар» по-японски — «ка». Вот он, с крылышком сбоку.",
  },
  {
    kana: "き",
    romaji: "ki",
    type: "hiragana",
    mnemonic: "Ключ (key) — «ки», бородка ключа внизу.",
  },
  { kana: "く", romaji: "ku", type: "hiragana", mnemonic: "Клюв кукушки: «ку-ку!»" },
  {
    kana: "け",
    romaji: "ke",
    type: "hiragana",
    mnemonic: "Буква «K», разъехавшаяся на две части, — «кэ».",
  },
  { kana: "こ", romaji: "ko", type: "hiragana", mnemonic: "Два коржа, верхний и нижний, — «ко»." },
  {
    kana: "さ",
    romaji: "sa",
    type: "hiragana",
    mnemonic: "Крючок с поплавком — поймали сазана: «са».",
  },
  { kana: "し", romaji: "shi", type: "hiragana", mnemonic: "Удочка с крючком — тянем щуку: «ши»." },
  { kana: "す", romaji: "su", type: "hiragana", mnemonic: "Размешали суп — воронка: «су»." },
  {
    kana: "せ",
    romaji: "se",
    type: "hiragana",
    mnemonic: "Решётка сейфа с торчащим ключом — «сэ».",
  },
  {
    kana: "そ",
    romaji: "so",
    type: "hiragana",
    mnemonic: "Зигзаг шва — иголка соединяет ткань: «со».",
  },
  {
    kana: "た",
    romaji: "ta",
    type: "hiragana",
    mnemonic: "Внутри спрятаны латинские «t» и «a» — «та».",
  },
  { kana: "ち", romaji: "chi", type: "hiragana", mnemonic: "Цифра «5» с чёлкой — «чи»." },
  { kana: "つ", romaji: "tsu", type: "hiragana", mnemonic: "Волна цунами — «цу»." },
  { kana: "て", romaji: "te", type: "hiragana", mnemonic: "Телеграфный столб — «тэ»." },
  { kana: "と", romaji: "to", type: "hiragana", mnemonic: "Палец ноги с занозой — «ой, то!»" },
  {
    kana: "な",
    romaji: "na",
    type: "hiragana",
    mnemonic: "Крест и узелок — монашка молится: «на».",
  },
  {
    kana: "に",
    romaji: "ni",
    type: "hiragana",
    mnemonic: "«Ни» по-японски — «два»: справа две чёрточки.",
  },
  { kana: "ぬ", romaji: "nu", type: "hiragana", mnemonic: "Вилка накрутила лапшу — нудлы: «ну»." },
  {
    kana: "ね",
    romaji: "ne",
    type: "hiragana",
    mnemonic: "Кошка с закрученным хвостом — «нэко» начинается с «нэ».",
  },
  {
    kana: "の",
    romaji: "no",
    type: "hiragana",
    mnemonic: "Перечёркнутый круг — знак «нельзя»: «но!»",
  },
  { kana: "は", romaji: "ha", type: "hiragana", mnemonic: "Буква «Н» с петелькой снизу — «ха»." },
  { kana: "ひ", romaji: "hi", type: "hiragana", mnemonic: "Улыбка до ушей — «хи-хи»." },
  { kana: "ふ", romaji: "fu", type: "hiragana", mnemonic: "Гора Фудзи с облачками — «Фу»дзи." },
  {
    kana: "へ",
    romaji: "he",
    type: "hiragana",
    mnemonic: "Пологая горка — «хэ». Самый простой знак.",
  },
  { kana: "ほ", romaji: "ho", type: "hiragana", mnemonic: "Это «ха» (は) с крышей сверху — «хо»." },
  { kana: "ま", romaji: "ma", type: "hiragana", mnemonic: "Мама завязала узелок — «ма»." },
  { kana: "み", romaji: "mi", type: "hiragana", mnemonic: "Клубок ниток с хвостиком — «ми»." },
  { kana: "む", romaji: "mu", type: "hiragana", mnemonic: "Корова с рожком: «му-у»." },
  {
    kana: "め",
    romaji: "me",
    type: "hiragana",
    mnemonic: "«Мэ» по-японски — «глаз»: вот он, с ресницей.",
  },
  {
    kana: "も",
    romaji: "mo",
    type: "hiragana",
    mnemonic: "Мормышка — крючок с двумя червяками: «мо».",
  },
  { kana: "や", romaji: "ya", type: "hiragana", mnemonic: "Як с рогом — «я»." },
  { kana: "ゆ", romaji: "yu", type: "hiragana", mnemonic: "Юла в развороте — «ю»." },
  { kana: "よ", romaji: "yo", type: "hiragana", mnemonic: "Йо-йо на пальце — «йо»." },
  { kana: "ら", romaji: "ra", type: "hiragana", mnemonic: "Кобра встала в стойку — «ра»." },
  { kana: "り", romaji: "ri", type: "hiragana", mnemonic: "Река двумя струями — «ри»." },
  {
    kana: "る",
    romaji: "ru",
    type: "hiragana",
    mnemonic: "Цифра «3» с петлёй на конце — руль завернул: «ру».",
  },
  {
    kana: "れ",
    romaji: "re",
    type: "hiragana",
    mnemonic: "Это «нэ» (ね), но хвост распрямился — «рэ».",
  },
  { kana: "ろ", romaji: "ro", type: "hiragana", mnemonic: "Как «ру» (る), но без петли — «ро»." },
  {
    kana: "わ",
    romaji: "wa",
    type: "hiragana",
    mnemonic: "Как «рэ» (れ), но хвост свернулся внутрь — «ва».",
  },
  {
    kana: "を",
    romaji: "wo",
    type: "hiragana",
    mnemonic: "Танцор в развороте — «во!» Живёт только как частица «о».",
  },
  {
    kana: "ん",
    romaji: "n",
    type: "hiragana",
    mnemonic: "Росчерк-«n» — единственный согласный-одиночка.",
  },
];

export const KATAKANA: Kana[] = [
  { kana: "ア", romaji: "a", type: "katakana", mnemonic: "Верхушка буквы «А» с ножкой — «а»." },
  { kana: "イ", romaji: "i", type: "katakana", mnemonic: "Ива с одной веткой — «и»." },
  { kana: "ウ", romaji: "u", type: "katakana", mnemonic: "Это «у» (う) в каске — звук тот же." },
  { kana: "エ", romaji: "e", type: "katakana", mnemonic: "Стальная балка-двутавр — «э»." },
  { kana: "オ", romaji: "o", type: "katakana", mnemonic: "Канатоходец с шестом — «о-оп!»" },
  {
    kana: "カ",
    romaji: "ka",
    type: "katakana",
    mnemonic: "Тот же комар «ка», что и か, — только без крылышка.",
  },
  {
    kana: "キ",
    romaji: "ki",
    type: "katakana",
    mnemonic: "Тот же ключ «ки» (き), но без нижней петли.",
  },
  { kana: "ク", romaji: "ku", type: "katakana", mnemonic: "Козырёк кепки — «ку»." },
  { kana: "ケ", romaji: "ke", type: "katakana", mnemonic: "Ковш экскаватора — «кэ»." },
  { kana: "コ", romaji: "ko", type: "katakana", mnemonic: "Коробка без двух стенок — «ко»." },
  { kana: "サ", romaji: "sa", type: "katakana", mnemonic: "Грядка с двумя саженцами — «са»." },
  {
    kana: "シ",
    romaji: "shi",
    type: "katakana",
    mnemonic: "Улыбка и две капли, штрихи лежат — «ши».",
  },
  { kana: "ス", romaji: "su", type: "katakana", mnemonic: "Фигурист в повороте — «су»." },
  {
    kana: "セ",
    romaji: "se",
    type: "katakana",
    mnemonic: "Почти хирагана «сэ» (せ) — только углы жёстче.",
  },
  {
    kana: "ソ",
    romaji: "so",
    type: "katakana",
    mnemonic: "Одна капля, штрих падает сверху — «со».",
  },
  {
    kana: "タ",
    romaji: "ta",
    type: "katakana",
    mnemonic: "Это «ку» (ク) с чёрточкой внутри — «та».",
  },
  { kana: "チ", romaji: "chi", type: "katakana", mnemonic: "Черпак с длинной ручкой — «чи»." },
  {
    kana: "ツ",
    romaji: "tsu",
    type: "katakana",
    mnemonic: "Две капли, штрихи стоят — «цу». Не путай с «ши» (シ).",
  },
  { kana: "テ", romaji: "te", type: "katakana", mnemonic: "Столб с двумя проводами — «тэ»." },
  { kana: "ト", romaji: "to", type: "katakana", mnemonic: "Зарубка топором на столбе — «то»." },
  { kana: "ナ", romaji: "na", type: "katakana", mnemonic: "Нож, воткнутый наискось, — «на»." },
  {
    kana: "ニ",
    romaji: "ni",
    type: "katakana",
    mnemonic: "Просто две черты: «ни» по-японски — «два».",
  },
  { kana: "ヌ", romaji: "nu", type: "katakana", mnemonic: "Раскрытые ножницы — «ну»." },
  { kana: "ネ", romaji: "ne", type: "katakana", mnemonic: "Крестик с ленточкой — «нэ»." },
  {
    kana: "ノ",
    romaji: "no",
    type: "katakana",
    mnemonic: "Одна наклонная черта — проще некуда: «но».",
  },
  { kana: "ハ", romaji: "ha", type: "katakana", mnemonic: "Две расходящиеся дужки — «ха-ха»." },
  { kana: "ヒ", romaji: "hi", type: "katakana", mnemonic: "Хоккейная клюшка — «хи»." },
  { kana: "フ", romaji: "fu", type: "katakana", mnemonic: "Флажок на ветру — «фу»." },
  {
    kana: "ヘ",
    romaji: "he",
    type: "katakana",
    mnemonic: "Та же горка «хэ», что и в хирагане, — знаки совпадают.",
  },
  { kana: "ホ", romaji: "ho", type: "katakana", mnemonic: "Снежинка-крестик — «хо-хо»." },
  {
    kana: "マ",
    romaji: "ma",
    type: "katakana",
    mnemonic: "Косынка, завязанная у подбородка, — «ма».",
  },
  {
    kana: "ミ",
    romaji: "mi",
    type: "katakana",
    mnemonic: "Три штриха: «ми» по-японски — «три».",
  },
  { kana: "ム", romaji: "mu", type: "katakana", mnemonic: "Бык наклонил рога — «му-у»." },
  { kana: "メ", romaji: "me", type: "katakana", mnemonic: "Крестик-метка — «мэ»." },
  {
    kana: "モ",
    romaji: "mo",
    type: "katakana",
    mnemonic: "Та же мормышка «мо» (も), но угловатая.",
  },
  { kana: "ヤ", romaji: "ya", type: "katakana", mnemonic: "Тот же як «я» (や), без нижней черты." },
  { kana: "ユ", romaji: "yu", type: "katakana", mnemonic: "Ковш с ручкой — «ю»." },
  { kana: "ヨ", romaji: "yo", type: "katakana", mnemonic: "Зеркальная буква «Е» — «йо»." },
  { kana: "ラ", romaji: "ra", type: "katakana", mnemonic: "Это «фу» (フ) с полкой сверху — «ра»." },
  { kana: "リ", romaji: "ri", type: "katakana", mnemonic: "Та же река «ри» (り) — две струи." },
  { kana: "ル", romaji: "ru", type: "katakana", mnemonic: "Ручей раздвоился — «ру»." },
  { kana: "レ", romaji: "re", type: "katakana", mnemonic: "Лезвие конька — «рэ»." },
  { kana: "ロ", romaji: "ro", type: "katakana", mnemonic: "Квадратный рот-коробка — «ро»." },
  {
    kana: "ワ",
    romaji: "wa",
    type: "katakana",
    mnemonic: "Крыша без антенны — «ва». Сравни с «у» (ウ).",
  },
  {
    kana: "ヲ",
    romaji: "wo",
    type: "katakana",
    mnemonic: "«Фу» (フ) с чертой — живёт только как частица «о».",
  },
  {
    kana: "ン",
    romaji: "n",
    type: "katakana",
    mnemonic: "Одна капля, штрих лежит — «н». Не путай с «со» (ソ).",
  },
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
