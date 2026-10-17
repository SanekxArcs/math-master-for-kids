// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { NEW_STABLE, newPet, accessoriesFor, type Stable } from "@/engine";
import { parseStable, updateStable } from "@/game/useStable";
import { readLevel, raiseLevel } from "@/game/useLocalLevel";
import { readSession, writeSession } from "@/game/useLocalSession";

const remote = vi.hoisted(() => ({ value: undefined as unknown }));
const save = vi.hoisted(() => vi.fn(async (_args: unknown): Promise<unknown> => ({ status: "ok", applied: true })));

vi.mock("convex/react", () => ({
  useQuery: () => remote.value,
  useMutation: () => save,
}));
vi.mock("@/lib/convex", () => ({ convex: {} }));

const { useProgressSync, toBackup } = await import("./useProgressSync");

const identity = { profileId: "p1", deviceToken: "t1", pairCode: "ABC234", name: "Zosia" };
const T0 = new Date(2026, 8, 25, 9, 0).getTime();

function local(): Stable {
  return parseStable(localStorage.getItem("math_master_stable"));
}

function backup(overrides: Partial<Stable & { level: number }> = {}) {
  return {
    status: "ok",
    progress: {
      ...NEW_STABLE,
      coins: 77,
      pets: [newPet("horse", "Bella", T0)],
      activeId: "horse",
      savedAt: T0,
      level: 3,
      ...overrides,
    },
  };
}

describe("useProgressSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    save.mockClear();
    remote.value = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores a newer backup onto a fresh device, level included", () => {
    remote.value = backup();
    renderHook(() => useProgressSync(identity));

    expect(local().coins).toBe(77);
    expect(local().pets[0]?.name).toBe("Bella");
    expect(readLevel()).toBe(3);
  });

  it("sends nothing before the backup has been read", () => {
    updateStable((stable) => ({ ...stable, coins: 1 }));
    renderHook(() => useProgressSync(identity));
    act(() => vi.advanceTimersByTime(5000));
    expect(save).not.toHaveBeenCalled();
  });

  it("does not overwrite a newer backup with a fresh device's empty stable", () => {
    remote.value = backup();
    renderHook(() => useProgressSync(identity));
    act(() => vi.advanceTimersByTime(5000));
    expect(save).not.toHaveBeenCalled();
  });

  it("sends a level lowered by a lost game, rather than taking the backup's higher one", () => {
    remote.value = backup({ savedAt: 1, level: 3 });
    // The lost game stamps the stable, so this device's copy is the newer.
    updateStable((stable) => ({ ...stable, coins: 12 }));
    localStorage.setItem("math_master_level", "1");
    renderHook(() => useProgressSync(identity));

    expect(readLevel()).toBe(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(save.mock.calls[0]?.[0]).toMatchObject({ progress: { level: 1 } });
  });

  it("sends a change made on this device once it is newer than the backup", () => {
    remote.value = backup({ savedAt: 1 });
    updateStable((stable) => ({ ...stable, coins: 12 }));
    renderHook(() => useProgressSync(identity));

    act(() => vi.advanceTimersByTime(1000));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0]).toMatchObject({ progress: { coins: 12 } });
  });

  it("does not open the game until the first cloud snapshot has restored", () => {
    const hook = renderHook(() => useProgressSync(identity));
    expect(hook.result.current.ready).toBe(false);
    act(() => vi.advanceTimersByTime(5000));
    expect(hook.result.current.ready).toBe(false);
    remote.value = backup();
    hook.rerender();
    expect(hook.result.current.ready).toBe(true);
    expect(readLevel()).toBe(3);
    expect(local().pets[0]?.name).toBe("Bella");
  });

  it("lets a previously played device continue when the cloud cannot be reached", () => {
    updateStable((stable) => ({ ...stable, coins: 42 }));
    const hook = renderHook(() => useProgressSync(identity));
    act(() => vi.advanceTimersByTime(4000));
    expect(hook.result.current.ready).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it("round-trips the complete animal collection, wardrobe, wish, sleep and won board", () => {
    vi.setSystemTime(T0);
    const accessory = accessoriesFor("horse")[0]!;
    const wish = accessoriesFor("cat")[0]!;
    const pets = [
      { ...newPet("horse", "Bella", T0), owned: [accessory.id], worn: { [accessory.slot]: accessory.id } },
      newPet("cat", "Kitty", T0),
      { ...newPet("dog", "Dog", T0), vacation: true },
      { ...newPet("bunny", "Bunny", T0), alive: false, diedAt: T0 },
      newPet("unicorn", "Unicorn", T0), newPet("tiger", "Tiger", T0),
    ];
    const stable: Stable = { ...NEW_STABLE, coins: 99, pets, activeId: "cat", savedAt: T0,
      asleepSince: T0, lastBonusDay: "2026-09-25", wish: { petId: "cat", itemId: wish.id } };
    const session = { score: { rawPoints: 100, goodStreak: 4, badStreak: 0, bestStreak: 4, correct: 10, wrong: 1 },
      won: true, lost: false, stopped: false, halfHalfReadyAt: T0 + 3000, question: null,
      usedHalfHalf: false, usedVisualHint: false, hidden: [], savedAt: T0 };
    writeSession(session);
    localStorage.setItem("math_master_onboarded", "1");
    const cloud = toBackup(stable, 7);
    // The second device has nothing from the original browser.
    localStorage.clear();
    remote.value = { status: "ok", progress: cloud };
    const hook = renderHook(() => useProgressSync(identity));
    expect(local()).toEqual(stable);
    expect(readLevel()).toBe(7);
    expect(readSession()).toEqual(session);
    // Walkthroughs belong to this device: a newly linked child sees the guide.
    expect(localStorage.getItem("math_master_onboarded")).toBeNull();
    expect(hook.result.current.ready).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(save).not.toHaveBeenCalled();
  });

  it("backs up a level change even before the first animal or reward exists", () => {
    remote.value = { status: "ok", progress: null };
    renderHook(() => useProgressSync(identity));
    act(() => raiseLevel(2));
    act(() => vi.advanceTimersByTime(1000));
    expect(save.mock.calls[0]?.[0]).toMatchObject({ progress: { level: 2 } });
  });

  it("flushes pending progress immediately when the page is hidden", () => {
    remote.value = { status: "ok", progress: null };
    renderHook(() => useProgressSync(identity));
    act(() => updateStable((stable) => ({ ...stable, coins: 88 })));
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(save.mock.calls[0]?.[0]).toMatchObject({ progress: { coins: 88 } });
    visibility.mockRestore();
  });

  it("reports a failed cloud write and retries without losing the local animals", async () => {
    remote.value = { status: "ok", progress: null };
    save.mockRejectedValueOnce(new Error("network"));
    updateStable((stable) => ({ ...stable, pets: [newPet("cat", "Kitty", T0)] }));
    const hook = renderHook(() => useProgressSync(identity));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(hook.result.current.failed).toBe(true);
    expect(local().pets[0]?.name).toBe("Kitty");
    await act(async () => vi.advanceTimersByTime(30_000));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(save).toHaveBeenCalledTimes(2);
    expect(hook.result.current.failed).toBe(false);
  });

  it("asks about competing modern saves instead of trusting a future device clock", () => {
    vi.setSystemTime(T0 + 99_000);
    updateStable((stable) => ({ ...stable, coins: 222 }));
    remote.value = { ...backup(), revision: 7 };
    const hook = renderHook(() => useProgressSync(identity));
    expect(hook.result.current.conflict?.revision).toBe(7);
    expect(local().coins).toBe(222);
    act(() => vi.advanceTimersByTime(5000));
    expect(save).not.toHaveBeenCalled();
    act(() => hook.result.current.chooseCloud());
    expect(local().coins).toBe(77);
    expect(Object.keys(localStorage).some((key) => key.startsWith("math_master_recovery_"))).toBe(true);
  });

  it("restores a missing local save even if its old cloud acknowledgement remains", () => {
    localStorage.setItem("math_master_backup_base", JSON.stringify({ revision: 7, savedAt: T0 }));
    remote.value = { ...backup(), revision: 7 };
    const hook = renderHook(() => useProgressSync(identity));
    expect(hook.result.current.conflict).toBeNull();
    expect(local().coins).toBe(77);
    expect(local().pets[0]?.name).toBe("Bella");
    act(() => vi.advanceTimersByTime(1000));
    expect(save).not.toHaveBeenCalled();
  });

  it("upgrades an identical legacy save without showing a conflict to the family", async () => {
    const old = backup().progress;
    localStorage.setItem("math_master_stable", JSON.stringify(old));
    localStorage.setItem("math_master_level", String(old.level));
    remote.value = { status: "ok", progress: old, revision: 0 };
    const hook = renderHook(() => useProgressSync(identity));
    expect(hook.result.current.conflict).toBeNull();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(save.mock.calls[0]?.[0]).toMatchObject({ baseRevision: 0, progress: { coins: old.coins, level: old.level } });
  });

  it("offers a choice when a save finds another device has changed the server", async () => {
    localStorage.setItem("math_master_backup_base", JSON.stringify({ revision: 7, savedAt: 1 }));
    updateStable((stable) => ({ ...stable, coins: 222 }));
    remote.value = { ...backup({ savedAt: 1 }), revision: 7 };
    save.mockResolvedValueOnce({ status: "conflict", revision: 8, progress: backup().progress });
    const hook = renderHook(() => useProgressSync(identity));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(hook.result.current.conflict?.revision).toBe(8);
    expect(local().coins).toBe(222);
    act(() => hook.result.current.chooseDevice());
    await act(async () => vi.advanceTimersByTime(1000));
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({ baseRevision: 8, progress: { coins: 222 } });
  });
});
