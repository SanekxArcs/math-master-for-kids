/* Runs independently of the page bundle, including for tabs opened before recovery existed. */
(() => {
  const PARAM = "__app_update";
  const RETRY_MS = 60_000;

  async function refreshClient(client) {
    if (!client || client.type !== "window") return;
    const url = new URL(client.url);
    if (url.origin !== self.location.origin) return;
    const last = Number(url.searchParams.get(PARAM));
    if (last > 0 && Date.now() - last < RETRY_MS) return;
    url.searchParams.set(PARAM, String(Date.now()));
    await client.navigate(url.href);
  }

  self.addEventListener("activate", event => {
    event.waitUntil((async () => {
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Only dashboards refresh on activation; an active maths round stays open.
      await Promise.allSettled(clients.filter(client => /^\/(admin|parent)(\/|$)/.test(new URL(client.url).pathname)).map(refreshClient));
    })());
  });

  self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);
    if (event.request.method !== "GET" || url.origin !== self.location.origin ||
        !/^\/assets\/[^/]+\.js$/.test(url.pathname) || !event.clientId) return;
    // Observe failures without competing with Workbox's response handling.
    event.waitUntil((async () => {
      try {
        const cached = await caches.match(event.request);
        if (cached?.ok && /javascript|ecmascript/i.test(cached.headers.get("content-type") ?? "")) return;
        const response = await fetch(event.request, { cache: "no-store" });
        if (response.status === 404 || response.status === 410 ||
            (response.ok && /text\/html/i.test(response.headers.get("content-type") ?? ""))) {
          await refreshClient(await self.clients.get(event.clientId));
        }
      } catch { /* Offline: retain the current page and its locally saved progress. */ }
    })());
  });
})();
