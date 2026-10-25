import { useSyncExternalStore } from "react";

const KEY = "math_master_reduce_motion";
const CHANGE = "math-master-motion-change";
let volatilePreference: boolean | undefined;
const listeners = new Set<() => void>();
let query: MediaQueryList | undefined;
const getQuery = () => query ??= typeof window === "undefined" ? undefined : window.matchMedia?.("(prefers-reduced-motion: reduce)");

export function isMotionReduced(): boolean {
  if (typeof window === "undefined") return false;
  let saved = false;
  try { saved = localStorage.getItem(KEY) === "true"; } catch { saved = volatilePreference ?? false; }
  return (volatilePreference ?? saved) || Boolean(getQuery()?.matches);
}

function notify() {
  document.documentElement.classList.toggle("reduce-motion", isMotionReduced());
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener(CHANGE, notify);
    window.addEventListener("storage", notify);
    const media = getQuery();
    if (media?.addEventListener) media.addEventListener("change", notify);
    else media?.addListener?.(notify);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener(CHANGE, notify);
      window.removeEventListener("storage", notify);
      const media = getQuery();
      if (media?.removeEventListener) media.removeEventListener("change", notify);
      else media?.removeListener?.(notify);
      query = undefined;
    }
  };
}

export function setMotionReduced(value: boolean) {
  try {
    localStorage.setItem(KEY, String(value));
    volatilePreference = undefined;
  } catch { volatilePreference = value; /* usable without storage */ }
  document.documentElement.classList.toggle("reduce-motion", value || Boolean(getQuery()?.matches));
  window.dispatchEvent(new Event(CHANGE));
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, isMotionReduced, () => false);
}
