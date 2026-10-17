// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { lockParentAccess, PARENT_SESSION_KEY } from "@/sync/parentAccess";
import { useParentSession } from "./useParentSession";

const revoke = vi.hoisted(() => vi.fn(async (_ref?: unknown, _args?: unknown) => undefined));
vi.mock("@/lib/convex", () => ({ convex: { mutation: revoke } }));
vi.mock("convex/react", () => ({ useMutation: () => revoke }));

const session = { token: "parent-secret", profileId: "p1", name: "Ada", expiresAt: Date.now() + 60_000 };

describe("locking parent access for child play", () => {
  it("clears the parent login and revokes cached sessions without changing the child's save", async () => {
    revoke.mockClear();
    sessionStorage.setItem(PARENT_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(PARENT_SESSION_KEY, JSON.stringify({ ...session, token: "legacy-parent-secret" }));
    localStorage.setItem("math_master_stable", "child save");
    const hook = renderHook(() => useParentSession());
    expect(hook.result.current.session?.token).toBe("parent-secret");
    await act(async () => lockParentAccess());
    expect(hook.result.current.session).toBeNull();
    expect(sessionStorage.getItem(PARENT_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(PARENT_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem("math_master_stable")).toBe("child save");
    expect(revoke.mock.calls.map(([, args]) => args)).toEqual(expect.arrayContaining([
      { token: "parent-secret" }, { token: "legacy-parent-secret" },
    ]));
    expect(renderHook(() => useParentSession()).result.current.session).toBeNull();
  });

  it("does not inherit a persistent dashboard session from another tab", () => {
    localStorage.setItem(PARENT_SESSION_KEY, JSON.stringify(session));
    expect(renderHook(() => useParentSession()).result.current.session).toBeNull();
  });

  it("locks locally even when the server cannot be reached", async () => {
    revoke.mockRejectedValueOnce(new Error("offline"));
    sessionStorage.setItem(PARENT_SESSION_KEY, JSON.stringify(session));
    const hook = renderHook(() => useParentSession());
    await act(async () => lockParentAccess());
    expect(hook.result.current.session).toBeNull();
    expect(sessionStorage.getItem(PARENT_SESSION_KEY)).toBeNull();
  });

  it("does not reopen a cached dashboard after its session was cleared during child play", () => {
    sessionStorage.setItem(PARENT_SESSION_KEY, JSON.stringify(session));
    const hook = renderHook(() => useParentSession());
    expect(hook.result.current.session).not.toBeNull();
    sessionStorage.removeItem(PARENT_SESSION_KEY);
    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(hook.result.current.session).toBeNull();
  });
});
