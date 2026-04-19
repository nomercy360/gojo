/**
 * WaniKani-style SRS with per-card adaptive modifier.
 * Ported from spfn (src/lib/srs.ts) and adapted for Postgres Date types.
 *
 * Stages 0..7 = learning → Burned. Stage -1 = unlearned (in a deck but not yet
 * introduced). Interval in hours is `STAGES[newStage].interval * modifier`.
 */
export const STAGES = [
  { name: "Seed", interval: 4 },
  { name: "Sprout", interval: 8 },
  { name: "Sapling", interval: 24 },
  { name: "Tree", interval: 48 },
  { name: "Gate", interval: 168 },
  { name: "Temple", interval: 336 },
  { name: "Summit", interval: 720 },
  { name: "Burned", interval: 0 },
] as const;

export const UNLEARNED_STAGE = -1;
export const MAX_STAGE = STAGES.length - 1;

export interface SrsState {
  stage: number;
  modifier: number;
  streak: number;
  lapses: number;
  due: Date;
  lastReview: Date | null;
}

export function review(card: SrsState, correct: boolean): SrsState {
  const now = new Date();

  if (correct) {
    const newStage = Math.min(MAX_STAGE, card.stage + 1);
    const newStreak = card.streak + 1;
    const newMod = Math.min(1.3, card.modifier + 0.02);

    if (newStage === MAX_STAGE) {
      return {
        stage: newStage,
        modifier: newMod,
        streak: newStreak,
        lapses: card.lapses,
        due: now,
        lastReview: now,
      };
    }

    const hours = STAGES[newStage]!.interval * newMod;
    return {
      stage: newStage,
      modifier: newMod,
      streak: newStreak,
      lapses: card.lapses,
      due: new Date(now.getTime() + hours * 3600_000),
      lastReview: now,
    };
  }

  const newStage = Math.max(0, card.stage - 1);
  const newMod = Math.max(0.7, card.modifier - 0.05);
  const hours = STAGES[newStage]!.interval * newMod;
  return {
    stage: newStage,
    modifier: newMod,
    streak: 0,
    lapses: card.lapses + 1,
    due: new Date(now.getTime() + hours * 3600_000),
    lastReview: now,
  };
}

/** Promote an unlearned card (stage -1) to Seed (stage 0). */
export function promoteToSeed(): SrsState {
  const hours = STAGES[0]!.interval;
  const now = new Date();
  return {
    stage: 0,
    modifier: 1.0,
    streak: 0,
    lapses: 0,
    due: new Date(now.getTime() + hours * 3600_000),
    lastReview: now,
  };
}
