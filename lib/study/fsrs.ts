import { FsrsState } from '../db/types';

/**
 * Modern Spaced Repetition Scheduling Engine (FSRS-inspired SM-2 / DSR Model)
 * State: 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
 * Ratings:
 *  1: Again (Forgot, reset interval)
 *  2: Hard (Recalled with difficulty, slight progression)
 *  3: Good (Recalled successfully, normal progression)
 *  4: Easy (Effortless recall, accelerated progression)
 */

export function createInitialFsrsState(): FsrsState {
  const now = Date.now();
  return {
    state: 0, // New
    due: now, // Due immediately
    stability: 0.5,
    difficulty: 5.0, // Scale 1 - 10
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    last_review: 0,
  };
}

export interface ReviewResult {
  nextState: FsrsState;
  intervalMinutes: number;
  intervalLabel: string;
}

export function previewNextIntervals(currentState: FsrsState, desiredRetention: number = 0.90): Record<1 | 2 | 3 | 4, string> {
  return {
    1: calculateNextState(currentState, 1, desiredRetention).intervalLabel,
    2: calculateNextState(currentState, 2, desiredRetention).intervalLabel,
    3: calculateNextState(currentState, 3, desiredRetention).intervalLabel,
    4: calculateNextState(currentState, 4, desiredRetention).intervalLabel,
  };
}

export function calculateNextState(
  currentState: FsrsState,
  rating: 1 | 2 | 3 | 4,
  desiredRetention: number = 0.90
): ReviewResult {
  const now = Date.now();
  let stability = currentState.stability;
  let difficulty = currentState.difficulty;
  let reps = currentState.reps + 1;
  let lapses = currentState.lapses;
  let nextStateNum = currentState.state;

  // Retention scaling factor: I = S * ln(R) / ln(0.90)
  const safeR = Math.min(0.97, Math.max(0.75, desiredRetention));
  const retentionFactor = Math.min(2.5, Math.max(0.4, Math.log(safeR) / Math.log(0.90)));

  // Adjust difficulty based on rating
  // Rating 1 decreases stability & increases difficulty
  // Rating 4 decreases difficulty & boosts stability
  if (rating === 1) {
    difficulty = Math.min(10, difficulty + 1.2);
    lapses += 1;
    nextStateNum = 3; // Relearning
    stability = Math.max(0.2, stability * 0.3);
  } else if (rating === 2) {
    difficulty = Math.min(10, difficulty + 0.3);
    stability = Math.max(0.5, stability * 1.15);
    nextStateNum = 2; // Review
  } else if (rating === 3) {
    difficulty = Math.max(1, difficulty - 0.2);
    stability = Math.max(1.0, stability * (1.7 + (10 - difficulty) * 0.1));
    nextStateNum = 2; // Review
  } else if (rating === 4) {
    difficulty = Math.max(1, difficulty - 0.6);
    stability = Math.max(2.0, stability * (2.4 + (10 - difficulty) * 0.15));
    nextStateNum = 2; // Review
  }

  const effectiveStability = stability * retentionFactor;

  let scheduledMinutes = 0;
  let label = '';

  if (rating === 1) {
    scheduledMinutes = 10; // 10 minutes
    label = '< 10m';
  } else if (rating === 2) {
    if (currentState.reps === 0) {
      scheduledMinutes = 60 * 12; // 12 hours
      label = '12h';
    } else {
      const days = Math.max(1, Math.round(effectiveStability * 0.8));
      scheduledMinutes = days * 24 * 60;
      label = `${days}d`;
    }
  } else if (rating === 3) {
    const days = Math.max(1, Math.round(effectiveStability));
    scheduledMinutes = days * 24 * 60;
    label = `${days}d`;
  } else {
    // Easy (rating 4)
    const days = Math.max(2, Math.round(effectiveStability * 1.35));
    scheduledMinutes = days * 24 * 60;
    label = `${days}d`;
  }

  const dueTimestamp = now + scheduledMinutes * 60 * 1000;

  const nextState: FsrsState = {
    state: nextStateNum,
    due: dueTimestamp,
    stability: Number(stability.toFixed(2)),
    difficulty: Number(difficulty.toFixed(2)),
    elapsed_days: currentState.last_review
      ? Math.max(0, Math.round((now - currentState.last_review) / (24 * 60 * 60 * 1000)))
      : 0,
    scheduled_days: Math.round(scheduledMinutes / (24 * 60)),
    reps,
    lapses,
    last_review: now,
  };

  return {
    nextState,
    intervalMinutes: scheduledMinutes,
    intervalLabel: label,
  };
}
