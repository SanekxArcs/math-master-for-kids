import { describe, expect, it } from "vitest";
import { NEW_STABLE, dailyStreakStatus, dayKey, payReward, sessionReward, type Stable } from "./pet";
const day = (offset: number) => new Date(2026, 9, 22 + offset, 12).getTime();
const win = { won: true, goalEnabled: true, goal: 200, points: 200, level: 4 };
describe("daily winning streak", () => {
  it("pays 5 through 35, then keeps 35 on every consecutive day regardless of level", () => {
    let stable: Stable = NEW_STABLE;
    for (let n = 0; n < 12; n++) {
      const reward = sessionReward(stable, { ...win, level: n % 3 + 1 }, day(n))!;
      expect(reward.bonus).toBe(Math.min(n + 1, 7) * 5);
      stable = payReward(stable, reward, day(n));
      expect(stable.dailyStreak).toBe(Math.min(n + 1, 7));
      expect(sessionReward(stable, win, day(n) + 3600000)!.bonus).toBe(0);
    }
  });
  it("resets after a missed calendar day, including a previously capped streak", () => {
    const stable = { ...NEW_STABLE, lastBonusDay: dayKey(day(0)), dailyStreak: 7 };
    const reward = sessionReward(stable, win, day(2))!;
    expect(dailyStreakStatus(stable, day(2)).days).toBe(0);
    expect(reward.bonus).toBe(5);
    expect(payReward(stable, reward, day(2)).dailyStreak).toBe(1);
  });
  it("does not award visits, unfinished levels, or a second bonus through a stale reward", () => {
    const stable = { ...NEW_STABLE, lastBonusDay: dayKey(day(0)), dailyStreak: 2 };
    expect(dailyStreakStatus(stable, day(1))).toMatchObject({ days: 2, bonus: 15, claimed: false });
    expect(sessionReward(stable, { ...win, won: false }, day(1))).toBeNull();
    const reward = sessionReward(stable, win, day(1))!;
    const paid = payReward(stable, reward, day(1));
    expect(payReward(paid, reward, day(1)).coins).toBe(paid.coins + reward.coins);
    expect(paid.dailyStreak).toBe(3);
  });
  it("continues old saves from their last paid day and ignores a backwards clock", () => {
    const legacy: Stable = { ...NEW_STABLE, lastBonusDay: dayKey(day(0)) };
    delete legacy.dailyStreak;
    expect(sessionReward(legacy, win, day(1))!.bonus).toBe(10);
    expect(sessionReward(legacy, win, day(-1))!.bonus).toBe(0);
  });
  it("uses calendar midnight and survives the autumn daylight-saving boundary", () => {
    const before = new Date(2026, 9, 24, 23, 55).getTime();
    const midnight = new Date(2026, 9, 25, 0, 5).getTime();
    let stable = payReward(NEW_STABLE, sessionReward(NEW_STABLE, win, before)!, before);
    expect(sessionReward(stable, win, midnight)!.bonus).toBe(10);
    stable = payReward(stable, sessionReward(stable, win, midnight)!, midnight);
    expect(sessionReward(stable, win, new Date(2026, 9, 26, 0, 5).getTime())!.bonus).toBe(15);
  });
  it("keeps the daily bonus independent of prestige and supports rewarded goal-free rounds", () => {
    const stable = { ...NEW_STABLE, lastBonusDay: dayKey(day(0)), dailyStreak: 6, prestigeLevels: 100 };
    expect(sessionReward(stable, win, day(1))!.bonus).toBe(35);
    expect(sessionReward(stable, { ...win, won: false, goalEnabled: false }, day(1))!.bonus).toBe(35);
    expect(sessionReward(stable, { ...win, won: false, goalEnabled: false, points: 0 }, day(1))).toBeNull();
  });
});
