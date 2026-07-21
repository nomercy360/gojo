import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@gojo/shared";

// Notification labels are deliberately short. The stored value remains the
// canonical IANA identifier and Intl calculates the correct offset for the
// event date (including DST); this map is presentation only.
const RUSSIAN_CITY_BY_TIME_ZONE: Record<string, string> = {
  "Europe/Kaliningrad": "Калининград",
  "Europe/Moscow": "Москва",
  "Europe/Kirov": "Киров",
  "Europe/Volgograd": "Волгоград",
  "Europe/Astrakhan": "Астрахань",
  "Europe/Samara": "Самара",
  "Europe/Saratov": "Саратов",
  "Europe/Ulyanovsk": "Ульяновск",
  "Asia/Yekaterinburg": "Екатеринбург",
  "Asia/Omsk": "Омск",
  "Asia/Novosibirsk": "Новосибирск",
  "Asia/Barnaul": "Барнаул",
  "Asia/Tomsk": "Томск",
  "Asia/Krasnoyarsk": "Красноярск",
  "Asia/Irkutsk": "Иркутск",
  "Asia/Chita": "Чита",
  "Asia/Yakutsk": "Якутск",
  "Asia/Khandyga": "Хандыга",
  "Asia/Vladivostok": "Владивосток",
  "Asia/Ust-Nera": "Усть-Нера",
  "Asia/Magadan": "Магадан",
  "Asia/Sakhalin": "Сахалин",
  "Asia/Srednekolymsk": "Среднеколымск",
  "Asia/Kamchatka": "Камчатка",
  "Asia/Anadyr": "Анадырь",
  "Europe/Minsk": "Минск",
  "Europe/Kyiv": "Киев",
  "Europe/Chisinau": "Кишинёв",
  "Europe/Berlin": "Берлин",
  "Europe/Paris": "Париж",
  "Europe/London": "Лондон",
  "Europe/Warsaw": "Варшава",
  "Europe/Istanbul": "Стамбул",
  "Asia/Almaty": "Алматы",
  "Asia/Aqtobe": "Актобе",
  "Asia/Aqtau": "Актау",
  "Asia/Atyrau": "Атырау",
  "Asia/Qostanay": "Костанай",
  "Asia/Qyzylorda": "Кызылорда",
  "Asia/Tashkent": "Ташкент",
  "Asia/Bishkek": "Бишкек",
  "Asia/Dushanbe": "Душанбе",
  "Asia/Ashgabat": "Ашхабад",
  "Asia/Tbilisi": "Тбилиси",
  "Asia/Yerevan": "Ереван",
  "Asia/Baku": "Баку",
  "Asia/Tokyo": "Токио",
  "Asia/Seoul": "Сеул",
  "Asia/Shanghai": "Шанхай",
  "Asia/Dubai": "Дубай",
  "America/New_York": "Нью-Йорк",
  "America/Chicago": "Чикаго",
  "America/Denver": "Денвер",
  "America/Los_Angeles": "Лос-Анджелес",
  "America/Toronto": "Торонто",
  "Australia/Sydney": "Сидней",
};

function normalizedTimeZone(timeZone?: string | null): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
}

function cityLabel(timeZone: string): string {
  const curated = RUSSIAN_CITY_BY_TIME_ZONE[timeZone];
  if (curated) return curated;
  const city = timeZone.split("/").at(-1)?.replaceAll("_", " ");
  return city || timeZone;
}

function formatDateTime(startsAt: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(startsAt)
    .replace(" в ", ", ");
}

/** Format an instant in the recipient's stored IANA zone with a concise Russian label. */
export function formatLessonNotificationTime(
  startsAt: Date,
  preferredTimeZone?: string | null,
): string {
  const timeZone = normalizedTimeZone(preferredTimeZone);
  const dateTime = formatDateTime(startsAt, timeZone);
  if (timeZone === DEFAULT_TIME_ZONE) return `${dateTime} (по московскому времени)`;
  return `${dateTime} (по вашему времени, ${cityLabel(timeZone)})`;
}
