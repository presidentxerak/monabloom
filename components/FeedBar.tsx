"use client";

import type { FeedAction } from "@/lib/actions";

interface Tile {
  num: string;
  symbol: string;
  label: string;
  action: FeedAction | "save";
}

const TILES: Tile[] = [
  { num: "01", symbol: "Aq", label: "WATER", action: "eau" },
  { num: "02", symbol: "Fe", label: "FEED", action: "engrais" },
  { num: "03", symbol: "So", label: "SUN", action: "soleil" },
  { num: "04", symbol: "Pw", label: "POWER", action: "pouvoir" },
  { num: "05", symbol: "Sv", label: "SAVE", action: "save" },
];

/** Periodic-table-style action tiles (Genscii look): number, symbol, label. */
export default function FeedBar({
  onFeed,
  onSave,
}: {
  onFeed: (action: FeedAction) => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-end gap-1.5">
      {TILES.map((t) => {
        const isSave = t.action === "save";
        return (
          <button
            key={t.symbol}
            onClick={() => (isSave ? onSave() : onFeed(t.action as FeedAction))}
            title={t.label}
            aria-label={t.label}
            className={`group relative flex h-[58px] w-[52px] flex-col items-center justify-center rounded-lg border bg-[#fbf7ec] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              isSave ? "border-sky-400/70 ring-1 ring-sky-300/60" : "border-black/10"
            }`}
          >
            <span className="absolute left-1 top-0.5 font-mono text-[8px] text-zinc-400">
              {t.num}
            </span>
            <span className="font-display text-[17px] leading-none text-zinc-800">
              {t.symbol}
            </span>
            <span className="mt-1 text-[8px] uppercase tracking-wider text-zinc-500">
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
