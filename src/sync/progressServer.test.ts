import { beforeEach, describe, expect, it, vi } from "vitest";
import { save, forDevice } from "../../convex/progress";
import type { MutationCtx, QueryCtx } from "../../convex/_generated/server";
import type { Id } from "../../convex/_generated/dataModel";

vi.mock("../../convex/auth", () => ({ checkDevice: vi.fn(async () => ({ _id: "p1" })) }));

const snapshot = {
  coins: 99, lastBonusDay: null, pets: [], activeId: null, savedAt: 100, level: 7,
  asleepSince: 90, session: JSON.stringify({ won: true }), lostFrom: null, onboarded: true,
};
const credentials = { profileId: "p1" as Id<"profiles">, deviceToken: "secret" };
// Convex keeps this runtime entry point private in its public type surface.
// Exercise the real handlers with a database double, without a deployment.
const read = (forDevice as unknown as {
  _handler: (ctx: QueryCtx, args: typeof credentials) => Promise<unknown>;
})._handler;
const write = (save as unknown as {
  _handler: (ctx: MutationCtx, args: typeof credentials & { progress: typeof snapshot; baseRevision?: number | null }) => Promise<unknown>;
})._handler;
const unique = vi.fn();
const insert = vi.fn();
const patch = vi.fn();
const context = { db: { query: () => ({ withIndex: () => ({ unique }) }), insert, patch } };

describe("progress server snapshots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all portable state, excluding database metadata", async () => {
    unique.mockResolvedValue({ ...snapshot, _id: "s1", _creationTime: 1, profileId: "p1", updatedAt: 101 });
    const result = await read(context as unknown as QueryCtx, credentials);
    expect(result).toEqual({ status: "ok", progress: snapshot, revision: 0 });
  });

  it("does not replace progress with an equal or older snapshot", async () => {
    unique.mockResolvedValue({ ...snapshot, _id: "s1" });
    for (const savedAt of [99, 100]) {
      expect(await write(context as unknown as MutationCtx, {
        ...credentials, progress: { ...snapshot, coins: 0, savedAt },
      })).toEqual({ status: "ok", applied: false });
    }
    expect(patch).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("keeps explicit level resets and all new save fields in the newer snapshot", async () => {
    unique.mockResolvedValue({ ...snapshot, _id: "s1" });
    await write(context as unknown as MutationCtx, {
      ...credentials, progress: { ...snapshot, level: 1, savedAt: 101 },
    });
    expect(patch).toHaveBeenCalledWith("s1", expect.objectContaining({
      ...snapshot, level: 1, savedAt: 101,
    }));
  });

  it("accepts a matching server revision even when the device clock is behind", async () => {
    unique.mockResolvedValue({ ...snapshot, _id: "s1", revision: 7 });
    expect(await write(context as unknown as MutationCtx, {
      ...credentials, progress: { ...snapshot, savedAt: 1 }, baseRevision: 7,
    })).toMatchObject({ status: "ok", revision: 8 });
    expect(patch).toHaveBeenCalledWith("s1", expect.objectContaining({ savedAt: 1, revision: 8 }));
  });

  it("returns the competing save instead of accepting an obsolete base revision", async () => {
    unique.mockResolvedValue({ ...snapshot, _id: "s1", revision: 7 });
    expect(await write(context as unknown as MutationCtx, {
      ...credentials, progress: { ...snapshot, savedAt: 9_999_999 }, baseRevision: 6,
    })).toMatchObject({ status: "conflict", revision: 7, progress: snapshot });
    expect(patch).not.toHaveBeenCalled();
  });

  it("prevents an old app from erasing modern snapshot fields", async () => {
    unique.mockResolvedValue({ ...snapshot, _id: "s1", revision: 7 });
    expect(await write(context as unknown as MutationCtx, {
      ...credentials, progress: { ...snapshot, savedAt: 9_999_999 },
    })).toEqual({ status: "upgrade_required" });
    expect(patch).not.toHaveBeenCalled();
  });

  it("keeps legacy clients working until a revision-checked client adopts the row", async () => {
    unique.mockResolvedValue({ ...snapshot, _id: "s1" });
    expect(await write(context as unknown as MutationCtx, {
      ...credentials, progress: { ...snapshot, savedAt: 101 },
    })).toMatchObject({ status: "ok", revision: 0 });
    expect(patch.mock.calls[0]?.[1]).not.toHaveProperty("revision");
  });
});
