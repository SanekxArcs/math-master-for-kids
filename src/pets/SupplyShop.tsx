import { useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { canUseSupply, type Pet, type ShopItem, type Stable } from "@/engine";
import { useI18n } from "@/i18n/useI18n";
import { CoinIcon } from "./CoinCount";
import { ITEM_NAME } from "./names";

export function SupplyShop({ stable, pet, items, blocked, target, onUse, onBuy }: {
  stable: Stable; pet: Pet; items: ShopItem[]; blocked: boolean;
  target: RefObject<HTMLDivElement | null>; onUse: (item: ShopItem) => void;
  onBuy: (item: ShopItem, quantity: number) => void;
}) {
  return <div className="pet-shop-items">{items.map(item => <SupplyCard key={item.id}
    stable={stable} pet={pet} item={item} blocked={blocked} target={target} onUse={onUse} onBuy={onBuy} />)}</div>;
}

function SupplyCard({ stable, pet, item, blocked, target, onUse, onBuy }: {
  stable: Stable; pet: Pet; item: ShopItem; blocked: boolean;
  target: RefObject<HTMLDivElement | null>; onUse: (item: ShopItem) => void;
  onBuy: (item: ShopItem, quantity: number) => void;
}) {
  const { t } = useI18n();
  const drag = useRef<{ item: ShopItem; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{ emoji: string; x: number; y: number } | null>(null);
  const [quantity, setQuantity] = useState("1");
  const count = stable.inventory?.[item.id] ?? 0;
  const enabled = !blocked && canUseSupply(stable, pet.id, item, Date.now());
  const affordable = Math.floor(stable.coins / item.price);
  const amount = Math.max(1, Math.min(Math.floor(Number(quantity) || 1), Math.max(1, affordable)));
  const name = t(ITEM_NAME[item.id] ?? "itemHay");
  return <article className="pet-shop-card">
    <button type="button" disabled={!enabled} aria-label={t("supplyUse", { item: name, count })}
      title={count > 0 && !enabled && !blocked ? t("itemFull") : name}
      className="pet-shop-use" style={{ touchAction: enabled ? "none" : "auto" }}
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
      <span aria-hidden className="text-3xl">{item.emoji}</span>
      <span className="text-xs font-black">{name}</span>
      <span className="pet-supply-count">{t("supplyStock", { count })}</span>
    </button>
    <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-1.5">
      <label className="text-xs font-bold"><input type="number" min={1} max={Math.max(1, affordable)}
        value={quantity} onChange={e => setQuantity(e.target.value)} onBlur={() => setQuantity(String(amount))}
        aria-label={t("supplyQuantity", { item: name })} className="w-10 rounded-lg border border-border bg-card px-1 py-1 text-center" /></label>
      <button type="button" disabled={affordable < 1} onClick={() => { onBuy(item, amount); setQuantity("1"); }}
        aria-label={t("buyItem", { item: name, price: item.price * amount })}
        className="flex min-h-9 items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-black text-primary-foreground disabled:opacity-50">
        {t("supplyBuy")} <CoinIcon className="size-3.5" />{item.price * amount}
      </button>
    </div>
    {affordable < 1 && <p className="text-center text-[10px] text-muted-foreground">{t("needMore", { coins: item.price - stable.coins })}</p>}
    {ghost && createPortal(<span aria-hidden className="pet-supply-ghost" style={{ left: ghost.x, top: ghost.y }}>{ghost.emoji}</span>, document.body)}
  </article>;
}
