/**
 * Human label for a persisted quiz placement. "start" is the sub-N5 floor —
 * nothing demonstrated on the quiz — and must not render as raw Latin in the
 * Russian UI.
 */
export function quizLevelLabel(level: string): string {
  return level === "start" ? "с нуля" : level;
}
