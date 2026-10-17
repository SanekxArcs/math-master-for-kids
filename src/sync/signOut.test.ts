// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const cloud = vi.hoisted(() => ({ client: null as null | { mutation: ReturnType<typeof vi.fn> } }));
const flush = vi.hoisted(() => vi.fn(async () => ({ sent: 0, remaining: 0, unlinked: false })));
vi.mock("@/lib/convex", () => ({ get convex() { return cloud.client; } }));
vi.mock("./outbox", () => ({ flush }));

const { signOutDevice } = await import("./signOut");

describe("signOutDevice", () => {
  beforeEach(() => { cloud.client = null; flush.mockClear(); });
  it("clears everything the child left on this device, keeps the language, and starts over", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, assign } });
    for (const key of ["math_master_stable", "math_master_level", "math_master_session", "math_master_parent_session"]) {
      localStorage.setItem(key, "{}");
    }
    localStorage.setItem("math_master_lang", "pl");
    localStorage.setItem("someone_else", "kept");
    localStorage.setItem("math_master_stable:another-child", "retained progress");

    await signOutDevice(null, null);

    expect(localStorage.getItem("math_master_stable")).toBeNull();
    expect(localStorage.getItem("math_master_level")).toBeNull();
    expect(localStorage.getItem("math_master_session")).toBeNull();
    expect(localStorage.getItem("math_master_parent_session")).toBeNull();
    expect(localStorage.getItem("math_master_lang")).toBe("pl");
    expect(localStorage.getItem("someone_else")).toBe("kept");
    expect(localStorage.getItem("math_master_stable:another-child")).toBe("retained progress");
    expect(assign).toHaveBeenCalledWith("/");
  });

  it("keeps the only local copy and credentials when the final cloud save fails online", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { assign } });
    localStorage.setItem("math_master_stable", JSON.stringify({ coins: 99, savedAt: Date.now() }));
    localStorage.setItem("math_master_backup_base", JSON.stringify({ revision: 1, savedAt: 1 }));
    cloud.client = { mutation: vi.fn().mockRejectedValue(new Error("Save failed")) };
    const identity = { profileId: "p1", deviceToken: "t1", pairCode: "ABC234", name: "Zosia" };
    await expect(signOutDevice(identity, null)).rejects.toThrow("Save failed");
    expect(localStorage.getItem("math_master_stable")).toContain("99");
    expect(assign).not.toHaveBeenCalled();
    expect(cloud.client.mutation).toHaveBeenCalledTimes(1);
  });
});
