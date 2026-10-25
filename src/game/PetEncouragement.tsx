import { useEffect, useRef, useState } from "react";
import { motion } from "@/lib/motion";
import { Heart, Lightbulb, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import type { Outcome } from "./useGame";
import { PET_MESSAGES, PetMessageDeck, type MessageKind } from "./petMessages";

export function messageKind(outcome: Pick<Outcome, "isCorrect">, helped: boolean): MessageKind {
  return !outcome.isCorrect ? "bad" : helped ? "help" : "good";
}

/** One small speech bubble, no polling, and one timeout only while it is visible. */
export function PetEncouragement({ outcome, helped, hidden }: {
  outcome: Outcome | null; helped: boolean; hidden: boolean;
}) {
  const { t, lang } = useI18n();
  const deck = useRef<PetMessageDeck | null>(null);
  if (!deck.current) deck.current = new PetMessageDeck();
  // A restored result and Strict Mode must never replay an encouragement.
  const seen = useRef(outcome);
  const serial = useRef(0);
  const [speech, setSpeech] = useState<{ kind: MessageKind; index: number; id: number } | null>(null);

  useEffect(() => {
    if (!outcome || outcome === seen.current) return;
    seen.current = outcome;
    const next = deck.current!.next(messageKind(outcome, helped));
    setSpeech(next && !hidden ? { ...next, id: ++serial.current } : null);
  }, [outcome, helped, hidden]);

  useEffect(() => {
    if (hidden) { setSpeech(null); return; }
    if (!speech) return;
    const id = window.setTimeout(() => setSpeech(null), 6500);
    return () => window.clearTimeout(id);
  }, [speech, hidden]);

  const Icon = speech?.kind === "help" ? Lightbulb : speech?.kind === "bad" ? Heart : Sparkles;
  return <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-4 w-[min(18rem,calc(100vw_-_3rem))] -translate-x-1/2"
    role="status" aria-live="polite" aria-atomic="true" aria-label={t("petEncouragement")}>
      {speech && !hidden && <motion.div key={speech.id}
        initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.16 }}
        className="relative flex items-start gap-2 rounded-2xl border border-primary/25 bg-card px-3 py-2.5 text-left shadow-lg">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="font-display text-sm font-bold leading-snug text-foreground">{PET_MESSAGES[lang][speech.kind][speech.index]}</p>
        <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-primary/25 bg-card" aria-hidden="true" />
      </motion.div>}
  </div>;
}
