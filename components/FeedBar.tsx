"use client";

import { FEED_ACTIONS, type FeedAction } from "@/lib/actions";
import type { Genome } from "@/lib/genome";

/**
 * Minimal floating bar of "care" actions (water, fertilizer, sun, power).
 * Each tap mutates the flower locally and the parent handles sound + chat echo.
 */
export default function FeedBar({
  genome,
  onFeed,
}: {
  genome: Genome;
  onFeed: (action: FeedAction) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur-md">
      {FEED_ACTIONS.map((a) => (
        <button
          key={a.id}
          onClick={() => onFeed(a.id)}
          title={a.label}
          aria-label={a.label}
          className="group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition hover:bg-white/10"
          style={{ color: genome.couleurA }}
        >
          <span className="text-base">{a.emoji}</span>
          <span className="text-xs text-zinc-400 transition group-hover:text-zinc-200">
            {a.label}
          </span>
        </button>
      ))}
    </div>
  );
}
