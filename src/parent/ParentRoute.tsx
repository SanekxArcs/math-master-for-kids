import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryActionClass, secondaryActionClass, ghostActionClass } from "@/game/GameDialog";
import { WelcomeShell, WelcomeCard } from "@/game/WelcomeShell";
import { SetupScreen, LanguagePicker } from "@/game/SetupScreen";
import { convex } from "@/lib/convex";
import { useI18n } from "@/i18n/useI18n";
import { useDeviceIdentity } from "@/sync/useSync";
import { Dashboard } from "./Dashboard";
import { PairScreen } from "./PairScreen";
import { useParentSession } from "./useParentSession";

export function ParentRoute() {
  // The Convex hooks below cannot be called without a client, so bail before
  // reaching them rather than conditionally calling hooks.
  if (!convex) return <NoBackend />;
  return <ParentApp />;
}

function ParentApp() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"choose" | "login" | "create">(params.has("code") ? "login" : params.has("new") ? "create" : "choose");
  const { session, login, logout, error, busy } = useParentSession();
  const { identity, claim } = useDeviceIdentity();

  if (!session) {
    if (mode === "choose") return <WelcomeShell top={<LanguagePicker />}>
      <WelcomeCard hero={<UsersRound className="size-10 text-primary" />} className="space-y-4 text-center">
        <h1 className="font-display text-3xl font-black">{t("parentWelcome")}</h1>
        <p className="text-sm text-muted-foreground">{t("parentChooseAccount")}</p>
        <button type="button" className={primaryActionClass} onClick={() => setMode("login")}>{t("parentExisting")}</button>
        <button type="button" className={secondaryActionClass} onClick={() => setMode("create")}>{t("createChildProfile")}</button>
        <Link to="/" className={ghostActionClass}>{t("chooseRoleAgain")}</Link>
      </WelcomeCard>
    </WelcomeShell>;
    if (mode === "create") return <SetupScreen parentSetup onBack={() => setMode("choose")}
      onCreate={async (name, pin, locale, avatar) => {
        const next = await claim(name, pin, locale, avatar);
        // Creation succeeded even if sign-in then loses the connection. Retry
        // login for the existing profile instead of creating another account.
        if (!(await login(next.pairCode, pin))) setMode("login");
      }} />;
    return (
      <PairScreen
        onSubmit={login}
        error={error}
        busy={busy}
        // On the child's own tablet the code is already known, so the parent
        // only has to prove they are the parent.
        knownCode={identity?.pairCode ?? null}
        onBack={() => setMode("choose")}
      />
    );
  }
  return <Dashboard key={session.profileId} session={session} device={identity ?? null} onLogout={() => void logout()} />;
}

function NoBackend() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-black">{t("noBackendTitle")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("noBackendBlurb")} <code className="font-mono">VITE_CONVEX_URL</code>
      </p>
      <Link
        to="/"
        className={cn(primaryActionClass, "w-auto px-6 py-3 text-lg")}
      >
        {t("backToGame")}
      </Link>
    </main>
  );
}
