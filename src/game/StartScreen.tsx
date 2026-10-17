import { Gamepad2, UsersRound } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { WelcomeShell, WelcomeCard } from "./WelcomeShell";
import { LanguagePicker } from "./SetupScreen";
import { useI18n } from "@/i18n/useI18n";

export function StartScreen() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const restore = params.get("restore");
  // Preserve previously shared QR/deep links.
  if (restore) return <Navigate to={"/play?restore=" + encodeURIComponent(restore)} replace />;
  return <WelcomeShell top={<LanguagePicker />}>
    <WelcomeCard hero={<img src="/favicon.svg" alt="" className="size-14" />} className="space-y-6 text-center">
      <div><h1 className="font-display text-3xl font-black">{t("whoIsHere")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("chooseYourPath")}</p></div>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/play" className="answer-tile flex min-h-40 flex-col items-center justify-center gap-3 bg-primary/10 p-4">
          <Gamepad2 className="size-12 text-primary" aria-hidden /><span className="font-display text-2xl font-black">{t("roleChild")}</span>
        </Link>
        <Link to="/parent" className="answer-tile flex min-h-40 flex-col items-center justify-center gap-3 bg-secondary p-4">
          <UsersRound className="size-12 text-primary" aria-hidden /><span className="font-display text-2xl font-black">{t("roleParent")}</span>
        </Link>
      </div>
    </WelcomeCard>
  </WelcomeShell>;
}
