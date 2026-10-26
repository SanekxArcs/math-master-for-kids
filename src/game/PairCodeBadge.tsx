import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "@/lib/motion";
import { Check, Copy, KeyRound } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import { QrCode } from "@/pair/QrCode";

/**
 * The pairing code, always reachable from the game.
 *
 * Collapsed to a key icon in the bottom bar so it is not something for a child
 * to fiddle with mid-question. Tapping pops the code up above the bar with a
 * QR code for a parent's phone camera, and tapping again copies it.
 */
export function PairCodeBadge({ pairCode }: { pairCode: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fold away on its own, so it cannot sit over the game indefinitely.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setOpen(false), 12_000);
    return () => window.clearTimeout(id);
  }, [open]);

  const reveal = async () => {
    if (!open) {
      setOpen(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Insecure context or permission denied; the code is on screen anyway.
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={reveal}
        aria-expanded={open}
        aria-label={open ? t("copyCode") : t("pairingCode")}
        className={cn(
          "flex size-10 items-center justify-center rounded-full border-b-4 border-black/15 shadow-[0_4px_12px_-6px_var(--primary)]",
          "transition-[color,background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:translate-y-0.5 active:border-b-2",
          open
            ? "bg-linear-to-b from-primary to-primary/80 text-primary-foreground"
            : "bg-linear-to-b from-secondary to-accent text-primary hover:brightness-110",
        )}
      >
        {copied ? (
          <Check className="size-5 text-correct" aria-hidden />
        ) : open ? (
          <Copy className="size-5" aria-hidden />
        ) : (
          <KeyRound className="size-5" aria-hidden />
        )}
      </button>

      <AnimatePresence>
        {open && (
          // Pops up above the key, anchored to the dock's right edge: the code
          // to read out, and a QR code for a parent's phone camera.
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="absolute bottom-full right-0 mb-4 flex w-44 origin-bottom-right flex-col items-center gap-2 rounded-xl border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur-md"
          >
            <QrCode code={pairCode} className="w-full" />
            <span className="font-display text-lg font-black tracking-[0.2em] text-foreground">{pairCode}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
