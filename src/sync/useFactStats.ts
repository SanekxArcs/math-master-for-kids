import { useCallback, useEffect, useRef } from "react";
import type { FactStat, Op, Difficulty } from "@/engine";
import type { AttemptRecord } from "@/game/useGame";
import { applyOutcome, loadFacts, persistFact, type StoredFact } from "./facts";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import type { DeviceIdentity } from "./db";
import { activeProfile } from "./profileScope";

/**
 * Owns the child's per-fact record for this device.
 *
 * The map is held in a ref and mutated in place rather than kept in state: the
 * question picker reads it synchronously at the moment it builds a question,
 * and a re-render between answering and the next question would be pure
 * overhead for something nothing renders.
 */
export function useFactStats(identity?: DeviceIdentity | null) {
  const stats = useRef<Map<string, FactStat>>(new Map());
  const profileId = identity?.profileId ?? activeProfile();

  useEffect(() => {
    let cancelled = false;
    stats.current = new Map();
    void loadFacts(profileId).then((loaded) => {
      if (cancelled) return;
      // Merge rather than replace: answers given while IndexedDB was still
      // being read must not be thrown away.
      for (const [id, stat] of loaded) {
        const current = stats.current.get(id);
        if (!current || (stat.attempts >= current.attempts && stat.lastSeenAt >= current.lastSeenAt)) {
          stats.current.set(id, stat);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const getStats = useCallback(() => stats.current as ReadonlyMap<string, FactStat>, []);

  const recordFacts = useCallback((records: AttemptRecord[]) => {
    for (const record of records) {
      const { id, stat } = applyOutcome(
        stats.current,
        {
          op: record.op as Op,
          a: record.factA,
          b: record.factB,
          difficulty: record.difficulty as Difficulty,
        },
        {
          isCorrect: record.isCorrect,
          ms: record.ms,
          difficulty: record.difficulty as Difficulty,
          // A lifeline means they did not recall it unaided, which is what the
          // strength is meant to measure.
          aided: record.usedHalfHalf || record.usedVisualHint,
        },
        record.createdAt,
      );
      void persistFact(id, stat, profileId);
    }
  }, [profileId]);

  const restoreFacts = useCallback((rows: StoredFact[]) => {
    for (const { id, ...stat } of rows) {
      const local = stats.current.get(id);
      // Pending offline answers can already be ahead of the server.
      if (local && (local.attempts > stat.attempts || local.lastSeenAt > stat.lastSeenAt)) continue;
      stats.current.set(id, stat);
      void persistFact(id, stat, profileId);
    }
  }, [profileId]);

  // Restore once per device load, with retries. A subscription to the full
  // history would download it again after every answer on every device.
  useEffect(() => {
    if (!identity || !convex) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      void convex!.query(api.attempts.factsForDevice, {
        profileId: identity.profileId as Id<"profiles">, deviceToken: identity.deviceToken,
      }).then((rows) => {
        if (!cancelled) restoreFacts(rows);
      }).catch(() => {
        if (!cancelled) timer = setTimeout(load, 30_000);
      });
    };
    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [identity?.profileId, identity?.deviceToken, restoreFacts]);

  return { getStats, recordFacts, restoreFacts };
}
