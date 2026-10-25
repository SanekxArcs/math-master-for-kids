import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TimerBarProps {
  /** Epoch ms the question was asked. */
  askedAt: number;
  seconds: number;
  running: boolean;
  className?: string;
}

/**
 * Ten updates per second, using the real deadline so a busy tablet cannot
 * make the countdown drift. Transform avoids laying out the bar each tick.
 *
 * Calm, then warm, then urgent: the colour tells the child how much time is
 * left without them having to judge a bar's length mid-sum.
 */
export function TimerBar({ askedAt, seconds, running, className }: TimerBarProps) {
  const [fraction, setFraction] = useState(1);

  useEffect(() => {
    if (!running) return;

    const total = seconds * 1000;
    const tick = () => {
      const remaining = Math.max(0, askedAt + total - Date.now());
      setFraction(total > 0 ? Math.min(1, remaining / total) : 0);
      if (remaining <= 0) window.clearInterval(timer);
    };
    const timer = window.setInterval(tick, 100);
    tick();

    return () => window.clearInterval(timer);
  }, [askedAt, seconds, running]);

  const urgent = fraction < 0.25;
  const warm = fraction < 0.5;

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden bg-muted", className)}
      role="timer"
      aria-label="Time remaining"
    >
      <div
        className={cn(
          "h-full rounded-r-full transition-colors duration-500",
          urgent ? "bg-wrong animate-pulse" : warm ? "bg-combo" : "bg-primary",
        )}
        style={{ transform: `scaleX(${Math.max(0, fraction)})`, transformOrigin: "left" }}
      />
    </div>
  );
}
