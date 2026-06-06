"use client";

import type { ReactNode } from "react";
import type { FeedAction } from "@/lib/actions";

export type WardrobeTab = "hats" | "glasses" | "shoes";
type Kind = FeedAction | "power" | "dance" | "music" | "save" | "hat" | "glasses" | "shoes";

const I = (children: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3a3346" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const ICONS: Partial<Record<Kind, ReactNode>> = {
  eau: I(<><path d="M12 3c3 3.6 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 2-5.4 5-9Z" fill="#9fd3ff" /></>),
  engrais: I(<><path d="M5 9a7 7 0 0 1 14 0Z" fill="#f0c07a" /><path d="M5 12h14" stroke="#7ac04a" strokeWidth="2.4" /><rect x="5" y="14" width="14" height="3.4" rx="1.7" fill="#f0c07a" /></>),
  soleil: I(<><circle cx="12" cy="12" r="4" fill="#ffd24d" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" /></>),
  power: I(<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="#ffd24d" />),
  hat: I(<><rect x="8" y="4" width="8" height="9" rx="1" fill="#3a3346" /><rect x="4" y="13" width="16" height="2.6" rx="1.3" fill="#3a3346" /></>),
  glasses: I(<><circle cx="7" cy="13" r="3.2" fill="#3a3346" /><circle cx="17" cy="13" r="3.2" fill="#3a3346" /><path d="M10.2 13h3.6M3.5 11 6 9M20.5 11 18 9" /></>),
  shoes: I(<><path d="M3 15h7l3 1.5 7 .5a1 1 0 0 1 1 1V19H4a1 1 0 0 1-1-1v-3Z" fill="#bcd1ff" /><path d="M3 15l1-6 3 1 1 3" /></>),
  dance: I(<><circle cx="13" cy="4.5" r="1.8" fill="#3a3346" /><path d="M13 6.5 11 12l3 2-2 7M13 9l4-2M11 12 6 11" /></>),
  music: I(<><circle cx="7" cy="18" r="2.4" fill="#3a3346" /><circle cx="17" cy="16" r="2.4" fill="#3a3346" /><path d="M9.4 18V5l10-2v11" /></>),
  save: I(<><path d="M5 4h11l3 3v13H5Z" fill="#cfe9d4" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>),
};

interface Tile { num: string; label: string; kind: Kind; accent?: boolean; }
const TILES: Tile[] = [
  { num: "01", label: "WATER", kind: "eau" },
  { num: "02", label: "FEED", kind: "engrais" },
  { num: "03", label: "SUN", kind: "soleil" },
  { num: "04", label: "POWER", kind: "power" },
  { num: "05", label: "HAT", kind: "hat" },
  { num: "06", label: "GLASSES", kind: "glasses" },
  { num: "07", label: "SHOES", kind: "shoes" },
  { num: "08", label: "DANCE", kind: "dance" },
  { num: "09", label: "MUSIC", kind: "music" },
  { num: "10", label: "SAVE", kind: "save", accent: true },
];

export default function FeedBar({
  onFeed, onPower, onDance, onMusic, onSave, onWardrobe,
}: {
  onFeed: (a: FeedAction) => void;
  onPower: () => void;
  onDance: () => void;
  onMusic: () => void;
  onSave: () => void;
  onWardrobe: (tab: WardrobeTab) => void;
}) {
  function handle(kind: Kind) {
    switch (kind) {
      case "power": return onPower();
      case "dance": return onDance();
      case "music": return onMusic();
      case "save": return onSave();
      case "hat": return onWardrobe("hats");
      case "glasses": return onWardrobe("glasses");
      case "shoes": return onWardrobe("shoes");
      default: return onFeed(kind);
    }
  }

  return (
    <div className="flex w-full max-w-[96vw] items-end gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:max-w-[94vw] sm:flex-wrap sm:justify-center sm:overflow-visible">
      {TILES.map((t) => (
        <button
          key={t.label}
          onClick={() => handle(t.kind)}
          title={t.label}
          aria-label={t.label}
          className={`relative flex h-[56px] w-[48px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border bg-[#fbf7ec] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            t.accent ? "border-sky-400/70 ring-1 ring-sky-300/60" : "border-black/10"
          }`}
        >
          <span className="absolute left-1 top-0.5 font-mono text-[8px] text-zinc-400">{t.num}</span>
          {ICONS[t.kind]}
          <span className="text-[7px] uppercase tracking-wider text-zinc-500">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
