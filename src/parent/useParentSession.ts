import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { convex } from "@/lib/convex";
import type { TranslationKey } from "@/i18n/translations";
import { PARENT_LOCK_EVENT, PARENT_SESSION_KEY } from "@/sync/parentAccess";

const KEY = PARENT_SESSION_KEY;

export interface ParentSession {
  token: string;
  profileId: string;
  name: string;
  expiresAt: number;
}

function read(): ParentSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParentSession;
    // Drop an obviously expired session client-side too, so the dashboard shows
    // the login form rather than a flash of errors. The server checks anyway.
    if (typeof parsed?.token !== "string" || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useParentSession() {
  const [session, setSession] = useState<ParentSession | null>(read);
  // A translation key, not a sentence — the caller decides the language.
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);
  const logoutMutation = useMutation(api.parent.logout);

  useEffect(() => {
    const lock = () => setSession(null);
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === sessionStorage && ((event.key === KEY && event.newValue === null) || event.key === null)) lock();
    };
    const check = () => setSession((current) => current && read()?.token !== current.token ? null : current);
    window.addEventListener(PARENT_LOCK_EVENT, lock);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", check);
    window.addEventListener("focus", check);
    return () => {
      window.removeEventListener(PARENT_LOCK_EVENT, lock); window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", check); window.removeEventListener("focus", check);
    };
  }, []);

  useEffect(() => {
    try {
      if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* private mode — the session just will not survive a reload */
    }
  }, [session]);

  // Expire in place, so a dashboard left open overnight returns to the PIN
  // prompt instead of sitting there looking authorised.
  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      setSession(null);
      return;
    }
    const id = window.setTimeout(() => setSession(null), remaining);
    return () => window.clearTimeout(id);
  }, [session]);

  const login = useCallback(async (pairCode: string, pin: string) => {
    if (!convex) {
      setError("pairFailed");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await convex.action(api.secure.parentLogin, { pairCode, pin });
      setSession(result);
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      // The server deliberately returns the same rejection for a wrong code and
      // a wrong PIN; anything else is a transport problem.
      setError(message.includes("ACCOUNT_BLOCKED") ? "accountBlocked" : message.includes("do not match") ? "pairWrong" : "pairFailed");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const current = session;
    setSession(null);
    if (current) {
      try {
        await logoutMutation({ token: current.token });
      } catch {
        // The local session is already gone; a failed server revoke will time
        // out on its own.
      }
    }
  }, [session, logoutMutation]);

  return { session, login, logout, error, busy };
}
