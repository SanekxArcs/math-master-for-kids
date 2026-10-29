import { expect, it, vi } from "vitest";
import { isChunkLoadError, recoverChunkError } from "./chunkRecovery";
it("recognises missing dynamic modules without treating ordinary crashes as updates", () => {
  expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/ParentRoute-old.js"))).toBe(true);
  expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
  expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
});
it("updates the worker and reloads once, without clearing any game data", async () => {
  const data = new Map<string, string>([["game", "keep"]]);
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  const refresh = vi.fn(async () => {}), reload = vi.fn();
  const opts = { online: true, now: 100000, storage, refresh, reload };
  const error = new Error("Failed to fetch dynamically imported module: /assets/old.js");
  expect(await recoverChunkError(error, opts)).toBe(true);
  expect(refresh).toHaveBeenCalledOnce(); expect(reload).toHaveBeenCalledOnce();
  expect(await recoverChunkError(error, opts)).toBe(false);
  expect(reload).toHaveBeenCalledOnce(); expect(data.get("game")).toBe("keep");
  expect(await recoverChunkError(error, { ...opts, online: false, now: 200000 })).toBe(false);
});
