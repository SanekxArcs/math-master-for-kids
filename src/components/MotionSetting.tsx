import { useId } from "react";
import { Check, Gauge } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { setMotionReduced, useReducedMotion } from "@/lib/motionPreference";
import { cn } from "@/lib/utils";

/** Device preference: a slow tablet must not change another device's settings. */
export function MotionSetting({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const hintId = useId();
  return (
    <div className={compact ? "flex shrink-0" : "flex w-full justify-center"}>
      <button
        type="button"
        aria-pressed={reduced}
        aria-label={t("reduceMotion")}
        aria-describedby={hintId}
        title={compact ? t("reduceMotion") : t("reduceMotionHint")}
        onClick={() => setMotionReduced(!reduced)}
        className={cn(
          "inline-flex items-center justify-center rounded-full border-b-4 border-black/15 font-display text-sm font-black shadow-[0_4px_12px_-6px_var(--primary)]",
          compact ? "size-10 shrink-0" : "min-h-11 gap-2 px-4 py-2",
          "focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none active:translate-y-0.5 active:border-b-2",
          reduced
            ? "bg-linear-to-b from-primary to-primary/80 text-primary-foreground"
            : "bg-linear-to-b from-secondary to-accent text-primary",
        )}
      >
        <Gauge className="size-5 shrink-0" aria-hidden="true" />
        {!compact && <span>{t("reduceMotion")}</span>}
        {!compact && <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", reduced ? "bg-white/20" : "border-2 border-primary/30")} aria-hidden="true">
          {reduced && <Check className="size-3.5" strokeWidth={3} />}
        </span>}
      </button>
      <span id={hintId} className="sr-only">{t("reduceMotionHint")}</span>
    </div>
  );
}
