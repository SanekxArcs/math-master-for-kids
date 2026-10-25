// @vitest-environment jsdom
import { expect, it } from "vitest";
import { INITIAL_SCORE, NEW_STABLE, coinMultiplier, coinsForLevel, newPet, sessionReward } from "@/engine";
import { prestigeRun } from "./prestige";
import { currentLevel, setLevel } from "./useLocalLevel";
import { parseStable, readStable, restoreStable, updateStable } from "./useStable";
import { readSession, writeSession } from "./useLocalSession";
import { toBackup } from "@/sync/useProgressSync";
import { activateProfile } from "@/sync/profileScope";

function win() {
  writeSession({ score: { ...INITIAL_SCORE, rawPoints: 10000 }, won: true, stopped: false, lost: false,
    halfHalfReadyAt: 0, question: null, usedHalfHalf: false, usedVisualHint: false, hidden: [], savedAt: Date.now() });
}

it("exchanges a completed level-20 run once, keeping the purse and pets", () => {
  const pet = newPet("horse", "Bella", Date.now());
  updateStable(() => ({ ...NEW_STABLE, coins: 1234, pets: [pet], activeId: "horse", lastBonusDay: "2026-10-25" }));
  setLevel(20); win();
  expect(prestigeRun()).toBe(true);
  expect(currentLevel()).toBe(1);
  expect(readSession()).toBeNull();
  expect(readStable()).toMatchObject({ coins: 1234, pets: [pet], lastBonusDay: "2026-10-25", prestigeLevels: 20 });
  expect(prestigeRun()).toBe(false);
  expect(readStable().prestigeLevels).toBe(20);
  expect(coinMultiplier(20)).toBeCloseTo(1.05 ** 20);
});

it("allows early prestige for completed levels and prevents level-one farming", () => {
  setLevel(1);
  localStorage.removeItem("math_master_session");
  expect(prestigeRun()).toBe(false);
  setLevel(5);
  updateStable((stable) => ({ ...stable, prestigeLevels: 20 }));
  expect(prestigeRun()).toBe(true);
  expect(readStable().prestigeLevels).toBe(24);
  expect(prestigeRun()).toBe(false);
  setLevel(3); win();
  expect(prestigeRun()).toBe(true);
  expect(readStable().prestigeLevels).toBe(27);
  expect(coinsForLevel(100, 1, 27)).toBe(Math.round(5 * 1.05 ** 27));
});

it("multiplies level and goal-free earnings but keeps the daily bonus fixed", () => {
  const stable = { ...NEW_STABLE, prestigeLevels: 20 };
  const reward = sessionReward(stable, { won: true, goalEnabled: true, goal: 100, points: 100, level: 1 }, Date.now());
  expect(reward).toEqual({ coins: 13, bonus: 5 });
  expect(sessionReward(stable, { won: false, goalEnabled: true, goal: 100, points: 40 }, Date.now())).toBeNull();
  expect(sessionReward(stable, { won: false, goalEnabled: false, goal: 100, points: 120 }, Date.now())?.coins).toBe(15);
});

it("survives reading, cloud snapshots and profile switches, defaulting old saves to 1x", () => {
  expect(parseStable(JSON.stringify({ ...NEW_STABLE, prestigeLevels: undefined })).prestigeLevels).toBe(0);
  activateProfile("prestige-a");
  updateStable((stable) => ({ ...stable, prestigeLevels: 40 }));
  const backup = toBackup(readStable(), 1);
  expect(backup.prestigeLevels).toBe(40);
  activateProfile("prestige-b");
  expect(readStable().prestigeLevels).toBe(0);
  restoreStable(backup);
  expect(readStable().prestigeLevels).toBe(40);
  activateProfile("prestige-a");
  expect(readStable().prestigeLevels).toBe(40);
  activateProfile("guest");
});
