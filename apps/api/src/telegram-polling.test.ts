import { describe, expect, test } from "bun:test";
import type { TelegramUpdate } from "./routes/telegram.ts";
import { consumeTelegramUpdates } from "./telegram-polling.ts";

const update = (update_id: number): TelegramUpdate => ({ update_id });

describe("consumeTelegramUpdates", () => {
  test("processes updates in order and advances the offset", async () => {
    const handled: number[] = [];

    const result = await consumeTelegramUpdates(
      [update(10), update(11)],
      undefined,
      async (item) => {
        handled.push(item.update_id);
      },
    );

    expect(handled).toEqual([10, 11]);
    expect(result).toEqual({ nextOffset: 12 });
  });

  test("leaves a failed update queued while preserving prior progress", async () => {
    const handled: number[] = [];
    const failure = new Error("temporary failure");

    const result = await consumeTelegramUpdates(
      [update(20), update(21), update(22)],
      undefined,
      async (item) => {
        handled.push(item.update_id);
        if (item.update_id === 21) throw failure;
      },
    );

    expect(handled).toEqual([20, 21]);
    expect(result).toEqual({ nextOffset: 21, error: failure });
  });
});
