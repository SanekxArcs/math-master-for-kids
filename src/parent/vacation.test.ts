import { it, expect, vi } from "vitest";
import { vacation } from "../../convex/parent";
import { newPet, tick } from "@/engine";
import type { MutationCtx } from "../../convex/_generated/server";
vi.mock("../../convex/auth", () => ({ requireParent: vi.fn(async () => ({ _id: "profile" })) }));
const change = (vacation as unknown as { _handler: (ctx: MutationCtx, args: { token: string; on: boolean }) => Promise<void> })._handler;
it("freezes all pets and resumes without decay for the holiday, preserving other progress", async () => {
  const start = Date.now();
  const row = { _id: "progress", pets: [newPet("horse", "Bella", start), newPet("cat", "Kitty", start)], revision: 4, savedAt: start,
    coins: 100, inventory: { hay: 30 }, level: 7 };
  const patch = vi.fn(async (_id: unknown, fields: unknown) => Object.assign(row, fields));
  const ctx = { db: { query: () => ({ withIndex: () => ({ unique: async () => row }) }), patch } } as unknown as MutationCtx;
  const clock = vi.spyOn(Date, "now").mockReturnValue(start);
  try {
    await change(ctx, { token: "parent-token", on: true });
    expect(row.pets.every(p => p.vacation)).toBe(true);
    expect(row.revision).toBe(5);
    clock.mockReturnValue(start + 14 * 86400000);
    await change(ctx, { token: "parent-token", on: false });
    expect(row.pets.every(p => p.alive && !p.vacation && p.food === 80)).toBe(true);
    expect(row.revision).toBe(6);
    expect(row.coins).toBe(100);
    expect(row.inventory).toEqual({ hay: 30 });
    expect(row.level).toBe(7);
    expect(tick(row.pets[0]!, Date.now() + 86400000).food).toBeCloseTo(30);
    expect(patch.mock.calls[0]![1]).not.toHaveProperty("coins");
  } finally { clock.mockRestore(); }
});
