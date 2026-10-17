// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { activateProfile, activeProfile, belongsToProfile, profileKey } from "./profileScope";
import { readStable, updateStable } from "@/game/useStable";
import { currentLevel, raiseLevel } from "@/game/useLocalLevel";

afterEach(() => activateProfile("guest"));

describe("per-profile saves", () => {
  it("copies a legacy save for its owner without deleting the original", () => {
    localStorage.setItem("math_master_stable", JSON.stringify({ coins: 88, savedAt: 10 }));
    localStorage.setItem("math_master_level", "5");
    activateProfile("child-a", true);
    expect(readStable().coins).toBe(88);
    expect(currentLevel()).toBe(5);
    expect(localStorage.getItem("math_master_stable")).toContain("88");
    activateProfile("child-b", true);
    expect(readStable().coins).not.toBe(88);
    expect(currentLevel()).toBe(1);
    expect(belongsToProfile({}, "child-a")).toBe(true);
    expect(belongsToProfile({}, "child-b")).toBe(false);
  });

  it("switches saves without erasing either child's animals, coins or level", () => {
    activateProfile("child-a");
    updateStable((stable) => ({ ...stable, coins: 75 }));
    raiseLevel(4);
    activateProfile("child-b");
    updateStable((stable) => ({ ...stable, coins: 33 }));
    raiseLevel(2);
    activateProfile("child-a");
    expect(readStable().coins).toBe(75);
    expect(currentLevel()).toBe(4);
    activateProfile("child-b");
    expect(readStable().coins).toBe(33);
    expect(currentLevel()).toBe(2);
  });

  it("does not change this tab's owner when another tab chooses another profile", () => {
    activateProfile("child-a");
    localStorage.setItem("math_master_active_profile", "child-b");
    expect(activeProfile()).toBe("child-a");
    expect(profileKey("math_master_level")).toBe("math_master_level:child-a");
    expect(belongsToProfile({ profileId: "child-b" })).toBe(false);
  });
});
