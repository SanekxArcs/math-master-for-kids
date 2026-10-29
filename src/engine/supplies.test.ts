import { describe, it, expect } from "vitest";
import { NEW_STABLE, buySupplies, useSupply, newPet, setVacation, type Stable } from "./pet";
const now = Date.UTC(2026, 9, 29);
const stable = (): Stable => ({ ...NEW_STABLE, coins: 1000, pets: [{ ...newPet("horse", "Bella", now), food: 30 }], activeId: "horse" });
describe("consumable supplies", () => {
  it("buys arbitrary affordable quantities without feeding and uses exactly one without payment", () => {
    const original = stable();
    const bought = buySupplies(original, "hay", 400);
    expect(bought.coins).toBe(200);
    expect(bought.inventory?.hay).toBe(400);
    expect(bought.pets).toBe(original.pets);
    const used = useSupply({ ...bought, coins: 0 }, "horse", "hay", now);
    expect(used.coins).toBe(0);
    expect(used.inventory?.hay).toBe(399);
    expect(used.pets[0]!.food).toBe(55);
  });
  it("stocks food and medicine even when all needs are full", () => {
    const full = { ...stable(), pets: [{ ...newPet("horse", "Bella", now), food: 100, happy: 100 }] };
    const food = buySupplies(full, "hay", 3);
    expect(food.inventory?.hay).toBe(3);
    expect(useSupply(food, "horse", "hay", now)).toBe(food);
    expect(buySupplies(full, "medicine", 5).inventory?.medicine).toBe(5);
  });
  it("rejects invalid quantities and unaffordable purchases", () => {
    const s = stable();
    for (const n of [0, -1, 1.5, NaN, Infinity, 501, Number.MAX_SAFE_INTEGER]) expect(buySupplies(s, "hay", n)).toBe(s);
    expect(buySupplies(s, "missing", 1)).toBe(s);
  });
  it("keeps supplies for wrong species, empty stock, sleep, death and vacation", () => {
    const s = buySupplies(buySupplies(stable(), "hay"), "fish");
    expect(useSupply(s, "horse", "fish", now)).toBe(s);
    expect(useSupply(s, "horse", "bath", now)).toBe(s);
    for (const blocked of [{ ...s, asleepSince: now }, setVacation(s, true, now), { ...s, pets: [{ ...s.pets[0]!, alive: false }] }]) {
      expect(useSupply(blocked, "horse", "hay", now)).toBe(blocked);
    }
  });
});
