import Dexie, { type Table } from "dexie";
import type { AttemptRecord } from "@/game/useGame";
import type { StoredFact } from "./facts";
import { activateProfile, profileKey, legacyProfile, activeProfile, belongsToProfile } from "./profileScope";

export interface OutboxRow extends AttemptRecord {
  profileId?: string;
  /** 0 = still owed to the server. Indexed, so the flush query is cheap. */
  synced: 0 | 1;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

/** Credentials this device holds for one kid profile. */
export interface DeviceIdentity {
  profileId: string;
  deviceToken: string;
  pairCode: string;
  name: string;
}

class MathMasterDb extends Dexie {
  outbox!: Table<OutboxRow, string>;
  meta!: Table<MetaRow, string>;
  facts!: Table<StoredFact, string>;

  constructor() {
    super("math-master");
    this.version(1).stores({
      outbox: "clientId, synced, createdAt",
      meta: "key",
    });
    // Per-fact mastery, added in v2. Dexie migrates existing databases in
    // place, so an installed app keeps its outbox and settings mirror.
    this.version(2).stores({
      outbox: "clientId, synced, createdAt",
      meta: "key",
      facts: "id, lastSeenAt",
    });
  }
}

export const db = new MathMasterDb();

async function getMeta<T>(key: string): Promise<T | null> {
  try {
    const row = await db.meta.get(key);
    return row ? (row.value as T) : null;
  } catch {
    // A blocked or corrupt IndexedDB must never stop the child playing.
    return null;
  }
}

async function setMeta(key: string, value: unknown): Promise<void> {
  try {
    await db.meta.put({ key, value });
  } catch {
    /* ignore — see above */
  }
}

export const getIdentity = async () => {
  const identity = await getMeta<DeviceIdentity>("identity");
  if (identity) {
    activateProfile(identity.profileId, true);
    await setMeta(profileKey("identity", identity.profileId), identity);
  }
  return identity;
};
export const saveIdentity = async (identity: DeviceIdentity) => {
  const previous = await getMeta<DeviceIdentity>("identity");
  if (previous) await setMeta(profileKey("identity", previous.profileId), previous);
  activateProfile(identity.profileId);
  await setMeta(profileKey("identity", identity.profileId), identity);
  await setMeta("identity", identity);
};
export const clearIdentity = () => setMeta("identity", null);

/** Explicit sign-out removes only this profile; other profiles keep their saves. */
export async function forgetProfile(profileId: string): Promise<void> {
  await db.transaction("rw", db.outbox, db.facts, db.meta, async () => {
    await db.outbox.filter((row) => belongsToProfile(row, profileId)).delete();
    await db.facts.filter((row) => row.id.startsWith(profileId + "|") ||
      (!row.id.includes("|") && legacyProfile() === profileId)).delete();
    await db.meta.delete(profileKey("identity", profileId));
    await db.meta.delete(profileKey("settings", profileId));
    if (legacyProfile() === profileId) await db.meta.delete("settings");
    const current = await db.meta.get("identity");
    if ((current?.value as DeviceIdentity | undefined)?.profileId === profileId) await db.meta.delete("identity");
  });
}

/**
 * Last known settings. Convex is the source of truth, but the game reads this
 * mirror so a cold start with no signal still uses the parent's real
 * configuration rather than silently falling back to defaults.
 */
export const getSettingsMirror = async <T>() =>
  await getMeta<T>(profileKey("settings")) ??
  (activeProfile() === legacyProfile() ? await getMeta<T>("settings") : null);
export const saveSettingsMirror = (settings: unknown) => setMeta(profileKey("settings"), settings);
