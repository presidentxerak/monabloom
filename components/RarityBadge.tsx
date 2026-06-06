"use client";

import type { Rarity } from "@/lib/rarity";

/** Small coloured pill showing a flower's rarity tier. */
export default function RarityBadge({
  rarity,
  small = false,
}: {
  rarity: Rarity;
  small?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-xs"}`}
      style={{
        color: rarity.color,
        borderColor: `${rarity.color}66`,
        background: `${rarity.color}1a`,
        textShadow: `0 0 6px ${rarity.color}66`,
      }}
      title={`Rareté : ${rarity.tier} (${rarity.score}/100)`}
    >
      ✦ {rarity.tier}
    </span>
  );
}
