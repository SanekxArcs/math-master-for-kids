import { Component, Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, CloudDownload } from "lucide-react";
import { createPortal } from "react-dom";
import { Backdrop, GameDialog, primaryActionClass, secondaryActionClass } from "@/game/GameDialog";
import { useI18n } from "@/i18n/useI18n";
import { readStable } from "@/game/useStable";
import { currentLevel } from "@/game/useLocalLevel";
import type { DeviceIdentity } from "./db";
import { useProgressSync } from "./useProgressSync";
import { BackupControl } from "./BackupButton";

/** Long enough not to hammer a server that is down, short enough to catch a deploy. */
const RETRY_MS = 60_000;

/**
 * The progress backup, fenced off from the game.
 *
 * A Convex query that fails throws during render, and unfenced that takes
 * down the whole app — which is exactly what a backend a step behind the
 * client did: the child lost their game to a backup they cannot see. The
 * copy on the device is what the game plays with, so a failing backup is
 * worth a console line and a retry, never a crash screen.
 */
class QuietBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  private timer: number | undefined;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[math-master] progress backup paused, retrying in a minute", error);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.setState({ failed: false }), RETRY_MS);
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type BackupState = Pick<ReturnType<typeof useProgressSync>, "ready" | "restoredVersion" | "pending" | "failed" | "saving" | "saveNow"> & { blocked: boolean };

function Sync({ identity, onChange }: { identity: DeviceIdentity; onChange: (state: BackupState) => void }) {
  const state = useProgressSync(identity);
  const { t } = useI18n();
  const { ready, restoredVersion, pending, failed, saving, saveNow } = state;
  useEffect(() => {
    onChange({ ready, restoredVersion, pending, failed, saving, saveNow, blocked: !!state.conflict });
  }, [ready, restoredVersion, pending, failed, saving, saveNow, state.conflict, onChange]);
  return state.conflict ? createPortal(<Backdrop><GameDialog hero={<CloudDownload className="size-10" />}>
    <h2 className="font-display text-2xl font-black">{t("saveConflictTitle")}</h2>
    <p className="my-4 text-sm text-muted-foreground">{t("saveConflictBody")}</p>
    {state.conflict.progress && <button type="button" onClick={state.chooseCloud} className={primaryActionClass}>
      {t("useCloudSave", { level: state.conflict.progress.level, coins: state.conflict.progress.coins })}
    </button>}
    <button type="button" onClick={state.chooseDevice} className={secondaryActionClass}>
      {t("useDeviceSave", { level: currentLevel(), coins: readStable().coins })}
    </button>
    {failed && <p role="alert" className="mt-3 text-sm text-wrong">{t("backupFailed")}</p>}
  </GameDialog></Backdrop>, document.body) : null;
}

export function BackupSync({ identity, children }: { identity: DeviceIdentity; children?: ReactNode }) {
  return <BackupForProfile key={identity.profileId} identity={identity}>{children}</BackupForProfile>;
}

function BackupForProfile({ identity, children }: { identity: DeviceIdentity; children?: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<BackupState>({ ready: false, restoredVersion: 0, pending: true, failed: false, blocked: false, saving: false, saveNow: null });
  const [retryVersion, setRetryVersion] = useState(0);
  const onChange = useCallback((next: BackupState) => {
    setState((current) => ({ ...next, ready: current.ready || next.ready,
      restoredVersion: next.restoredVersion || current.restoredVersion }));
  }, []);
  const { ready, restoredVersion, pending, failed } = state;
  const retryNow = () => {
    if (state.saveNow) { void state.saveNow(); return; }
    // Retry only the backup boundary. The game and its current answer stay mounted.
    setRetryVersion((version) => version + 1);
  };
  return <BackupControl.Provider value={{ save: retryNow, saving: state.saving, failed, pending }}>
    <QuietBoundary key={retryVersion} fallback={<BackupUnavailable onChange={onChange} />}>
      <Sync identity={identity} onChange={onChange} />
    </QuietBoundary>
    {ready && !state.blocked ? <>
    <span role="status" className="fixed left-1/2 top-1 z-50 -translate-x-1/2 rounded-full bg-background/95 px-3 py-1 text-[10px] font-bold text-muted-foreground shadow-sm">
      {t(state.saving ? "backupSaving" : failed ? "backupFailed" : pending ? "backupPending" : "backupSaved")}
    </span>
    <Fragment key={restoredVersion}>{children}</Fragment>
  </> : (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <p role="status">{t("backupRestoring")}</p>
      </div>
    </main>
  )}
  </BackupControl.Provider>;
}

function BackupUnavailable({ onChange }: { onChange: (state: BackupState) => void }) {
  const { t } = useI18n();
  useEffect(() => {
    onChange({ ready: readStable().savedAt > 0, restoredVersion: 0, pending: true, failed: true, blocked: false, saving: false, saveNow: null });
  }, [onChange]);
  return <p role="alert" className="bg-muted p-3 text-center text-sm">{t("backupFailed")}</p>;
}
