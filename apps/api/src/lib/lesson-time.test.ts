import { describe, expect, test } from "bun:test";
import { formatLessonNotificationTime } from "./lesson-time.ts";

describe("formatLessonNotificationTime", () => {
  test("uses Moscow when no browser zone is known", () => {
    expect(formatLessonNotificationTime(new Date("2026-07-18T10:00:00.000Z"))).toBe(
      "18 июля, 13:00 (по московскому времени)",
    );
  });

  test("converts an instant to the stored browser zone", () => {
    expect(formatLessonNotificationTime(new Date("2026-07-18T10:00:00.000Z"), "Asia/Tokyo")).toBe(
      "18 июля, 19:00 (по вашему времени, Токио)",
    );
  });

  test("falls back safely when a stored zone is invalid", () => {
    expect(formatLessonNotificationTime(new Date("2026-07-18T10:00:00.000Z"), "not/a-zone")).toBe(
      "18 июля, 13:00 (по московскому времени)",
    );
  });

  test("lets the IANA database apply daylight-saving changes at runtime", () => {
    expect(
      formatLessonNotificationTime(new Date("2026-01-18T12:00:00.000Z"), "Europe/Berlin"),
    ).toContain("13:00");
    expect(
      formatLessonNotificationTime(new Date("2026-07-18T12:00:00.000Z"), "Europe/Berlin"),
    ).toContain("14:00");
  });
});
