import { useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { canUseSupply, itemsFor, type Pet, type ShopItem, type Stable } from "@/engine";
import { useI18n } from "@/i18n/useI18n";
import { ITEM_NAME } from "./names";

/** Pointer capture supports both touch and mouse; a tap is the keyboard alternative. */
export function SupplyShelf({ stable, pet, blocked, target, onUse }: {
  stable: Stable; pet: Pet; blocked: boolean;
  target: RefObject<HTMLDivElement | null>; onUse: (item: ShopItem) => void;
}) {
  const { t } = useI18n();
  const drag = useRef<{ item: ShopItem; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{ emoji: string; x: number; y: number } | null>(null);
  const groups = [["food", "🧺", "shopFood"], ["care", "🫧", "shopCare"], ["vet", "🩹", "shopVet"], ["play", "🎾", "shopPlay"]] as const;
  return <section className="pet-supply-shelf" aria-label={t("supplyShelf")}>
    <h3 className="font-display text-sm font-black">{t("supplyShelf")}</h3>
    <p className="mb-2 text-xs text-muted-foreground">{t("supplyHint")}</p>
    <div className="pet-supply-groups">
      {groups.map(([kind, emoji, label]) => <div key={kind} className="pet-supply-group">
        <h4 className="text-xs font-bold">{emoji} {t(label)}</h4>
        <div className="flex gap-1.5 overflow-x-auto py-2">
          {itemsFor(pet.species).filter(item => item.kind === kind).map(item => {
            const count = stable.inventory?.[item.id] ?? 0;
            const enabled = !blocked && canUseSupply(stable, pet.id, item, Date.now());
            const name = t(ITEM_NAME[item.id] ?? "itemHay");
            return <button type="button" key={item.id} disabled={!enabled}
              aria-label={t("supplyUse", { item: name, count })} title={name}
              className="pet-supply-item" style={{ touchAction: enabled ? "none" : "auto" }}
              onPointerDown={e => {
                if (e.button !== 0) return;
                suppressClick.current = false;
                drag.current = { item, x: e.clientX, y: e.clientY, moved: false };
                e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
              onPointerMove={e => {
                const active = drag.current;
                if (!active) return;
                if (Math.hypot(e.clientX - active.x, e.clientY - active.y) > 7) active.moved = true;
                if (active.moved) setGhost({ emoji: item.emoji, x: e.clientX, y: e.clientY });
              }}
              onPointerUp={e => {
                const active = drag.current;
                drag.current = null; setGhost(null);
                if (!active?.moved) return;
                suppressClick.current = true;
                const box = target.current?.querySelector("[data-pet-target]")?.getBoundingClientRect();
                if (box && e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom) onUse(active.item);
              }}
              onPointerCancel={() => { drag.current = null; setGhost(null); suppressClick.current = true; }}
              onLostPointerCapture={() => { drag.current = null; setGhost(null); }}
              onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onUse(item); }}>
              <span aria-hidden className="text-2xl">{item.emoji}</span>
              <span className="text-[10px] font-bold">{name}</span>
              <span className="pet-supply-count">×{count}</span>
            </button>;
          })}
        </div>
      </div>)}
    </div>
    {ghost && createPortal(<span aria-hidden className="pet-supply-ghost" style={{ left: ghost.x, top: ghost.y }}>{ghost.emoji}</span>, document.body)}
  </section>;
}
