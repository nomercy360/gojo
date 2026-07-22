const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "gojolearn_bot";

export const TELEGRAM_BOT_URL = `https://t.me/${BOT_USERNAME}`;

/** Public community channel. Its pinned post hosts the vocabulary-miner archive. */
export const TELEGRAM_COMMUNITY_URL = `https://t.me/${
  process.env.NEXT_PUBLIC_TELEGRAM_COMMUNITY ?? "gojoedu"
}`;

export function telegramBotStartUrl(source: string) {
  return `${TELEGRAM_BOT_URL}?start=${encodeURIComponent(source)}`;
}

/** Telegram has no timezone field, so carry the browser's IANA zone in the lead deep link. */
export function telegramLeadStartUrl(timeZone: string) {
  const encoded = btoa(timeZone).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return telegramBotStartUrl(`lead-${encoded}`);
}
