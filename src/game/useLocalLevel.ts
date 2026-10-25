import { useCallback, useSyncExternalStore } from "react";
import { touchStable } from "./useStable";
import { activeProfile, profileKey } from "@/sync/profileScope";
import { MAX_LEVEL } from "@/engine/level";

const KEY = "math_master_level";

/**
 * The level is kept apart from the session on purpose.
 *
 * A session is one sitting and is forgotten after a few hours; a level is
 * something the child earned and expects to still have tomorrow. It goes down
 * only one way: losing a game — the points sunk to minus a quarter of the goal
 * — sends the child back to level 1, and that is a rule of the game, spelled
 * out on screen, never something that happens quietly.
 */
export function readLevel(): number {
  if (typeof localStorage === "undefined") return 1;
  try {
    const raw = localStorage.getItem(profileKey(KEY));
    if (!raw) return 1;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(MAX_LEVEL, parsed) : 1;
  } catch {
    return 1;
  }
}

/** Only used when storage refuses writes, so private mode keeps the level this sitting. */
const memory = new Map<string, number>();
const listeners = new Set<() => void>();

function getSnapshot(): number {
  return memory.get(activeProfile()) ?? readLevel();
}

function write(level: number): void {
  try {
    localStorage.setItem(profileKey(KEY), String(level));
    memory.delete(activeProfile());
  } catch {
    // Private mode or a full quota: they still get the level this sitting.
    memory.set(activeProfile(), level);
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === profileKey(KEY) || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("math-master-profile", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("math-master-profile", listener);
  };
}

/**
 * Moves the level up to at least `level`, never down: the "next level" button.
 */
export function raiseLevel(level: number): void {
  if (!Number.isFinite(level)) return;
  level = Math.min(MAX_LEVEL, level);
  if (level <= getSnapshot()) return;
  write(level);
  touchStable();
}

/** The level as the game sees it, including the in-memory copy private mode falls back to. */
export function currentLevel(): number {
  return getSnapshot();
}

/** Sets the level outright, up or down — for a backup newer than this device. */
export function setLevel(level: number): void {
  const next = Number.isFinite(level) ? Math.min(MAX_LEVEL, Math.max(1, Math.floor(level))) : 1;
  if (next === getSnapshot()) return;
  write(next);
}

export function useLocalLevel() {
  const level = useSyncExternalStore(subscribe, getSnapshot, () => 1);
  // Stamped like the reset: the level travels inside the stable's backup, and
  // only a strictly newer stamp wins. An unstamped level-up was sent with the
  // old stamp, so it could be overwritten or ping-pong between two devices.
  const advance = useCallback(() => {
    raiseLevel(getSnapshot() + 1);
  }, []);
  /**
   * Back to level 1 after a lost game. The stable is stamped too, because the
   * level travels inside its backup: without a newer stamp the backup would
   * look newer and hand the old level straight back.
   */
  const reset = useCallback(() => {
    setLevel(1);
    touchStable();
  }, []);
  return [level, advance, reset] as const;
}
