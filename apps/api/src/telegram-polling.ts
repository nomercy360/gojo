import { env } from "./env.ts";
import { type TelegramUpdate, processTelegramUpdate } from "./routes/telegram.ts";

const LONG_POLL_TIMEOUT_SECONDS = 50;
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 30_000;

const PRIVATE_CHAT_COMMANDS = [
  { command: "start", description: "Открыть меню" },
  { command: "lessons", description: "Посмотреть свои уроки" },
  { command: "login", description: "Войти на сайт" },
  { command: "help", description: "Помощь" },
];

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
};

type ConsumeResult = {
  nextOffset: number | undefined;
  error?: unknown;
};

/**
 * Process updates in order and stop at the first failure. Successfully handled
 * updates advance the offset; the failed update remains queued for the retry.
 */
export async function consumeTelegramUpdates(
  updates: TelegramUpdate[],
  currentOffset: number | undefined,
  handleUpdate: (update: TelegramUpdate) => Promise<void>,
): Promise<ConsumeResult> {
  let nextOffset = currentOffset;

  for (const update of updates) {
    try {
      await handleUpdate(update);
      nextOffset = Math.max(nextOffset ?? 0, update.update_id + 1);
    } catch (error) {
      return { nextOffset, error };
    }
  }

  return { nextOffset };
}

export function startTelegramPolling(): void {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("telegram polling disabled: TELEGRAM_BOT_TOKEN is unset");
    return;
  }

  void runTelegramPolling(token);
}

async function runTelegramPolling(token: string): Promise<never> {
  let nextOffset: number | undefined;
  let retryDelay = RETRY_MIN_MS;
  let initialized = false;

  for (;;) {
    try {
      if (!initialized) {
        // getUpdates and webhooks are mutually exclusive. Keep any updates
        // Telegram already queued during deployment and consume them below.
        await telegramApi<boolean>(token, "deleteWebhook", { drop_pending_updates: false });
        initialized = true;
        console.log("telegram long polling started");

        try {
          await telegramApi<boolean>(token, "setMyCommands", {
            commands: PRIVATE_CHAT_COMMANDS,
            scope: { type: "all_private_chats" },
          });
        } catch (error) {
          console.error("telegram command menu update failed:", errorMessage(error));
        }
      }

      const updates = await telegramApi<TelegramUpdate[]>(token, "getUpdates", {
        offset: nextOffset,
        limit: 100,
        timeout: LONG_POLL_TIMEOUT_SECONDS,
        allowed_updates: ["message"],
      });

      const consumed = await consumeTelegramUpdates(updates, nextOffset, processTelegramUpdate);
      nextOffset = consumed.nextOffset;
      if (consumed.error) throw consumed.error;

      retryDelay = RETRY_MIN_MS;
    } catch (error) {
      console.error(`telegram polling failed; retrying in ${retryDelay}ms: ${errorMessage(error)}`);
      await Bun.sleep(retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    }
  }
}

async function telegramApi<T>(token: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(
      `Telegram ${method} failed (${payload.error_code ?? response.status}): ${payload.description ?? response.statusText}`,
    );
  }

  return payload.result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
