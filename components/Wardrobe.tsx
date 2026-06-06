"use client";

import { useState } from "react";
import type { Genome } from "@/lib/genome";
import {
  HAT_LIST, GLASSES_LIST, SHOES_LIST,
  HAT_LABELS, GLASSES_LABELS, SHOES_LABELS,
} from "@/lib/cosmetics";

type Tab = "hats" | "glasses" | "shoes";

export default function Wardrobe({
  genome,
  onChange,
  onClose,
}: {
  genome: Genome;
  onChange: (patch: Partial<Genome>) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("hats");

  const groups: Record<Tab, { list: readonly string[]; labels: Record<string, string>; current: string; field: keyof Genome }> = {
    hats: { list: HAT_LIST, labels: HAT_LABELS, current: genome.chapeau ?? "none", field: "chapeau" },
    glasses: { list: GLASSES_LIST, labels: GLASSES_LABELS, current: genome.lunettes ?? "none", field: "lunettes" },
    shoes: { list: SHOES_LIST, labels: SHOES_LABELS, current: genome.chaussures ?? "sneaker", field: "chaussures" },
  };
  const grp = groups[tab];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm sm:items-center">
      <div className="glass w-full max-w-md rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base tracking-wide text-zinc-800">Wardrobe</h2>
          <button onClick={onClose} aria-label="Close" className="pill rounded-full px-3 py-1 text-xs">
            Done
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-full bg-white/60 p-1">
          {(["hats", "glasses", "shoes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm capitalize transition ${tab === t ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {grp.list.map((value) => {
            const active = grp.current === value;
            return (
              <button
                key={value}
                onClick={() => onChange({ [grp.field]: value } as Partial<Genome>)}
                className={`rounded-xl border px-2 py-3 text-xs font-medium transition ${
                  active
                    ? "border-transparent text-white"
                    : "border-black/10 bg-white/70 text-zinc-600 hover:bg-white"
                }`}
                style={active ? { background: genome.couleurA } : undefined}
              >
                {grp.labels[value]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
