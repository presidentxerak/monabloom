"use client";

import type { FeedAction } from "@/lib/actions";

type Kind = FeedAction | "power" | "dance" | "dress" | "music" | "save";

interface Tile {
  num: string;
  symbol: string;
  label: string;
  kind: Kind;
  accent?: boolean;
}

const TILES: Tile[] = [
  { num: "01", symbol: "Aq", label: "WATER", kind: "eau" },
  { num: "02", symbol: "Fe", label: "FEED", kind: "engrais" },
  { num: "03", symbol: "So", label: "SUN", kind: "soleil" },
  { num: "04", symbol: "Pw", label: "POWER", kind: "power" },
  { num: "05", symbol: "Dn", label: "DANCE", kind: "dance" },
  { num: "06", symbol: "Dr", label: "DRESS", kind: "dress" },
  { num: "07", symbol: "Mu", label: "MUSIC", kind: "music" },
  { num: "08", symbol: "Sv", label: "SAVE", kind: "save", accent: true },
];

export default function FeedBar({
  onFeed,
  onPower,
  onDance,
  onDress,
  onMusic,
  onSave,
}: {
  onFeed: (action: FeedAction) => void;
  onPower: () => void;
  onDance: () => void;
  onDress: () => void;
  onMusic: () => void;
  onSave: () => void;
}) {
  function handle(kind: Kind) {
    switch (kind) {
      case "power": return onPower();
      case "dance": return onDance();
      case "dress": return onDress();
      case "music": return onMusic();
      case "save": return onSave();
      default: return onFeed(kind);
    }
  }

  return (
    <div className="flex max-w-[92vw] flex-wrap items-end justify-center gap-1.5">
      {TILES.map((t) => (
        <button
          key={t.symbol}
          onClick={() => handle(t.kind)}
          title={t.label}
          aria-label={t.label}
          className={`relative flex h-[56px] w-[50px] flex-col items-center justify-center rounded-lg border bg-[#fbf7ec] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            t.accent ? "border-sky-400/70 ring-1 ring-sky-300/60" : "border-black/10"
          }`}
        >
          <span className="absolute left-1 top-0.5 font-mono text-[8px] text-zinc-400">{t.num}</span>
          <span className="font-display text-[16px] leading-none text-zinc-800">{t.symbol}</span>
          <span className="mt-1 text-[7.5px] uppercase tracking-wider text-zinc-500">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
