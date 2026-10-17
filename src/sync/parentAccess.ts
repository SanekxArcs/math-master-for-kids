import { api } from "@convex/_generated/api";
import { convex } from "@/lib/convex";

export const PARENT_LOCK_EVENT = "math-master-parent-lock";
export const PARENT_SESSION_KEY = "math_master_parent_session";

/** Shared with child mode without loading the parent dashboard bundle. */
export function lockParentAccess(): void {
  const tokens = new Set<string>();
  // Include the old persistent session when upgrading. New parent sessions
  // stay in this tab so a child's tab cannot inherit another tab's login.
  for (const getStorage of [() => localStorage, () => sessionStorage]) {
    try {
      const storage = getStorage();
      try {
        const stored = JSON.parse(storage.getItem(PARENT_SESSION_KEY) ?? "null");
        if (typeof stored?.token === "string") tokens.add(stored.token);
      } catch { /* invalid cached session is removed too */ }
      storage.removeItem(PARENT_SESSION_KEY);
    } catch { /* storage unavailable */ }
  }
  window.dispatchEvent(new Event(PARENT_LOCK_EVENT));
  if (convex) for (const token of tokens) void convex.mutation(api.parent.logout, { token }).catch(() => {});
}
