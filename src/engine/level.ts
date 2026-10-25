import type { GameSettings } from "./types.ts";
import { penaltyFor, type ScoreState } from "./scoring.ts";

/** Each level asks for half again as many points as the one before. */
const GROWTH = 1.5;

/** The highest goal the dashboard can set, and so the highest a level can ask. */
export const MAX_GOAL = 10000;
export const MAX_LEVEL = 20;

/** Only completed levels count, so restarting an unplayed level cannot farm prestige. */
export function completedLevels(level: number, won: boolean): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(MAX_LEVEL, Math.floor(level) - (won ? 0 : 1)));
}

/**
 * The goal a level plays to, rounded to a whole ten so the target on screen is
 * a number a child can read back — 450, not 449.9999999.
 */
export function goalForLevel(baseGoal: number, level: number): number {
  const steps = Math.max(0, Math.floor(level) - 1);
  // Level 1 is the parent's number exactly as they typed it. Rounding it would
  // quietly move a target a grown-up chose, and would make a small goal look
  // like it had no level above it.
  if (steps === 0) return Math.min(MAX_GOAL, baseGoal);
  const raw = baseGoal * GROWTH ** steps;
  return Math.min(MAX_GOAL, Math.round(raw / 10) * 10);
}

/**
 * The child's own progression, laid over whatever the parent configured.
 *
 * Levels only ever ask for *more* than the parent's setting, never less, and
 * they touch nothing else: the questions, the tiles and the time limit stay
 * exactly as the grown-up set them. Identity-stable at level 1, because the
 * game treats a new settings object as a settings change and starts a fresh
 * round when it sees one.
 */
export function settingsForLevel(settings: GameSettings, level: number): GameSettings {
  if (level <= 1 || !settings.goalEnabled) return settings;
  return { ...settings, goalTarget: goalForLevel(settings.goalTarget, level) };
}

/**
 * Targets retain their tablet-friendly ceiling, while later levels still
 * increase the coin reward. Every run contains exactly twenty levels.
 */
export function hasNextLevel(settings: GameSettings, level: number): boolean {
  if (!settings.goalEnabled) return false;
  return level < MAX_LEVEL;
}

/** How far below zero a level can fall, as a share of its goal, before it is lost. */
export const LOSS_SHARE = 0.25;

/**
 * The points below zero that end the game: a quarter of the goal being
 * played to, so a bigger level can absorb a proportionally bigger bad run.
 */
export function lossLimit(goal: number): number {
  // Never so small that a single first mistake loses the game: on a goal of
  // 40 or less a quarter is no more than the first penalty itself.
  return Math.max(penaltyFor(1) + 1, Math.ceil(goal * LOSS_SHARE));
}

/**
 * Lost: the true total has sunk to minus a quarter of the goal. The level is
 * then gone too — the child starts again from level 1. Only a game with a
 * goal can be lost; with the goal switched off there is no level to lose.
 */
export function isGameLost(score: ScoreState, settings: GameSettings): boolean {
  return settings.goalEnabled && score.rawPoints <= -lossLimit(settings.goalTarget);
}
