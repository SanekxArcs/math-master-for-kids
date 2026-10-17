import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkDevice } from "./auth";
import { progressFields } from "./schema";

/** The backed-up progress, for the device to restore from. */
export const forDevice = query({
  args: { profileId: v.id("profiles"), deviceToken: v.string() },
  handler: async (ctx, { profileId, deviceToken }) => {
    if (!(await checkDevice(ctx, profileId, deviceToken))) {
      return { status: "unlinked" as const };
    }
    const row = await ctx.db
      .query("progress")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .unique();
    if (!row) return { status: "ok" as const, progress: null, revision: null };
    const { _id: _rowId, _creationTime: _created, profileId: _profile, updatedAt: _updated, revision, ...progress } = row;
    return {
      status: "ok" as const,
      progress,
      revision: revision ?? 0,
    };
  },
});

/**
 * Backs up the device's progress.
 *
 * Modern clients supply the server revision they read. Competing saves return
 * a conflict; device clocks cannot overwrite a different revision. The level
 * remains part of the complete snapshot, including an intentional reset to 1.
 * Legacy clients can update legacy rows only, until the first modern save.
 */
export const save = mutation({
  args: {
    profileId: v.id("profiles"),
    deviceToken: v.string(),
    progress: v.object(progressFields),
    baseRevision: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { profileId, deviceToken, progress, baseRevision }) => {
    if (!(await checkDevice(ctx, profileId, deviceToken))) {
      return { status: "unlinked" as const };
    }

    const incoming = {
      ...progress,
      coins: Math.max(0, Math.floor(progress.coins)),
      level: Math.max(1, Math.floor(progress.level)),
    };

    const existing = await ctx.db
      .query("progress")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .unique();

    const revision = existing ? existing.revision ?? 0 : null;
    if (baseRevision !== undefined && baseRevision !== revision) {
      if (!existing) return { status: "conflict" as const, progress: null, revision: null };
      const { _id: _rowId, _creationTime: _created, profileId: _profile, updatedAt: _updated, revision: _revision, ...backup } = existing;
      return { status: "conflict" as const, progress: backup, revision };
    }
    // An old app cannot erase the new portable state after a modern save.
    if (baseRevision === undefined && existing?.revision !== undefined) {
      return { status: "upgrade_required" as const };
    }
    const nextRevision = (revision ?? 0) + 1;
    const versionFields = baseRevision === undefined ? {} : { revision: nextRevision };

    if (!existing) {
      await ctx.db.insert("progress", { profileId, ...incoming, updatedAt: Date.now(), ...versionFields });
      return { status: "ok" as const, applied: true, revision: baseRevision === undefined ? 0 : nextRevision };
    }

    if (baseRevision === undefined && incoming.savedAt <= existing.savedAt) {
      return { status: "ok" as const, applied: false };
    }

    await ctx.db.patch(existing._id, { ...incoming, updatedAt: Date.now(), ...versionFields });
    return { status: "ok" as const, applied: true, revision: baseRevision === undefined ? 0 : nextRevision };
  },
});
