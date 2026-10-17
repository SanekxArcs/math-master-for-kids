import { useState } from "react";
import { createPortal } from "react-dom";
import { LayoutDashboard, Table2, History, SlidersHorizontal, CircleUserRound } from "lucide-react";
import { Backdrop, GameDialog, primaryActionClass, ghostActionClass } from "@/game/GameDialog";
import { useI18n } from "@/i18n/useI18n";
import { QrCode } from "@/pair/QrCode";

export function needsParentTour(profileId: string): boolean {
  try { return localStorage.getItem("math_master_parent_onboarded:" + profileId) !== "1"; }
  catch { return false; }
}

export function ParentOnboarding({ profileId, pairCode, onDone }: { profileId: string; pairCode: string; onDone: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const slides = [
    { icon: LayoutDashboard, title: t("tabOverview"), body: t("pwOverview") },
    { icon: Table2, title: t("tabTables"), body: t("pwTables") },
    { icon: History, title: t("tabHistory"), body: t("pwHistory") },
    { icon: SlidersHorizontal, title: t("tabSettings"), body: t("pwSettings") },
    { icon: CircleUserRound, title: t("tabAccount"), body: t("pwAccount") },
  ];
  const slide = slides[step]!;
  const Icon = slide.icon;
  const finish = () => {
    try { localStorage.setItem("math_master_parent_onboarded:" + profileId, "1"); } catch { /* private mode */ }
    onDone();
  };
  return createPortal(<Backdrop><GameDialog hero={<Icon className="size-10" aria-hidden />}>
    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{t("parentGuide")} · {step + 1}/{slides.length}</p>
    <h2 className="font-display text-2xl font-black">{slide.title}</h2>
    <p className="my-5 text-sm text-muted-foreground">{slide.body}</p>
    {step === slides.length - 1 && <div className="mb-5 flex items-center gap-3 rounded-xl bg-muted/50 p-3 text-left">
      <QrCode code={pairCode} className="size-24 shrink-0" />
      <div><p className="text-xs font-bold text-muted-foreground">{t("pairingCode")}</p>
        <p className="select-all font-display text-2xl font-black tracking-widest">{pairCode}</p></div>
    </div>}
    <button type="button" autoFocus className={primaryActionClass} onClick={() => step === slides.length - 1 ? finish() : setStep(step + 1)}>
      {t(step === slides.length - 1 ? "gotIt" : "onbNext")}
    </button>
    {step > 0 && <button type="button" className={ghostActionClass} onClick={() => setStep(step - 1)}>{t("onbBack")}</button>}
    <button type="button" className={ghostActionClass} onClick={finish}>{t("onbSkip")}</button>
  </GameDialog></Backdrop>, document.body);
}
