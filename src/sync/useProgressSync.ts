import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { convex } from "@/lib/convex";
import type { Pet, Stable } from "@/engine";
import { parseStable, readStable, restoreStable, useStable } from "@/game/useStable";
import { currentLevel, setLevel, useLocalLevel } from "@/game/useLocalLevel";
import { readSession } from "@/game/useLocalSession";
import { profileKey } from "./profileScope";
import type { IdentityState } from "./useSync";

function toPet(pet: Pet): Pet {
  const { id, species, name, food, clean, happy, health, alive, updatedAt, diedAt,
    vacation, lastPettedAt, lastPlayedAt, owned, worn } = pet;
  return { id, species, name, food, clean, happy, health, alive, updatedAt, diedAt,
    vacation, lastPettedAt, lastPlayedAt, owned, worn: { ...worn } };
}

export function toBackup(stable: Stable, level: number) {
  const session = readSession();
  let lostFrom: number | null = null;
  try {
    const raw = Number(localStorage.getItem(profileKey("math_master_lost_from")));
    if (Number.isFinite(raw) && raw >= 1) lostFrom = raw;
  } catch { /* storage unavailable */ }
  return {
    coins: stable.coins, lastBonusDay: stable.lastBonusDay, pets: stable.pets.map(toPet),
    prestigeLevels: stable.prestigeLevels ?? 0,
    activeId: stable.activeId, savedAt: stable.savedAt,
    favoriteId: stable.favoriteId ?? stable.activeId,
    wish: stable.wish ? { petId: stable.wish.petId, itemId: stable.wish.itemId } : null,
    level, asleepSince: stable.asleepSince,
    session: session ? JSON.stringify(session) : null, lostFrom,
  };
}

type ServerResult = Extract<FunctionReturnType<typeof api.progress.forDevice>, { status: "ok" }>;
type Progress = NonNullable<ServerResult["progress"]>;
type Remote = { status: "ok"; progress: Progress | null; revision: number | null };
export interface BackupBase { revision: number | null; savedAt: number }

export function readBackupBase(): BackupBase | null {
  try {
    const value = JSON.parse(localStorage.getItem(profileKey("math_master_backup_base")) ?? "null");
    return value && (value.revision === null || Number.isFinite(value.revision)) && Number.isFinite(value.savedAt)
      ? value as BackupBase : null;
  } catch { return null; }
}
function storeBase(base: BackupBase): void {
  try { localStorage.setItem(profileKey("math_master_backup_base"), JSON.stringify(base)); } catch { /* memory copy still works */ }
}
function archiveLocal(): void {
  localStorage.setItem(profileKey("math_master_recovery_" + Date.now() + "_" + crypto.randomUUID()),
    JSON.stringify(toBackup(readStable(), currentLevel())));
}

/** Local-first snapshots. Server revisions, rather than device clocks, decide conflicts. */
export function useProgressSync(identity: IdentityState) {
  const stable = useStable();
  const [level] = useLocalLevel();
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  const [restoredVersion, setRestoredVersion] = useState(0);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<Remote | null>(null);
  const [base, setBase] = useState<BackupBase | null>(readBackupBase);
  const initialized = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const save = useMutation(api.progress.save);
  const args = identity && convex
    ? { profileId: identity.profileId as Id<"profiles">, deviceToken: identity.deviceToken } : null;
  const remote = useQuery(api.progress.forDevice, args ?? "skip");

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const remember = useCallback((next: BackupBase) => { storeBase(next); setBase(next); }, []);
  const restore = useCallback((backup: Progress, revision: number | null) => {
    setLevel(backup.level);
    for (const [key, value] of [
      ["math_master_session", backup.session ?? null],
      ["math_master_lost_from", backup.lostFrom == null ? null : String(backup.lostFrom)],
    ] as const) {
      if (value === null) localStorage.removeItem(profileKey(key));
      else localStorage.setItem(profileKey(key), value);
    }
    restoreStable({ ...backup, asleepSince: backup.asleepSince ?? null });
    remember({ revision, savedAt: backup.savedAt });
    setRestoredVersion((version) => version + 1);
    setConflict(null);
    setFailed(false);
    setReady(true);
  }, [remember]);

  // Restore once before play; later cloud changes are checked on save.
  useEffect(() => {
    if (initialized.current || remote?.status !== "ok") return;
    initialized.current = true;
    const local = readStable();
    const initial = readBackupBase();
    const legacyRevision = (remote as { revision?: number | null }).revision;
    const revision = legacyRevision ?? (remote.progress ? 0 : null);
    if (!remote.progress) {
      remember({ revision, savedAt: 0 }); setReady(true); return;
    }
    const dirty = local.savedAt > 0 && (initial ? local.savedAt !== initial.savedAt : true);
    const legacyStable = parseStable(JSON.stringify(remote.progress));
    const sameLegacySave = revision === 0 && local.savedAt === remote.progress.savedAt &&
      currentLevel() === remote.progress.level && local.coins === legacyStable.coins &&
      local.lastBonusDay === legacyStable.lastBonusDay && local.activeId === legacyStable.activeId &&
      (local.favoriteId ?? local.activeId) === (legacyStable.favoriteId ?? legacyStable.activeId) &&
      (local.prestigeLevels ?? 0) === (legacyStable.prestigeLevels ?? 0) &&
      JSON.stringify(local.pets) === JSON.stringify(legacyStable.pets) &&
      JSON.stringify(local.wish) === JSON.stringify(legacyStable.wish) &&
      (remote.progress.asleepSince === undefined || local.asleepSince === legacyStable.asleepSince) &&
      (remote.progress.session == null || remote.progress.session === toBackup(local, currentLevel()).session);
    if (!dirty) {
      restore(remote.progress, revision);
    } else if (!initial && sameLegacySave) {
      // Adopt the matching old backup while uploading previously local-only
      // round/sleep fields, without asking a family to choose identical games.
      remember({ revision, savedAt: -1 }); setReady(true);
    } else if (initial && initial.revision === revision) {
      setBase(initial); setReady(true);
    } else if (legacyRevision === undefined && local.savedAt === remote.progress.savedAt) {
      restore(remote.progress, revision);
    } else if (legacyRevision === undefined) {
      // Compatibility while a legacy backend is being upgraded.
      if (local.savedAt < remote.progress.savedAt) restore(remote.progress, revision);
      else { remember({ revision, savedAt: remote.progress.savedAt }); setReady(true); }
    } else {
      setConflict(remote); setReady(true);
    }
  }, [remote, remember, restore]);

  const push = useCallback(async (force = false) => {
    if (!args || !base || conflict || inFlight.current) return;
    const current = readStable();
    if (!force && current.savedAt === base.savedAt) return;
    const snapshot = toBackup(current, currentLevel());
    inFlight.current = true;
    setSaving(true);
    setFailed(false);
    try {
      const result = await save({ ...args, progress: snapshot, baseRevision: base.revision });
      if (!mounted.current) return;
      if (result.status === "conflict") {
        setConflict({ status: "ok", progress: result.progress, revision: result.revision });
      } else if (result.status === "ok" && result.applied) {
        remember({ revision: result.revision ?? base.revision, savedAt: snapshot.savedAt });
        setFailed(false);
      } else setFailed(true);
    } catch { if (mounted.current) setFailed(true); }
    finally { inFlight.current = false; if (mounted.current) setSaving(false); }
  }, [args?.profileId, args?.deviceToken, base, conflict, save, remember]);
  const saveNow = useCallback(() => push(true), [push]);

  useEffect(() => {
    if (!ready || conflict || !base || stable.savedAt === base.savedAt) return;
    const id = window.setTimeout(() => void push(), 800);
    return () => window.clearTimeout(id);
  }, [ready, stable, level, base, retry, conflict, push]);

  useEffect(() => {
    const bump = () => setRetry((n) => n + 1);
    const hide = () => { if (document.visibilityState === "hidden") void push(); };
    window.addEventListener("online", bump);
    document.addEventListener("visibilitychange", hide);
    const id = window.setInterval(bump, 30_000);
    return () => { window.removeEventListener("online", bump); document.removeEventListener("visibilitychange", hide); window.clearInterval(id); };
  }, [push]);
  useEffect(() => {
    if (readStable().savedAt === 0) return;
    const id = window.setTimeout(() => setReady(true), 4000);
    return () => window.clearTimeout(id);
  }, []);

  const chooseCloud = () => {
    if (!conflict?.progress) return;
    try { archiveLocal(); restore(conflict.progress, conflict.revision); }
    catch { setFailed(true); }
  };
  const chooseDevice = () => {
    if (!conflict) return;
    try {
      archiveLocal();
      if (conflict.progress) localStorage.setItem(profileKey("math_master_cloud_recovery_" + Date.now()), JSON.stringify(conflict.progress));
      remember({ revision: conflict.revision, savedAt: -1 }); setConflict(null);
    } catch { setFailed(true); }
  };
  return { ready, restoredVersion, failed, saving, saveNow: base && !conflict ? saveNow : null,
    pending: !base || stable.savedAt !== base.savedAt || conflict !== null,
    conflict, chooseCloud, chooseDevice };
}
