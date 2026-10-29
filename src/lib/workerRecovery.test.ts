import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";
const source = readFileSync(new URL("../../public/sw-recovery.js", import.meta.url), "utf8");
function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const client = { type: "window", url: "https://karina-math.vercel.app/admin", navigate: vi.fn(async () => {}) };
  const game = { ...client, url: "https://karina-math.vercel.app/play", navigate: vi.fn(async () => {}) };
  const clients = { claim: vi.fn(async () => {}), matchAll: vi.fn(async () => [client, game]), get: vi.fn(async () => client) };
  const fetch = vi.fn(async () => new Response("missing", { status: 404 }));
  const caches = { match: vi.fn(async (): Promise<Response | undefined> => undefined) };
  runInNewContext(source, { self: { location: { origin: "https://karina-math.vercel.app" }, clients, addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler) }, fetch, caches, URL, Date, Promise });
  const trigger = async (name: string, fields = {}) => {
    let pending: Promise<unknown> | undefined;
    handlers.get(name)!({ ...fields, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
  };
  return { client, game, fetch, caches, trigger };
}
it("refreshes old dashboard tabs on activation while leaving maths rounds open", async () => {
  const w = worker(); await w.trigger("activate");
  expect(w.client.navigate).toHaveBeenCalledWith(expect.stringMatching(/\/admin\?__app_update=\d+/));
  expect(w.game.navigate).not.toHaveBeenCalled();
});
it("recovers an old tab when a missing module or cached HTML is requested", async () => {
  const w = worker();
  w.caches.match.mockResolvedValue(new Response("old HTML", { headers: { "content-type": "text/html" } }));
  await w.trigger("fetch", { request: new Request("https://karina-math.vercel.app/assets/AdminRoute-old.js"), clientId: "old-tab" });
  expect(w.client.navigate).toHaveBeenCalledOnce();
});
it("does not loop reloads, duplicate cached JS fetches, or reload offline", async () => {
  const w = worker(); const fields = { request: new Request("https://karina-math.vercel.app/assets/AdminRoute-old.js"), clientId: "old-tab" };
  w.client.url += "?__app_update=" + Date.now();
  await w.trigger("fetch", fields); expect(w.client.navigate).not.toHaveBeenCalled();
  w.caches.match.mockResolvedValue(new Response("export{}", { headers: { "content-type": "application/javascript" } }));
  w.fetch.mockClear(); await w.trigger("fetch", fields); expect(w.fetch).not.toHaveBeenCalled();
  w.caches.match.mockResolvedValue(undefined); w.fetch.mockRejectedValueOnce(new TypeError("offline"));
  await w.trigger("fetch", fields); expect(w.client.navigate).not.toHaveBeenCalled();
});
