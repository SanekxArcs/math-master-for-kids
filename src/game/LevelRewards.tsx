import { useState } from "react";
import { Dialog } from "radix-ui";
import { ArrowRight, RotateCcw, Star, X } from "lucide-react";
import { DAILY_BONUS, DAILY_STREAK_MAX, MAX_LEVEL, coinMultiplier, coinsForLevel, goalForLevel } from "@/engine";
import { useStable } from "./useStable";
import { DailyStreak } from "./DailyStreak";
import { useI18n } from "@/i18n/useI18n";
import { CoinIcon } from "@/pets/CoinCount";
import { cn } from "@/lib/utils";
import { primaryActionClass, secondaryActionClass } from "./GameDialog";

export function multiplierLabel(levels: number): string {
  return `${coinMultiplier(levels).toLocaleString(undefined, { maximumFractionDigits: 2 })}×`;
}

export function LevelRewards({ open, onOpenChange, level, baseGoal, prestigeLevels, earnedLevels, canPrestige, goalEnabled, onPrestige }: {
  open: boolean; onOpenChange: (open: boolean) => void; level: number; baseGoal: number;
  prestigeLevels: number; earnedLevels: number; canPrestige: boolean; goalEnabled: boolean; onPrestige: () => void;
}) {
  const { t } = useI18n();
  const stable = useStable();
  const [all, setAll] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const reward = (n: number) => coinsForLevel(goalForLevel(baseGoal, n), n, prestigeLevels);
  return <Dialog.Root open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) { setConfirm(false); setAll(false); } }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim" />
      <Dialog.Content className="scroll-area fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl focus:outline-none">
        <Dialog.Close aria-label={t("closeRewards")} className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"><X className="size-5" /></Dialog.Close>
        <Star className="mb-2 size-8 text-primary" fill="currentColor" aria-hidden="true" />
        <Dialog.Title className="pr-8 font-display text-2xl font-black">{t("levelRewardsTitle")}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">{t("coinMultiplier", { multiplier: multiplierLabel(prestigeLevels) })}</Dialog.Description>
        <DailyStreak stable={stable} expanded />
        {goalEnabled ? <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[level, ...(level < MAX_LEVEL ? [level + 1] : [])].map((n) => <div key={n} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="font-display text-sm font-bold">{t(n === level ? "currentLevelReward" : "nextLevelReward", { level: n })}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("nextLevelGoal", { points: goalForLevel(baseGoal, n) })}</p>
              <p className="mt-2 flex items-center gap-1 font-display text-2xl font-black text-primary"><CoinIcon className="size-6" />{reward(n)}</p>
            </div>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("dailyRewardNote", { bonus: DAILY_BONUS * DAILY_STREAK_MAX })}</p>
          <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={cn(secondaryActionClass, "mt-4 py-2 text-sm")}>{t(all ? "hideAllRewards" : "allLevelRewards")}</button>
          {all && <div className="scroll-area mt-3 max-h-60 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-right text-sm"><thead className="sticky top-0 bg-secondary text-secondary-foreground"><tr><th className="p-2 text-left">{t("rewardLevelColumn")}</th><th className="p-2">{t("rewardGoalColumn")}</th><th className="p-2">{t("rewardCoinsColumn")}</th></tr></thead>
              <tbody>{Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((n) => <tr key={n} aria-current={n === level ? "step" : undefined} className={cn("border-t border-border/50", n === level && "bg-primary/10 font-bold text-primary")}><td className="p-2 text-left">{n}</td><td className="p-2 tabular-nums">{goalForLevel(baseGoal, n)}</td><td className="p-2 font-bold tabular-nums">{reward(n)}</td></tr>)}</tbody>
            </table>
          </div>}
          <section className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <h3 className="flex items-center gap-2 font-display font-black"><RotateCcw className="size-4" />{t("prestigeTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("prestigeExplanation", { levels: earnedLevels })}</p>
            <p className="mt-2 flex items-center justify-center gap-2 font-display text-xl font-black text-primary">{multiplierLabel(prestigeLevels)} <ArrowRight className="size-4" /> {multiplierLabel(prestigeLevels + earnedLevels)}</p>
            {!canPrestige && <p className="mt-2 text-xs text-muted-foreground">{t("prestigeLocked")}</p>}
            {confirm ? <>
              <p className="mt-3 text-sm font-bold">{t("prestigeConfirm")}</p>
              <button type="button" onClick={() => { onPrestige(); setConfirm(false); setAll(false); }} className={cn(primaryActionClass, "mt-3 py-2 text-base")}>{t("confirmPrestige")}</button>
              <button type="button" onClick={() => setConfirm(false)} className={cn(secondaryActionClass, "mt-2 py-2 text-sm")}>{t("cancelPrestige")}</button>
            </> : <button type="button" disabled={!canPrestige} onClick={() => setConfirm(true)} className={cn(primaryActionClass, "mt-3 py-2 text-base disabled:cursor-not-allowed disabled:opacity-40")}>{t("prestigeTitle")}</button>}
          </section>
        </> : <p className="mt-4 text-sm text-muted-foreground">{t("rewardsWithoutGoal")}</p>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
