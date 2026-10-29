const KEY = "math_master_chunk_recovery";
const RETRY_WINDOW = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .+ failed/i.test(message);
}

interface RecoveryOptions {
  online: boolean; now: number; storage: Pick<Storage, "getItem" | "setItem">;
  refresh: () => Promise<void>; reload: () => void;
}

async function refreshWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  await registration.update();
  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
  if (registration.installing || registration.waiting) await new Promise<void>(resolve => {
    const done = () => { navigator.serviceWorker.removeEventListener("controllerchange", done); window.clearTimeout(timer); resolve(); };
    const timer = window.setTimeout(done, 2000);
    navigator.serviceWorker.addEventListener("controllerchange", done, { once: true });
  });
}

/** Refresh a stale deployment once, preserving all game data and the current route. */
export async function recoverChunkError(error: unknown, options?: RecoveryOptions): Promise<boolean> {
  if (!isChunkLoadError(error)) return false;
  let settings: RecoveryOptions;
  try { settings = options ?? { online: navigator.onLine, now: Date.now(), storage: sessionStorage,
    refresh: refreshWorker, reload: () => {
      const url = new URL(window.location.href);
      url.searchParams.set("__app_update", String(Date.now()));
      window.location.replace(url.href);
    } }; } catch { return false; }
  if (!settings.online) return false;
  try {
    const last = Number(settings.storage.getItem(KEY));
    if (last > 0 && settings.now - last < RETRY_WINDOW) return false;
    settings.storage.setItem(KEY, String(settings.now));
  } catch { return false; } // Without a retry marker, automatic reloads could loop.
  try { await settings.refresh(); } catch { /* A fresh navigation may still work. */ }
  settings.reload();
  return true;
}
