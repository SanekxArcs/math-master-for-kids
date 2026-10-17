import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { linkChildDevice, parentLogin } from "../../convex/secure";
import { requireParent } from "../../convex/auth";
import type { ActionCtx, QueryCtx } from "../../convex/_generated/server";

const profile = { _id: "p1", pairCode: "ABC234", name: "Ada", pinHash: "parent-only-hash", pinSalt: "salt" };
const runQuery = vi.fn(async (_ref: unknown, _args: unknown): Promise<typeof profile | null> => profile);
const runMutation = vi.fn(async (_ref: unknown, _args: unknown) => null);
const context = { runQuery, runMutation } as unknown as ActionCtx;
const link = (linkChildDevice as unknown as {
  _handler: (ctx: ActionCtx, args: { pairCode: string }) => Promise<{ profileId: string; pairCode: string; name: string; deviceToken: string }>;
})._handler;
const loginParent = (parentLogin as unknown as {
  _handler: (ctx: ActionCtx, args: { pairCode: string; pin: string }) => Promise<unknown>;
})._handler;

describe("child access stays separate from parent access", () => {
  beforeEach(() => { vi.clearAllMocks(); runQuery.mockResolvedValue(profile); });

  it("accepts only the game code and issues a device token without any parent session", async () => {
    const result = await link(context, { pairCode: " abc234 " });
    expect(runQuery.mock.calls[0]?.[1]).toEqual({ pairCode: "ABC234" });
    expect(Object.keys(result).sort()).toEqual(["deviceToken", "name", "pairCode", "profileId"]);
    expect(result.deviceToken.length).toBeGreaterThan(30);
    expect(runMutation).toHaveBeenCalledOnce();
    const [ref, args] = runMutation.mock.calls[0]!;
    expect(getFunctionName(ref as Parameters<typeof getFunctionName>[0])).toBe("profiles:addDevice");
    expect(args).toMatchObject({ profileId: "p1" });
    expect(args).not.toHaveProperty("token");
  });

  it("rejects a malformed or unknown game code without creating a device", async () => {
    await expect(link(context, { pairCode: "bad" })).rejects.toThrow("game code was not found");
    expect(runQuery).not.toHaveBeenCalled();
    runQuery.mockResolvedValueOnce(null);
    await expect(link(context, { pairCode: "ABC234" })).rejects.toThrow("game code was not found");
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("does not accept a child's device token as a parent dashboard session", async () => {
    const child = await link(context, { pairCode: "ABC234" });
    const query = vi.fn(() => ({ withIndex: () => ({ unique: async () => null }) }));
    await expect(requireParent({ db: { query } } as unknown as QueryCtx, child.deviceToken))
      .rejects.toThrow("Not signed in");
    expect(query).toHaveBeenCalledWith("parentSessions");
    expect(query).not.toHaveBeenCalledWith("devices");
  });

  it("still requires a valid private PIN for parent login", async () => {
    await expect(loginParent(context, { pairCode: "ABC234", pin: "" })).rejects.toThrow("do not match");
    expect(runMutation).not.toHaveBeenCalled();
  });
});
