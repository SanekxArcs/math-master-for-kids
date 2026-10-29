import { useEffect, useState } from "react";
import { DAILY_BONUS, DAILY_STREAK_MAX, dailyStreakStatus, type Stable } from "@/engine";
import { useI18n } from "@/i18n/useI18n";

export function DailyStreak({ stable, expanded = false, onClick }: { stable: Stable; expanded?: boolean; onClick?: () => void }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now);
  const [details, setDetails] = useState(false);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const daily = dailyStreakStatus(stable, now);
  const title = t("dailyStreakTitle", { days: daily.days });
  const note = daily.claimed ? t("dailyStreakClaimed", { coins: daily.bonus }) : t("dailyStreakAvailable", { coins: daily.bonus });
  if (!expanded && !details) return <button type="button" onClick={onClick ?? (() => setDetails(true))} aria-label={`${title}. ${note}`}
    className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border border-combo/25 bg-combo/10 px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">
    <span>🔥 {title}</span><span className="text-combo-foreground dark:text-combo">{note}</span>
  </button>;
  return <section aria-label={title} className="mt-4 rounded-xl border border-combo/30 bg-combo/10 p-3">
    <div className="flex justify-between gap-2"><h3 className="font-display font-black">🔥 {title}</h3>
    {!expanded && <button type="button" onClick={() => setDetails(false)} aria-label={t("careClose")} className="px-2 font-black">×</button>}</div>
    <p className="mt-1 text-sm font-bold">{note}</p>
    <ol className="my-3 grid grid-cols-7 gap-1">
      {Array.from({ length: DAILY_STREAK_MAX }, (_, i) => i + 1).map(day => <li key={day}
        aria-current={day === daily.rewardDay ? "step" : undefined}
        className={`rounded-lg py-2 text-center text-xs ${day <= daily.days ? "bg-primary text-primary-foreground" : "bg-card"}`}>
        <span className="block font-bold">{t("dailyStreakDay", { day })}</span><strong>+{day * DAILY_BONUS}</strong>
      </li>)}
    </ol>
    <p className="text-xs text-muted-foreground">{t("dailyStreakRules")}</p>
  </section>;
}
