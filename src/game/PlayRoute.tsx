import { Suspense, lazy, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { convex } from "@/lib/convex";
import { isLang } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { useDeviceIdentity, useOutboxSync, useSyncedSettings } from "@/sync/useSync";
import { useFactStats } from "@/sync/useFactStats";
import { BackupSync } from "@/sync/BackupSync";
import { RestoreForm } from "./SetupScreen";
import { parsePairCode } from "@/pair/pairLink";
import { lockParentAccess } from "@/sync/parentAccess";
import { useLocalSettings } from "./useLocalSettings";

const PetsScreen = lazy(() => import("@/pets/PetsScreen").then((module) => ({ default: module.PetsScreen })));
const GameScreen = lazy(() => import("./GameScreen").then((module) => ({ default: module.GameScreen })));

/**
 * Chooses where the game's data comes from.
 *
 * The two branches are separate components rather than one component with a
 * conditional: the synced branch calls Convex hooks, which cannot be called at
 * all when no client is configured.
 */
export type PlayView = "game" | "pets";

/**
 * The pets live under the same roof as the game rather than on a route of
 * its own, so it sits behind the same setup step and the same progress
 * backup: coins spent in the shop are saved exactly like coins won.
 */
export function PlayRoute({ view = "game" }: { view?: PlayView }) {
  useEffect(() => { lockParentAccess(); }, []);
  return <Suspense fallback={<main className="flex min-h-dvh items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" aria-label="Loading" /></main>}>
    {convex ? <SyncedGame view={view} /> : <LocalGame view={view} />}
  </Suspense>;
}

/** No backend configured — the game still plays, it just records nothing. */
function LocalGame({ view }: { view: PlayView }) {
  const [settings] = useLocalSettings();
  const { getStats, recordFacts } = useFactStats();
  if (view === "pets") return <PetsScreen />;
  return <GameScreen settings={settings} onRecord={recordFacts} getStats={getStats} />;
}

function SyncedGame({ view }: { view: PlayView }) {
  const { identity, link, unlink } = useDeviceIdentity();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { settings, locale, unlinked } = useSyncedSettings(identity);
  const { status, record } = useOutboxSync(identity);
  const { getStats, recordFacts } = useFactStats(identity);
  const { setLang } = useI18n();

  // Mastery is updated locally first and synchronously, so the very next
  // question already reflects the answer just given — the outbox catches up
  // with the server in its own time.
  const onRecord = useCallback(
    (records: Parameters<typeof record>[0]) => {
      recordFacts(records);
      void record(records);
    },
    [record, recordFacts],
  );

  /**
   * The profile these credentials belong to is gone — deleted from the
   * dashboard, or a deployment reset. Drop them and start over rather than
   * sitting in an error the user cannot clear without wiping site data.
   */
  useEffect(() => {
    if (unlinked || status.unlinked) void unlink();
  }, [unlinked, status.unlinked, unlink]);

  // The profile's locale is parent-set, so on the child's own device it wins
  // over whatever this browser happened to guess.
  useEffect(() => {
    if (isLang(locale)) setLang(locale);
  }, [locale, setLang]);

  if (identity === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Loading" />
      </main>
    );
  }

  if (identity === null) {
    return (
      <RestoreForm child
        initialCode={parsePairCode(params.get("restore") ?? "")}
        onCancel={() => navigate("/")}
        onRestore={async (pairCode) => {
          await link(pairCode);
          navigate("/play", { replace: true });
        }}
      />
    );
  }

  const screen = view === "pets" ? (
    <PetsScreen />
  ) : (
    <GameScreen
      settings={settings}
      onRecord={onRecord}
      syncStatus={status}
      getStats={getStats}
      pairCode={identity.pairCode}
    />
  );

  return (
    <BackupSync identity={identity}>
      {screen}
    </BackupSync>
  );
}
