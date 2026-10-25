import { completedLevels } from "@/engine/level";
import { currentLevel, setLevel } from "./useLocalLevel";
import { readSession } from "./useLocalSession";
import { updateStable } from "./useStable";
import { profileKey } from "@/sync/profileScope";

/** Completed levels can be exchanged once. Existing coins, pets and bonus day survive. */
export function prestigeRun(): boolean {
  const earned = completedLevels(currentLevel(), readSession()?.won === true);
  if (earned === 0) return false;
  // Invalidate the completed run before publishing the new prestige balance.
  setLevel(1);
  try {
    localStorage.removeItem(profileKey("math_master_session"));
    localStorage.removeItem(profileKey("math_master_lost_from"));
  } catch { /* The live game still restarts when storage is unavailable. */ }
  updateStable((stable) => ({ ...stable, prestigeLevels: (stable.prestigeLevels ?? 0) + earned }));
  return true;
}
