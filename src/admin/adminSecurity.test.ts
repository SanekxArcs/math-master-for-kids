import { describe, expect, it, vi } from "vitest";
import { pbkdf2Sync } from "node:crypto";
import { adminLogin, changeAdminPassword, linkChildDevice } from "../../convex/secure";
import type { ActionCtx } from "../../convex/_generated/server";
import { overview, setBlocked, setPassword, openSession } from "../../convex/admin";
import { checkDevice, requireParent } from "../../convex/auth";
import type { MutationCtx, QueryCtx } from "../../convex/_generated/server";
import type { Id } from "../../convex/_generated/dataModel";
const id = "p1" as Id<"profiles">;
const session = { _id: "s1", expiresAt: Date.now() + 100000, setupOnly: true, credentialVersion: "bootstrap", profileId: id };
const handler = <T>(fn: unknown) => (fn as { _handler: T })._handler;
const read = handler<(ctx: QueryCtx, args: { token: string }) => Promise<unknown>>(overview);
const block = handler<(ctx: MutationCtx, args: { token: string; profileId: Id<"profiles">; blocked: boolean }) => Promise<void>>(setBlocked);
function context(credentials: unknown = null, active: unknown = session) {
  const patch = vi.fn(), insert = vi.fn(), remove = vi.fn();
  const db = { get: vi.fn(async () => ({ _id: id, blocked: true })), patch, insert, delete: remove,
    query: vi.fn((table: string) => ({ first: async () => credentials,
      withIndex: () => ({ unique: async () => active }), collect: async () => table === "adminSessions" ? [session] : [] })) };
  return { db, patch, insert, remove, ctx: { db } as unknown as MutationCtx };
}
describe("admin access", () => {
  it("does not expose account data or permit blocking with a setup-only token", async () => {
    const { ctx, patch } = context();
    expect(await read(ctx, { token: "setup" })).toBeNull();
    await expect(block(ctx, { token: "setup", profileId: id, blocked: true })).rejects.toThrow("ADMIN_SIGNED_OUT");
    expect(patch).not.toHaveBeenCalled();
  });
  it("blocks and unblocks only for a full session matching the current password version", async () => {
    const { ctx, patch } = context({ passwordHash: "version" }, { ...session, setupOnly: false, credentialVersion: "version" });
    await block(ctx, { token: "owner", profileId: id, blocked: true });
    await block(ctx, { token: "owner", profileId: id, blocked: false });
    expect(patch.mock.calls).toEqual([[id, { blocked: true }], [id, { blocked: false }]]);
    const stale = context({ passwordHash: "new-version" }, { ...session, setupOnly: false, credentialVersion: "old-version" });
    await expect(block(stale.ctx, { token: "old", profileId: id, blocked: true })).rejects.toThrow("ADMIN_SIGNED_OUT");
  });
  it("rejects blocked accounts even with existing parent or device credentials", async () => {
    const { ctx } = context();
    expect(await checkDevice(ctx, id, "device")).toBeNull();
    await expect(requireParent(ctx, "parent")).rejects.toThrow("ACCOUNT_BLOCKED");
  });
  it("changes credentials once, revokes old sessions, and refuses competing setup sessions", async () => {
    const { ctx, insert, remove } = context();
    const args = { token: "setup", passwordHash: "new-hash", passwordSalt: "salt", nextTokenHash: "next", expiresAt: Date.now() + 10000 };
    const write = handler<(ctx: MutationCtx, payload: typeof args) => Promise<void>>(setPassword);
    await write(ctx, args);
    expect(insert).toHaveBeenCalledWith("adminCredentials", expect.objectContaining({ passwordHash: "new-hash", passwordSalt: "salt" }));
    expect(remove).toHaveBeenCalledWith("s1");
    expect(insert).toHaveBeenCalledWith("adminSessions", expect.objectContaining({ setupOnly: false, credentialVersion: "new-hash" }));
    const competing = context({ passwordHash: "already-set" });
    await expect(write(competing.ctx, args)).rejects.toThrow("ADMIN_SIGNED_OUT");
    const open = handler<(ctx: MutationCtx, args: { tokenHash: string; expiresAt: number; setupOnly: boolean; credentialVersion: string }) => Promise<void>>(openSession);
    await expect(open(competing.ctx, { tokenHash: "x", expiresAt: Date.now() + 1000, setupOnly: true, credentialVersion: "bootstrap" })).rejects.toThrow("ADMIN_WRONG");
  });
});

it("accepts the bootstrap password only for setup and ignores it once a real password exists", async () => {
  vi.stubEnv("ADMIN_PASSWORD", "Bootstrap12345!");
  const runQuery = vi.fn(async (): Promise<unknown> => null);
  const runMutation = vi.fn(async () => ({ locked: false }));
  const ctx = { runQuery, runMutation } as unknown as ActionCtx;
  const login = handler<(ctx: ActionCtx, args: { password: string }) => Promise<{ mustChangePassword: boolean }>>(adminLogin);
  try {
    expect((await login(ctx, { password: "Bootstrap12345!" })).mustChangePassword).toBe(true);
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ setupOnly: true }));
    runQuery.mockResolvedValue({ passwordHash: pbkdf2Sync("MyPrivatePassword", "salt", 210000, 32, "sha256").toString("base64"), passwordSalt: "salt" });
    await expect(login(ctx, { password: "Bootstrap12345!" })).rejects.toThrow("ADMIN_WRONG");
    expect((await login(ctx, { password: "MyPrivatePassword" })).mustChangePassword).toBe(false);
  } finally { vi.unstubAllEnvs(); }
});

it("stores a derived password instead of plaintext and rejects keeping the bootstrap password", async () => {
  vi.stubEnv("ADMIN_PASSWORD", "Bootstrap12345!");
  const runMutation = vi.fn(async (_ref: unknown, _args: unknown) => {});
  const ctx = { runQuery: async () => ({ credentials: null, setupOnly: true }), runMutation } as unknown as ActionCtx;
  const change = handler<(ctx: ActionCtx, args: { token: string; currentPassword: string; newPassword: string }) => Promise<{ mustChangePassword: boolean }>>(changeAdminPassword);
  try {
    await expect(change(ctx, { token: "setup", currentPassword: "", newPassword: "Bootstrap12345!" })).rejects.toThrow("ADMIN_PASSWORD_SAME");
    expect((await change(ctx, { token: "setup", currentPassword: "", newPassword: "MyPrivatePassword" })).mustChangePassword).toBe(false);
    const args = runMutation.mock.calls[0]?.[1] as { passwordHash: string; passwordSalt: string };
    expect(args.passwordHash).not.toBe("MyPrivatePassword");
    expect(args.passwordHash).toBe(pbkdf2Sync("MyPrivatePassword", args.passwordSalt, 210000, 32, "sha256").toString("base64"));
  } finally { vi.unstubAllEnvs(); }
});

it("does not issue a new game token to a blocked account", async () => {
  const runMutation = vi.fn();
  const ctx = { runQuery: async () => ({ _id: id, blocked: true }), runMutation } as unknown as ActionCtx;
  const link = handler<(ctx: ActionCtx, args: { pairCode: string }) => Promise<unknown>>(linkChildDevice);
  await expect(link(ctx, { pairCode: "ABC234" })).rejects.toThrow("ACCOUNT_BLOCKED");
  expect(runMutation).not.toHaveBeenCalled();
});
