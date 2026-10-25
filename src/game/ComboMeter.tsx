import { motion } from "@/lib/motion";
import { ArrowRight, Flame, Snowflake } from "lucide-react";
import { comboMultiplier, nextTierAt, penaltyFor, type ScoreState } from "@/engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

/** Point streaks and permanent coin boosts have separate, explicitly labelled homes. */
export function ComboMeter({ score }: { score: ScoreState }) {
  const { t } = useI18n();
  const multiplier = comboMultiplier(score.goodStreak);
  const target = nextTierAt(score.goodStreak);
  const inBadRun = score.badStreak > 0;
  const previousTier = target === 5 ? 0 : target === 15 ? 5 : target === 30 ? 15 : 30;
  const progress = target === null ? 1 : Math.min(1, Math.max(0, (score.goodStreak - previousTier) / (target - previousTier)));
  const hint = inBadRun
    ? t("nextMistake", { points: penaltyFor(score.badStreak + 1) })
    : target === null ? t("comboMaxLabel") : t("comboProgressHint", { count: target - score.goodStreak, multiplier: multiplier + 1 });

  return <div title={hint} className={cn(
    "relative flex h-10 min-w-0 items-center justify-center justify-self-center gap-1.5 rounded-full px-2.5 pb-1 shadow-sm sm:px-3",
    inBadRun ? "bg-streak-bad/10 text-streak-bad" : "bg-muted/70 text-foreground",
  )}>
    {inBadRun ? <Snowflake className="size-4 shrink-0" aria-hidden="true" /> : <Flame className={cn("size-4 shrink-0", multiplier > 1 ? "text-combo" : "text-muted-foreground")} fill={multiplier > 1 ? "currentColor" : "none"} aria-hidden="true" />}
    <motion.span key={inBadRun ? `bad-${score.badStreak}` : multiplier}
      initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 0.18 }}
      className="whitespace-nowrap font-display text-sm font-black tabular-nums">
      {inBadRun ? `−${penaltyFor(score.badStreak + 1)}` : `×${multiplier}`}
    </motion.span>
    {inBadRun ? <span className="sr-only">{t("comboPenaltyLabel")}</span> : <>
      <span className="hidden items-center gap-1 whitespace-nowrap text-[10px] font-bold tabular-nums text-muted-foreground min-[400px]:flex" aria-label={hint}>
        {target === null ? t("comboMaxLabel") : <>{score.goodStreak}/{target}<ArrowRight className="size-2.5" aria-hidden="true" />×{multiplier + 1}</>}
      </span>
      <div className="absolute inset-x-3 bottom-1 h-0.5 overflow-hidden rounded-full bg-border" role="progressbar"
        aria-label={hint} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full origin-left rounded-full bg-combo transition-transform duration-200" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </>}
  </div>;
}
