import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import { currentLevel } from "@/game/useLocalLevel";
import { readStable } from "@/game/useStable";
import { forgetProfile, type DeviceIdentity } from "./db";
import { activeProfile, legacyProfile } from "./profileScope";
import { flush } from "./outbox";
import { toBackup, readBackupBase } from "./useProgressSync";

/**
 * How long each network step may take. Convex queues a call made while
 * offline instead of failing it, so without a limit an offline sign-out would
 * wait forever for a connection that is not coming.
 */
const STEP_MS = 4000;

async function withinTime<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Cloud backup timed out")), STEP_MS);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

/** Kept across a sign-out: the next person to set up still reads their own language. */
const KEEP = new Set(["math_master_lang"]);

/**
 * Signs this device all the way out: the child's profile, pets, coins, level,
 * history and the dashboard session all leave it, and it opens on setup again.
 *
 * Everything that can be saved is sent first — answers still waiting in the
 * outbox, and the latest coins and pets — so that signing out loses nothing
 * the backup could have kept. Online save failures stop removal. A device
 * that is offline can still sign out after the caller's explicit warning.
 */
export async function signOutDevice(identity: DeviceIdentity | null, parentToken: string | null) {
  // Offline removal is explicitly warned about in the confirmation. Online,
  // a failed save must leave the only complete copy on this device intact.
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (convex && identity) {
    const credentials = {
      profileId: identity.profileId as Id<"profiles">,
      deviceToken: identity.deviceToken,
    };
    try {
      const result = await withinTime(flush(convex, identity));
      if (result.unlinked || result.remaining > 0) throw new Error("Answers not backed up");
    } catch (error) {
      if (online) throw error;
      /* offline: those answers were warned about */
    }
    try {
      const stable = readStable();
      if (stable.savedAt > 0) {
        const base = readBackupBase();
        if (!base) throw new Error("Open the game to finish backing up before signing out");
        const result = await withinTime(
          convex.mutation(api.progress.save, {
            ...credentials,
            progress: toBackup(stable, currentLevel()),
            baseRevision: base.revision,
          }),
        );
        if (result.status !== "ok") throw new Error("Game not backed up");
      }
    } catch (error) {
      if (online) throw error;
      /* the backup keeps whatever it last had */
    }
    try {
      await withinTime(convex.mutation(api.profiles.signOutDevice, credentials));
    } catch {
      /* the token then just goes unused */
    }
  }
  if (convex && parentToken) {
    try {
      await withinTime(convex.mutation(api.parent.logout, { token: parentToken }));
    } catch {
      /* it expires on its own */
    }
  }

  const profileId = identity?.profileId ?? activeProfile();
  try {
    await forgetProfile(profileId);
  } catch {
    /* blocked storage remains untouched */
  }
  try {
    for (const key of Object.keys(localStorage)) {
      const scoped = profileId !== "guest" && key.endsWith(":" + profileId);
      const legacy = legacyProfile() === profileId && !key.includes(":") &&
        key !== "math_master_active_profile" && key !== "math_master_legacy_profile";
      if (key.startsWith("math_master_") && !KEEP.has(key) &&
        (scoped || legacy || key === "math_master_parent_session")) localStorage.removeItem(key);
    }
  } catch {
    /* private mode */
  }

  // A full reload rather than a route change: several stores keep a copy in
  // memory, and a fresh start is the only way to be sure none of it survives.
  try { sessionStorage.removeItem("math_master_parent_session"); } catch { /* private mode */ }
  window.location.assign("/");
}
