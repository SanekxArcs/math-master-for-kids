import { isMotionReduced } from "@/lib/motionPreference";

let drawable: boolean | null = null;
function canDraw(): boolean {
  if (drawable !== null) return drawable;
  try {
    drawable = typeof document !== "undefined" && document.createElement("canvas").getContext("2d") !== null;
  } catch { drawable = false; }
  return drawable;
}

const COLORS = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"];
const loadConfetti = () => import("canvas-confetti");
let loaded: ReturnType<typeof loadConfetti> | undefined;

function burst(win: boolean) {
  if (isMotionReduced() || document.hidden || !canDraw()) return;
  // Download and initialise the canvas only when a celebration is earned.
  loaded ??= loadConfetti().then((module) => {
    const stop = () => { if (isMotionReduced() || document.hidden) module.default.reset(); };
    window.addEventListener("math-master-motion-change", stop);
    document.addEventListener("visibilitychange", stop);
    return module;
  });
  void loaded.then(({ default: confetti }) => {
    if (isMotionReduced() || document.hidden) return;
    // A fixed budget rather than spawning new particles on every screen frame.
    void confetti({
      particleCount: win ? 90 : 24,
      spread: win ? 100 : 60,
      startVelocity: win ? 36 : 28,
      ticks: 140,
      origin: { y: win ? 0.65 : 0.4 },
      colors: COLORS,
      disableForReducedMotion: true,
    });
  }).catch(() => { loaded = undefined; /* Offline: the reward still works. */ });
}

export function celebrateCombo() { burst(false); }
export function celebrateWin() { burst(true); }
