const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "gojolearn_bot";

export const TELEGRAM_BOT_URL = `https://t.me/${BOT_USERNAME}`;

export function telegramBotStartUrl(source: string) {
  return `${TELEGRAM_BOT_URL}?start=${encodeURIComponent(source)}`;
}
